// supabase/functions/register-event/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { z } from 'https://esm.sh/zod@3.23.8';
import { handleCors } from '../_shared/cors.ts';
import { json, errorResponse, getClientIp, sanitizeText } from '../_shared/http.ts';
import { verifyTurnstile } from '../_shared/turnstile.ts';
import { isRateLimited } from '../_shared/ratelimit.ts';

const RegisterSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().max(25).optional().nullable(),
  turnstile_token: z.string().min(1),
});

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return json(req, { error: 'Validation failed', details: parsed.error.issues }, 400);
    }

    const { event_id, name, email, phone, turnstile_token } = parsed.data;
    const clientIp = getClientIp(req);

    // 1. Verify Turnstile
    const turnstileOk = await verifyTurnstile(turnstile_token, clientIp);
    if (!turnstileOk) {
      return errorResponse(req, 'Bot verification failed. Please refresh and try again.', 403, 'TURNSTILE_FAILED');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse(req, 'Server configuration error', 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Rate limiting (max 10 registrations per IP per hour)
    const limited = await isRateLimited(adminClient, clientIp, 'event_registrations', 10, 3600);
    if (limited) {
      return errorResponse(req, 'Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    }

    // 3. Atomic capacity & registration via database function
    const { data: result, error: rpcError } = await adminClient.rpc('register_for_event', {
      p_event_id: event_id,
      p_full_name: sanitizeText(name),
      p_email: email.trim().toLowerCase(),
      p_phone: phone ? sanitizeText(phone) : null,
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

    const ticketCode = result.ticket_code;
    const regStatus = result.status; // 'registered' | 'waitlist'
    const isExisting = Boolean(result.is_existing);

    // 4. Send Confirmation Email via Resend if credentials provided
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Enactus Qena <events@enactusqena.org>';
    const siteUrl = Deno.env.get('SITE_URL') || 'https://enactusqena.org';

    if (resendApiKey && !isExisting) {
      try {
        // Query event details for the email
        const { data: eventInfo } = await adminClient
          .from('events')
          .select('title_ar, title_en, venue_ar, venue_en, starts_at')
          .eq('id', event_id)
          .single();

        const ticketUrl = `${siteUrl}/ticket/${ticketCode}`;
        const eventTitle = eventInfo?.title_ar || eventInfo?.title_en || 'Enactus Event';
        const venue = eventInfo?.venue_ar || eventInfo?.venue_en || 'Qena';
        const dateStr = eventInfo?.starts_at ? new Date(eventInfo.starts_at).toLocaleDateString('ar-EG') : '';

        const subject = regStatus === 'registered'
          ? `تأكيد تذكرتك لحضور ${eventTitle} • Ticket Confirmation`
          : `قائمة الانتظار لفعالية ${eventTitle} • Waitlist Confirmation`;

        const html = `
          <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #0b0c10; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #ffb800; margin: 0; font-size: 24px;">Enactus Qena</h1>
              <p style="color: #a0a0b2; font-size: 14px; margin-top: 5px;">${eventTitle}</p>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 10px; border: 1px solid #ffb800;">
              <h2 style="color: #fff; font-size: 18px; margin-top: 0;">أهلاً ${name}،</h2>
              <p style="color: #d1d5db; line-height: 1.6;">
                ${regStatus === 'registered'
                  ? 'تم تأكيد حجز مقعدك بنجاح في الفعالية. يرجى الاحتفاظ برمز التذكرة لإبرازه عند الدخول.'
                  : 'تمت إضافتك إلى قائمة الانتظار بنجاح. سيتم إخطارك فور توفر مقعد شاغر.'}
              </p>
              
              <div style="background: #161822; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <div style="color: #88889a; font-size: 12px; text-transform: uppercase;">رمز التذكرة / Ticket Code</div>
                <div style="font-size: 26px; font-weight: bold; color: #ffb800; letter-spacing: 2px; margin-top: 5px;">${ticketCode}</div>
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
            to: [email],
            subject,
            html,
          }),
        });
      } catch (emailErr) {
        // Silently skip email delivery errors so registration does not fail
        console.error('Resend delivery error:', emailErr);
      }
    }

    return json(req, {
      success: true,
      ticket_code: ticketCode,
      status: regStatus,
      is_existing: isExisting,
    }, 200);

  } catch (err: unknown) {
    console.error('Unhandled register-event error:', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
});

