// supabase/functions/ticket-lookup/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@4.6.7';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse, getClientIp } from '../_shared/http.ts';
import { isRateLimited } from '../_shared/ratelimit.ts';

const LookupSchema = z.object({
  code: z.string().min(3).max(50),
});

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
    const parsed = LookupSchema.safeParse(body);
    if (!parsed.success) {
      return json(req, { error: 'Invalid ticket code' }, 400);
    }

    const { code } = parsed.data;
    const clientIp = getClientIp(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse(req, 'Server configuration error', 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: max 30 lookups per IP per 5 minutes
    const limited = await isRateLimited(adminClient, clientIp, 'event_registrations', 30, 300);
    if (limited) {
      return errorResponse(req, 'Too many requests. Please wait.', 429, 'RATE_LIMITED');
    }

    const cleanCode = code.trim().toUpperCase();

    // Query registration joined with event details
    const { data: reg, error: regError } = await adminClient
      .from('event_registrations')
      .select(`
        id,
        full_name,
        ticket_code,
        status,
        checked_in_at,
        created_at,
        events:event_id (
          id,
          slug,
          title_ar,
          title_en,
          venue_ar,
          venue_en,
          starts_at,
          ends_at,
          status,
          cover_url
        )
      `)
      .eq('ticket_code', cleanCode)
      .maybeSingle();

    if (regError || !reg) {
      return errorResponse(req, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    // PRIVACY: Only return attendee's first name, NEVER return email or phone
    const firstName = reg.full_name?.trim().split(/\s+/)[0] || 'Attendee';

    return json(req, {
      ticket_code: reg.ticket_code,
      status: reg.status,
      checked_in_at: reg.checked_in_at,
      attendee_first_name: firstName,
      event: {
        id: reg.events?.id,
        slug: reg.events?.slug,
        title_ar: reg.events?.title_ar,
        title_en: reg.events?.title_en,
        venue_ar: reg.events?.venue_ar,
        venue_en: reg.events?.venue_en,
        starts_at: reg.events?.starts_at,
        ends_at: reg.events?.ends_at,
        status: reg.events?.status,
        cover_url: reg.events?.cover_url,
      },
    }, 200);

  } catch (err: unknown) {
    console.error('Unhandled ticket-lookup error:', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
  });
}

