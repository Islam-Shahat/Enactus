// supabase/functions/submit-application/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse, getClientIp, sanitizeText } from '../_shared/http.ts';
import { verifyTurnstile } from '../_shared/turnstile.ts';
import { hashIp, checkRateLimit } from '../_shared/ratelimit.ts';
import { validatePdfUpload } from '../_shared/magic.ts';
import { submitApplicationSchema } from '../_shared/schemas.ts';

Deno.serve(async (req: Request) => {
  // 1. CORS Preflight & Origin validation
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const originError = checkOrigin(req);
  if (originError) return originError;

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    const rawBody = await req.json();

    // Honeypot check (bot trap)
    if (rawBody.honeypot) {
      return json(req, { ok: true, message: 'Application submitted successfully' });
    }

    // 2. Validate payload with Zod
    const parsed = submitApplicationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse(req, parsed.error.issues[0]?.message || 'Invalid form input', 400, 'VALIDATION_ERROR');
    }
    const input = parsed.data;

    // 3. Resolve Client IP and Hash
    const clientIp = getClientIp(req);
    const ipHash = await hashIp(clientIp);

    // 4. Verify Turnstile Captcha
    const turnstileResult = await verifyTurnstile(input.turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return errorResponse(req, turnstileResult.error || 'CAPTCHA verification failed', 400, 'CAPTCHA_FAILED');
    }

    // 5. Initialize Supabase Admin Client (Service Role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[submit-application] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return errorResponse(req, 'Backend server configuration error', 500);
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 6. Rate Limit Check (Max 3 per ip_hash per 24 hours)
    const rateCheck = await checkRateLimit(supabase, 'applications', ipHash, 3, 24);
    if (!rateCheck.allowed) {
      return errorResponse(req, 'Rate limit exceeded. Maximum 3 applications per day.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // 7. Check settings.applications_open
    const { data: appOpenSetting, error: settingErr } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'applications_open')
      .maybeSingle();

    if (settingErr) {
      console.error('[submit-application] Error reading applications_open setting:', settingErr);
    }

    const isApplicationsOpen =
      appOpenSetting?.value === true ||
      appOpenSetting?.value === 'true' ||
      appOpenSetting?.value?.toString().toLowerCase() === 'true';

    if (!isApplicationsOpen) {
      return errorResponse(req, 'Applications are currently closed for this season.', 400, 'APPLICATIONS_CLOSED');
    }

    // 8. Resolve active season on server
    const { data: activeSeason, error: seasonErr } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('is_active', true)
      .maybeSingle();

    if (seasonErr || !activeSeason) {
      console.error('[submit-application] No active season found:', seasonErr);
      return errorResponse(req, 'No active season found for applications.', 400, 'NO_ACTIVE_SEASON');
    }
    const seasonId = activeSeason.id;

    // 9. Dedupe by season + lower(email)
    const normalizedEmail = input.email.toLowerCase().trim();
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id, status, created_at')
      .eq('season_id', seasonId)
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingApp) {
      return json(req, {
        ok: true,
        alreadyApplied: true,
        message: 'لقد تم تسجيل طلب انضمام بهذا البريد الإلكتروني بالفعل لهذا الموسم.',
      });
    }

    // 10. Resolve committee slugs / names to IDs
    let firstChoiceId: string | null = null;
    let secondChoiceId: string | null = null;

    if (input.committeeSlug) {
      const { data: comm1 } = await supabase
        .from('committees')
        .select('id')
        .or(`slug.eq."${input.committeeSlug}",name_ar.ilike."%${input.committeeSlug}%",name_en.ilike."%${input.committeeSlug}%"`)
        .maybeSingle();
      if (comm1) firstChoiceId = comm1.id;
    }

    if (input.secondChoiceSlug) {
      const { data: comm2 } = await supabase
        .from('committees')
        .select('id')
        .or(`slug.eq."${input.secondChoiceSlug}",name_ar.ilike."%${input.secondChoiceSlug}%",name_en.ilike."%${input.secondChoiceSlug}%"`)
        .maybeSingle();
      if (comm2) secondChoiceId = comm2.id;
    }

    const applicationId = crypto.randomUUID();
    let cvUrl: string | null = null;

    // 11. Handle optional CV upload (PDF <= 5 MB, check mime AND magic bytes)
    if (input.cvBase64) {
      try {
        const binaryStr = atob(input.cvBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const pdfCheck = validatePdfUpload({
          size: bytes.length,
          type: 'application/pdf',
          bytes,
        });

        if (!pdfCheck.valid) {
          return errorResponse(req, pdfCheck.error || 'Invalid CV file', 400, 'INVALID_CV');
        }

        const cvPath = `${applicationId}/cv.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from('cvs')
          .upload(cvPath, bytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadErr) {
          console.error('[submit-application] CV upload failed:', uploadErr);
          return errorResponse(req, 'Failed to upload CV document', 500, 'CV_UPLOAD_ERROR');
        }
        cvUrl = cvPath;
      } catch (cvErr) {
        console.error('[submit-application] CV parsing error:', cvErr);
        return errorResponse(req, 'Invalid CV format or base64 encoding', 400, 'INVALID_CV');
      }
    }

    // 12. Insert application into public.applications
    const { error: insertErr } = await supabase.from('applications').insert({
      id: applicationId,
      season_id: seasonId,
      full_name: sanitizeText(input.fullName),
      email: normalizedEmail,
      phone: input.phone ? sanitizeText(input.phone) : null,
      faculty: input.faculty ? sanitizeText(input.faculty) : null,
      study_year: input.studyYear || null,
      university_id: input.universityId ? sanitizeText(input.universityId) : null,
      first_choice_id: firstChoiceId,
      second_choice_id: secondChoiceId,
      motivation: input.motivation ? sanitizeText(input.motivation) : null,
      answers: input.answers || {},
      cv_url: cvUrl,
      status: 'new', // server-enforced
      ip_hash: ipHash,
    });

    if (insertErr) {
      console.error('[submit-application] insert error:', insertErr);
      return errorResponse(req, 'Failed to save application. Please try again.', 500);
    }

    return json(req, {
      ok: true,
      id: applicationId,
      message: 'Application submitted successfully',
    });
  } catch (err) {
    console.error('[submit-application] Unhandled error:', err);
    return errorResponse(req, 'Internal server error', 500);
  }
});

