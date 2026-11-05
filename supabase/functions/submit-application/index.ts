// supabase/functions/submit-application/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse, getClientIp, sanitizeText } from '../_shared/http.ts';
import { verifyTurnstile } from '../_shared/turnstile.ts';
import { hashIp, checkRateLimit } from '../_shared/ratelimit.ts';
import { validatePdfUpload } from '../_shared/magic.ts';
import { resolveCommittee } from '../_shared/committees.ts';
import { submitApplicationSchema } from '../_shared/schemas.ts';

export function buildApplicationRow({
  applicationId,
  seasonId,
  input,
  normalizedEmail,
  firstChoiceId = null,
  secondChoiceId = null,
  cvUrl = null,
  ipHash = null,
}: {
  applicationId: string;
  seasonId: string;
  input: {
    fullName: string;
    phone: string;
    universityId?: string | null;
    faculty?: string | null;
    studyYear?: number | string | null;
    motivation?: string | null;
    answers?: Record<string, unknown> | null;
  };
  normalizedEmail: string;
  firstChoiceId?: string | null;
  secondChoiceId?: string | null;
  cvUrl?: string | null;
  ipHash?: string | null;
}) {
  let studyYear: number | null = null;
  if (typeof input.studyYear === 'number' && Number.isFinite(input.studyYear)) {
    studyYear = Math.max(1, Math.min(8, Math.floor(input.studyYear)));
  } else if (typeof input.studyYear === 'string') {
    const match = input.studyYear.match(/\d+/);
    if (match) {
      studyYear = Math.max(1, Math.min(8, parseInt(match[0], 10)));
    } else if (input.studyYear.includes('أولى') || input.studyYear.includes('first') || input.studyYear.includes('1st')) {
      studyYear = 1;
    } else if (input.studyYear.includes('ثانية') || input.studyYear.includes('second') || input.studyYear.includes('2nd')) {
      studyYear = 2;
    } else if (input.studyYear.includes('ثالثة') || input.studyYear.includes('third') || input.studyYear.includes('3rd')) {
      studyYear = 3;
    } else if (input.studyYear.includes('رابعة') || input.studyYear.includes('fourth') || input.studyYear.includes('4th')) {
      studyYear = 4;
    } else if (input.studyYear.includes('خامسة') || input.studyYear.includes('fifth') || input.studyYear.includes('5th')) {
      studyYear = 5;
    }
  }

  return {
    id: applicationId,
    season_id: seasonId,
    full_name: sanitizeText(input.fullName),
    email: normalizedEmail,
    phone: input.phone ? sanitizeText(input.phone) : null,
    university_id: input.universityId ? sanitizeText(input.universityId) : null,
    faculty: input.faculty ? sanitizeText(input.faculty) : null,
    study_year: studyYear,
    first_choice_id: firstChoiceId,
    second_choice_id: secondChoiceId,
    motivation: input.motivation ? sanitizeText(input.motivation) : null,
    answers: input.answers || {},
    cv_url: cvUrl,
    status: 'new',
    interview_score: null,
    notes: null,
    reviewed_by: null,
    ip_hash: ipHash,
  };
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(async (req: Request) => {
  // 1. CORS Preflight & Origin validation
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const originError = checkOrigin(req);
  if (originError) return originError;

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  // 8 MB content-length cap before reading/decoding
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 8 * 1024 * 1024) {
    return errorResponse(req, 'Payload exceeds maximum limit (8MB)', 413, 'PAYLOAD_TOO_LARGE');
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

    // 7.5M base64 chars cap (approx 5MB binary)
    if (input.cvBase64 && input.cvBase64.length > 7_500_000) {
      return errorResponse(req, 'CV file exceeds size limit (max 5MB)', 400, 'FILE_TOO_LARGE');
    }

    // 20 KB answers cap
    if (input.answers) {
      const answersStr = JSON.stringify(input.answers);
      if (new TextEncoder().encode(answersStr).length > 20 * 1024) {
        return errorResponse(req, 'Answers payload exceeds size limit (max 20KB)', 400, 'ANSWERS_TOO_LARGE');
      }
    }

    // 3. Resolve Client IP and Hash
    const clientIp = getClientIp(req);
    const ipHash = await hashIp(clientIp);

    // 4. Verify Turnstile Captcha (fail-closed)
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
      rateCheck.release?.();
      return errorResponse(req, 'Applications are currently closed for this season.', 400, 'APPLICATIONS_CLOSED');
    }

    // 8. Resolve active season on server
    const { data: activeSeason, error: seasonErr } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('is_active', true)
      .maybeSingle();

    if (seasonErr || !activeSeason) {
      rateCheck.release?.();
      console.error('[submit-application] No active season found:', seasonErr);
      return errorResponse(req, 'No active season found for applications.', 400, 'NO_ACTIVE_SEASON');
    }
    const seasonId = activeSeason.id;

    // 9. Dedupe by season + exact lower(email) without wildcard operators
    const normalizedEmail = input.email.toLowerCase().trim();
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id, status, created_at')
      .eq('season_id', seasonId)
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingApp) {
      rateCheck.release?.();
      return json(req, {
        ok: true,
        alreadyApplied: true,
        message: 'لقد تم تسجيل طلب انضمام بهذا البريد الإلكتروني بالفعل لهذا الموسم.',
      });
    }

    // 10. Resolve committee slugs / names in code via committees helper
    let firstChoiceId: string | null = null;
    let secondChoiceId: string | null = null;

    const firstSlug = input.firstChoiceSlug || input.committeeSlug;
    if (firstSlug || input.secondChoiceSlug) {
      const { data: allCommittees } = await supabase
        .from('committees')
        .select('id, slug, name_ar, name_en');

      if (allCommittees?.length) {
        if (firstSlug) {
          const matched1 = resolveCommittee(firstSlug, allCommittees);
          if (matched1) firstChoiceId = matched1.id;
        }
        if (input.secondChoiceSlug) {
          const matched2 = resolveCommittee(input.secondChoiceSlug, allCommittees);
          if (matched2) secondChoiceId = matched2.id;
        }
      }
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
          return errorResponse(req, pdfCheck.error || 'Invalid CV PDF file', 400, 'INVALID_PDF');
        }

        const filePath = `${applicationId}/cv.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from('cvs')
          .upload(filePath, bytes, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadErr) {
          console.error('[submit-application] CV storage upload failed:', uploadErr);
          return errorResponse(req, 'Failed to store CV attachment', 500);
        }

        cvUrl = filePath;
      } catch (cvErr) {
        console.error('[submit-application] Error parsing CV base64 payload:', cvErr);
        return errorResponse(req, 'Corrupted CV attachment payload', 400, 'CV_PARSE_ERROR');
      }
    }

    // 12. Insert Application Row using Service Role
    // Server enforces status='new', resolved season_id, interview_score=null, reviewed_by=null
    const applicationRow = buildApplicationRow({
      applicationId,
      seasonId,
      input,
      normalizedEmail,
      firstChoiceId,
      secondChoiceId,
      cvUrl,
      ipHash,
    });

    const { error: insertErr } = await supabase.from('applications').insert([applicationRow]);

    if (insertErr) {
      rateCheck.release?.();
      console.error('[submit-application] Database insert error:', insertErr);
      return errorResponse(req, 'Failed to submit application. Please try again later.', 500);
    }

    return json(req, {
      ok: true,
      message: 'Application submitted successfully',
      applicationId,
    });
  } catch (err) {
    console.error('[submit-application] Unexpected server error:', err);
    return errorResponse(req, 'Internal server error', 500);
  }
});
}
