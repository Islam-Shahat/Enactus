// supabase/functions/contact-form/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse, getClientIp, sanitizeText } from '../_shared/http.ts';
import { verifyTurnstile } from '../_shared/turnstile.ts';
import { hashIp, checkRateLimit } from '../_shared/ratelimit.ts';
import { contactFormSchema } from '../_shared/schemas.ts';

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
      return json(req, { ok: true, message: 'Message sent successfully' });
    }

    // 2. Validate payload with Zod
    const parsed = contactFormSchema.safeParse(rawBody);
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
      console.error('[contact-form] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return errorResponse(req, 'Backend server configuration error', 500);
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 6. Rate Limit Check (Max 5 per ip_hash per 24 hours)
    const rateCheck = await checkRateLimit(supabase, 'contact_messages', ipHash, 5, 24);
    if (!rateCheck.allowed) {
      return errorResponse(req, 'Rate limit exceeded. Maximum 5 messages per day.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // 7. Insert message with sanitized text into public.contact_messages
    const { data: inserted, error: insertErr } = await supabase
      .from('contact_messages')
      .insert({
        kind: input.kind,
        full_name: sanitizeText(input.fullName),
        email: input.email.toLowerCase().trim(),
        phone: input.phone ? sanitizeText(input.phone) : null,
        organization: input.organization ? sanitizeText(input.organization) : null,
        subject: input.subject ? sanitizeText(input.subject) : null,
        message: sanitizeText(input.message),
        package_interest: input.packageInterest ? sanitizeText(input.packageInterest) : null,
        status: 'new',
        ip_hash: ipHash,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[contact-form] insert error:', insertErr);
      return errorResponse(req, 'Failed to submit message. Please try again.', 500);
    }

    return json(req, {
      ok: true,
      id: inserted?.id,
      message: 'Message submitted successfully',
    });
  } catch (err) {
    console.error('[contact-form] Unhandled error:', err);
    return errorResponse(req, 'Internal server error', 500);
  }
});

