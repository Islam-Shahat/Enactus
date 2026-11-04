// supabase/functions/submit-feedback/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { z } from 'https://esm.sh/zod@3.23.8';
import { handleCors } from '../_shared/cors.ts';
import { json, errorResponse, getClientIp, sanitizeText } from '../_shared/http.ts';
import { isRateLimited } from '../_shared/ratelimit.ts';

const FeedbackSchema = z.object({
  ticket_code: z.string().min(3).max(50),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const parsed = FeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return json(req, { error: 'Validation failed', details: parsed.error.issues }, 400);
    }

    const { ticket_code, rating, comment } = parsed.data;
    const clientIp = getClientIp(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse(req, 'Server configuration error', 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting
    const limited = await isRateLimited(adminClient, clientIp, 'event_feedback', 10, 600);
    if (limited) {
      return errorResponse(req, 'Too many feedback submissions. Please wait.', 429, 'RATE_LIMITED');
    }

    const cleanCode = ticket_code.trim().toUpperCase();

    // 1. Look up registration
    const { data: reg, error: regError } = await adminClient
      .from('event_registrations')
      .select('id, event_id, status, full_name')
      .eq('ticket_code', cleanCode)
      .maybeSingle();

    if (regError || !reg) {
      return errorResponse(req, 'Invalid ticket code. Registration not found.', 404, 'TICKET_NOT_FOUND');
    }

    // 2. Require 'attended' status
    if (reg.status !== 'attended') {
      return errorResponse(
        req,
        'Feedback is only accepted from verified attendees who checked in at the event.',
        403,
        'NOT_ATTENDED'
      );
    }

    // 3. Check if feedback already submitted for this registration
    const { data: existingFeedback } = await adminClient
      .from('event_feedback')
      .select('id')
      .eq('registration_id', reg.id)
      .maybeSingle();

    if (existingFeedback) {
      return errorResponse(
        req,
        'Feedback has already been submitted for this ticket. Thank you!',
        409,
        'ALREADY_SUBMITTED'
      );
    }

    // 4. Insert feedback
    const { error: insertError } = await adminClient
      .from('event_feedback')
      .insert({
        event_id: reg.event_id,
        registration_id: reg.id,
        rating,
        comment: comment ? sanitizeText(comment) : null,
      });

    if (insertError) {
      console.error('Error inserting event feedback:', insertError);
      return errorResponse(req, 'Failed to save feedback.', 500);
    }

    return json(req, {
      success: true,
      message: 'Feedback submitted successfully. Thank you for helping us improve!',
    }, 200);

  } catch (err: unknown) {
    console.error('Unhandled submit-feedback error:', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
});

