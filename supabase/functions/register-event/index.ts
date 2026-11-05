// supabase/functions/register-event/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@4.6.7';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse, getClientIp, sanitizeText } from '../_shared/http.ts';
import { verifyTurnstile } from '../_shared/turnstile.ts';
import { isRateLimited } from '../_shared/ratelimit.ts';
import { generateTicketRecoveryToken, verifyTicketRecoveryToken } from '../_shared/recovery.ts';

export const RegisterSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(2).max(100).optional().default('Attendee'),
  email: z.string().email().max(254),
  phone: z.string().max(25).optional().nullable(),
  turnstile_token: z.string().min(1).optional(),
  action: z.enum(['register', 'recover']).optional().default('register'),
  recovery_token: z.string().optional(),
  verification_token: z.string().optional(),
});

/**
 * Builds the public response payload.
 * NEVER returns ticket_code for an existing registration unless email ownership is verified.
 */
export function formatRegistrationResponse({
  result,
  hasVerifiedEmailOwnership,
}: {
  result: {
    ticket_code?: string | null;
    status: string;
    is_existing?: boolean;
    error?: string;
  };
  hasVerifiedEmailOwnership: boolean;
}) {
  const isExisting = Boolean(result.is_existing);
  const regStatus = result.status;

  if (isExisting && !hasVerifiedEmailOwnership) {
    return {
      success: true,
      is_existing: true,
      status: regStatus,
      requires_verification: true,
      message: 'تم تسجيلك مسبقاً في هذه الفعالية. لأسباب أمنية، تم إرسال تفاصيل التذكرة ورابط الاسترداد إلى بريدك الإلكتروني.',
    };
  }

  if (isExisting && hasVerifiedEmailOwnership) {
    return {
      success: true,
      is_existing: true,
      verified: true,
      ticket_code: result.ticket_code ?? undefined,
      status: regStatus,
      message: 'تم استرداد التذكرة بنجاح.',
    };
  }

  return {
    success: true,
    ticket_code: result.ticket_code ?? undefined,
    status: regStatus,
    is_existing: false,
  };
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const originError = checkOrigin(req);
    if (originError) return originError;

    if (req.method !== 'POST') {
      return errorResponse(req, 'Method not allowed', 405);
    }

    try {
      const body = await req.json();
      const parsed = RegisterSchema.safeParse(body);
      if (!parsed.success) {
        return json(req, { error: 'Validation failed', details: parsed.error.issues }, 400);
      }

      const { event_id, name, email, phone, turnstile_token, recovery_token, verification_token } = parsed.data;
      const cleanEmail = email.trim().toLowerCase();
      const clientIp = getClientIp(req);

      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      if (!supabaseUrl || !supabaseServiceKey) {
        return errorResponse(req, 'Server configuration error', 500);
      }

      const recoverySecret =
        Deno.env.get('RECOVERY_SECRET') ||
        Deno.env.get('JWT_SECRET') ||
        supabaseServiceKey;

      // 1. Verify Proof of Email Ownership (if recovery or verification token provided)
      const tokenToVerify = recovery_token || verification_token;
      let hasVerifiedEmailOwnership = false;

      if (tokenToVerify) {
        const verifyRes = await verifyTicketRecoveryToken(tokenToVerify, event_id, cleanEmail, recoverySecret);
        if (!verifyRes.valid) {
          return errorResponse(req, verifyRes.error || 'Invalid or expired verification token.', 403, 'INVALID_VERIFICATION_TOKEN');
        }
        hasVerifiedEmailOwnership = true;
      } else {
        // If unverified, require Turnstile bot verification
        if (!turnstile_token) {
          return errorResponse(req, 'Bot verification token is required', 400, 'TURNSTILE_REQUIRED');
        }
        const turnstileResult = await verifyTurnstile(turnstile_token, clientIp);
        const turnstileOk =
          typeof turnstileResult === 'boolean'
            ? turnstileResult
            : Boolean(turnstileResult?.success);
        if (!turnstileOk) {
          return errorResponse(req, 'Bot verification failed. Please refresh and try again.', 403, 'TURNSTILE_FAILED');
        }
      }

      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      // 2. Rate limiting (max 10 registrations/lookups per IP per hour)
      const limited = await isRateLimited(adminClient, clientIp, 'event_registrations', 10, 3600);
      if (limited) {
        return errorResponse(req, 'Too many requests. Please try again later.', 429, 'RATE_LIMITED');
      }

      // 3. Atomic capacity & registration via database function with proof verification flag
      const { data: result, error: rpcError } = await adminClient.rpc('register_for_event', {
        p_event_id: event_id,
        p_full_name: sanitizeText(name),
        p_email: cleanEmail,
        p_phone: phone ? sanitizeText(phone) : null,
        p_verify_proof: hasVerifiedEmailOwnership,
      });

      if (rpcError) {
        console.error('RPC register_for_event error:', rpcError);
        return errorResponse(req, 'Failed to process event registration', 500);
      }

      if (result?.error) {
        const errorMap: Record<string, { msg: string; status: number }> = {
          EVENT_NOT_FOUND: { msg: 'Event not found or has been removed.', status: 404 },
          REGISTRATION_CLOSED: { msg: 'Registration is currently closed for this event.', status: 400 },
          EVENT_FINISHED: { msg: 'This event has already concluded.', status: 400 },
        };
        const mapped = errorMap[result.error] || { msg: 'Registration could not be completed.', status: 400 };
        return json(req, { error: mapped.msg, code: result.error }, mapped.status);
      }

      const isExisting = Boolean(result.is_existing);
      const regStatus = result.status; // 'registered' | 'waitlist'

      // 4. Send Confirmation / Recovery Email via Resend
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      const fromEmail = Deno.env.get('FROM_EMAIL') || 'Enactus Qena <events@enactusqena.org>';
      const siteUrl = Deno.env.get('SITE_URL') || 'https://enactusqena.org';

      if (resendApiKey) {
        try {
          let recoveryUrl = '';
          let ticketCodeForEmail = result.ticket_code;

          // If attendee is already registered and hasn't verified ownership yet,
          // create a secure recovery token and link to email directly to their inbox
          if (isExisting && !ticketCodeForEmail) {
            const recoveryToken = await generateTicketRecoveryToken(event_id, cleanEmail, recoverySecret);
            recoveryUrl = `${siteUrl}/ticket-recovery?token=${recoveryToken}&event_id=${event_id}&email=${encodeURIComponent(cleanEmail)}`;

            // Query ticket code strictly for the private email dispatch
            const { data: regInfo } = await adminClient
              .from('event_registrations')
              .select('ticket_code')
              .eq('event_id', event_id)
              .eq('email', cleanEmail)
              .maybeSingle();

            ticketCodeForEmail = regInfo?.ticket_code;
          }

          if (ticketCodeForEmail) {
            const { data: eventInfo } = await adminClient
              .from('events')
              .select('title_ar, title_en, venue_ar, venue_en, starts_at')
              .eq('id', event_id)
              .single();

            const ticketUrl = `${siteUrl}/ticket/${ticketCodeForEmail}`;
            const eventTitle = eventInfo?.title_ar || eventInfo?.title_en || 'Enactus Event';
            const venue = eventInfo?.venue_ar || eventInfo?.venue_en || 'Qena';
            const dateStr = eventInfo?.starts_at ? new Date(eventInfo.starts_at).toLocaleDateString('ar-EG') : '';

            const subject = isExisting
              ? `استرداد تذكرتك لحضور ${eventTitle} • Ticket Details & Recovery`
              : regStatus === 'registered'
              ? `تأكيد تذكرتك لحضور ${eventTitle} • Ticket Confirmation`
              : `قائمة الانتظار لفعالية ${eventTitle} • Waitlist Confirmation`;

            const emailMessage = isExisting
              ? 'لقد تم طلب الوصول إلى تذكرتك المسجلة مسبقاً لهذه الفعالية.'
              : regStatus === 'registered'
              ? 'تم تأكيد حجز مقعدك بنجاح في الفعالية. يرجى الاحتفاظ برمز التذكرة لإبرازه عند الدخول.'
              : 'تمت إضافتك إلى قائمة الانتظار بنجاح. سيتم إخطارك فور توفر مقعد شاغر.';

            const recoveryBlock = recoveryUrl
              ? `<div style="text-align: center; margin-top: 15px;">
                   <a href="${recoveryUrl}" style="background: #2563eb; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; display: inline-block;">
                     رابط استرداد التذكرة الآمن
                   </a>
                 </div>`
              : '';

            const html = `
              <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #0b0c10; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <h1 style="color: #ffb800; margin: 0; font-size: 24px;">Enactus Qena</h1>
                  <p style="color: #a0a0b2; font-size: 14px; margin-top: 5px;">${eventTitle}</p>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 10px; border: 1px solid #ffb800;">
                  <h2 style="color: #fff; font-size: 18px; margin-top: 0;">أهلاً ${name}،</h2>
                  <p style="color: #d1d5db; line-height: 1.6;">${emailMessage}</p>
                  
                  <div style="background: #161822; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <div style="color: #88889a; font-size: 12px; text-transform: uppercase;">رمز التذكرة / Ticket Code</div>
                    <div style="font-size: 26px; font-weight: bold; color: #ffb800; letter-spacing: 2px; margin-top: 5px;">${ticketCodeForEmail}</div>
                  </div>

                  <div style="font-size: 14px; color: #9ca3af; margin-bottom: 20px;">
                    <div>📍 <strong>المكان:</strong> ${venue}</div>
                    <div>🗓️ <strong>الموعد:</strong> ${dateStr}</div>
                  </div>

                  <div style="text-align: center; margin-top: 25px;">
                    <a href="${ticketUrl}" style="background: #ffb800; color: #000; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                      عرض التذكرة ورمز QR
                    </a>
                  </div>
                  ${recoveryBlock}
                </div>

                <p style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px;">
                  Enactus South Valley University (Qena) • Student-Activity Platform
                </p>
              </div>
            `;

            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [cleanEmail],
                subject,
                html,
              }),
            });
          }
        } catch (emailErr) {
          console.error('Email delivery error:', emailErr);
        }
      }

      // 5. Build secure public response
      const responsePayload = formatRegistrationResponse({
        result,
        hasVerifiedEmailOwnership,
      });

      return json(req, responsePayload, 200);

    } catch (err: unknown) {
      console.error('Unhandled register-event error:', err);
      return errorResponse(req, 'An unexpected error occurred', 500);
    }
  });
}
