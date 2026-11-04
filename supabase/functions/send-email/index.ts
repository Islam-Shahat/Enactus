// supabase/functions/send-email/index.ts
// Sends transactional operational emails via Resend API.
// Requires: verify_jwt=true, callable by service_role, leadership, or x-cron-secret header.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@4.6.7';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse } from '../_shared/http.ts';
import {
  renderPaymentReminderHtml,
  renderWeeklyReportHtml,
  renderAnnouncementDigestHtml,
  wrapEmailLayout,
} from '../_shared/emailTemplates.ts';

const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(200),
  template: z.enum(['payment_reminder', 'weekly_report', 'announcement_digest', 'custom']),
  data: z.record(z.any()).default({}),
  lang: z.enum(['ar', 'en']).default('ar'),
});

Deno.serve(async (req: Request) => {
  // 1. CORS Preflight & Origin check
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const originError = checkOrigin(req);
  if (originError) return originError;

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  // 2. Environment secrets
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'notifications@enactus-qena.org';
  const cronSecret = Deno.env.get('CRON_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  if (!resendApiKey) {
    console.error('[send-email] Missing RESEND_API_KEY secret');
    return errorResponse(req, 'Email service is not configured', 503, 'SERVICE_UNAVAILABLE');
  }

  // 3. Authorization Check
  // Allowed if:
  // a) x-cron-secret matches CRON_SECRET, OR
  // b) caller has valid JWT with roles: president, vice_president, finance_admin, super_admin, OR
  // c) service_role key was passed in authorization header
  const authHeader = req.headers.get('authorization') || '';
  const cronHeader = req.headers.get('x-cron-secret') || '';

  let isAuthorized = Boolean(cronSecret && cronHeader === cronSecret);

  if (!isAuthorized && authHeader) {
    const token = authHeader.replace(/^bearer\s+/i, '').trim();

    // Check service role
    if (token === supabaseServiceKey) {
      isAuthorized = true;
    } else {
      // Verify JWT via Supabase client
      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await callerClient.auth.getUser();

      if (!userErr && user) {
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        const { data: roles } = await adminClient
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const roleNames = (roles || []).map((r: { role: string }) => r.role);
        if (
          roleNames.includes('super_admin') ||
          roleNames.includes('president') ||
          roleNames.includes('vice_president') ||
          roleNames.includes('finance_admin') ||
          roleNames.includes('hr_admin')
        ) {
          isAuthorized = true;
        }
      }
    }
  }

  if (!isAuthorized) {
    return errorResponse(req, 'Unauthorized to dispatch emails', 403, 'FORBIDDEN');
  }

  // 4. Parse & Validate Payload
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse(req, 'Invalid JSON body', 400, 'INVALID_BODY');
  }

  const parseResult = sendEmailSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return errorResponse(
      req,
      'Invalid input parameters',
      400,
      'VALIDATION_FAILED'
    );
  }

  const { to, subject, template, data, lang } = parseResult.data;

  // 5. Render HTML content based on requested template
  let htmlContent = '';
  switch (template) {
    case 'payment_reminder':
      htmlContent = renderPaymentReminderHtml({
        companyName: data.companyName || '',
        agreementTitle: data.agreementTitle,
        amount: Number(data.amount) || 0,
        dueDate: data.dueDate || '',
        isOverdue: Boolean(data.isOverdue),
        dashboardUrl: data.dashboardUrl,
        lang,
      });
      break;

    case 'weekly_report':
      htmlContent = renderWeeklyReportHtml({
        committeeName: data.committeeName,
        stats: data.stats || { attendanceRate: 0, tasksDone: 0, tasksLate: 0, pointsAwarded: 0 },
        weekLabel: data.weekLabel,
        dashboardUrl: data.dashboardUrl,
        lang,
      });
      break;

    case 'announcement_digest':
      htmlContent = renderAnnouncementDigestHtml({
        announcements: Array.isArray(data.announcements) ? data.announcements : [],
        dashboardUrl: data.dashboardUrl,
        lang,
      });
      break;

    case 'custom':
      htmlContent = wrapEmailLayout({
        content: String(data.html || `<p>${data.message || ''}</p>`),
        lang,
        preheader: data.preheader,
      });
      break;
  }

  // 6. Send email through Resend API
  const recipients = Array.isArray(to) ? to : [to];

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject,
        html: htmlContent,
      }),
    });

    if (!resendRes.ok) {
      const errorText = await resendRes.text();
      console.error('[send-email] Resend API error response:', resendRes.status, errorText);
      return errorResponse(req, 'Failed to deliver email through provider', 502, 'PROVIDER_ERROR');
    }

    const resendData = await resendRes.json();
    return json(req, {
      ok: true,
      id: resendData.id,
      recipientsCount: recipients.length,
    });
  } catch (err: unknown) {
    console.error('[send-email] Delivery network failure:', err instanceof Error ? err.message : err);
    return errorResponse(req, 'Email delivery communication failure', 500, 'DELIVERY_ERROR');
  }
});
