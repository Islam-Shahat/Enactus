// supabase/functions/qr-checkin/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@4.6.7';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse } from '../_shared/http.ts';
import { verifyQrToken, verifyManualCode } from '../_shared/qr.ts';

const qrCheckinSchema = z.object({
  token: z.string().min(10).optional(),
  session_id: z.string().uuid().optional(),
  code: z.string().min(4).max(16).optional(),
}).refine((data) => Boolean(data.token || (data.session_id && data.code)), {
  message: 'Either token or both session_id and code must be provided',
});

// Best-effort in-memory isolate rate limiter: 15 attempts / minute per user+session
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const checkinLimiter = new Map<string, RateLimitBucket>();

function checkRateLimitPerUserSession(key: string, limit = 15, windowMs = 60000): boolean {
  const now = Date.now();
  const bucket = checkinLimiter.get(key);
  if (!bucket || now > bucket.resetAt) {
    checkinLimiter.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) {
    return false;
  }
  bucket.count++;
  return true;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  // 1. CORS Preflight & Origin validation
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const originError = checkOrigin(req);
  if (originError) return originError;

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('[qr-checkin] Missing Supabase environment variables');
    return errorResponse(req, 'Backend server configuration error', 500);
  }

  // 2. Verify Caller Identity from Authorization JWT
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return errorResponse(req, 'Missing authorization header', 401, 'UNAUTHORIZED');
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: callerUser },
    error: authError,
  } = await callerClient.auth.getUser();

  if (authError || !callerUser) {
    return errorResponse(req, 'Unauthorized user session', 401, 'UNAUTHORIZED');
  }

  const callerId = callerUser.id;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // 3. Parse input payload with Zod: either { token } or { session_id, code }
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse(req, 'Invalid JSON body', 400);
  }

  const parsed = qrCheckinSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(req, parsed.error.issues[0]?.message || 'Invalid input parameters', 400, 'INVALID_INPUT');
  }

  let targetSessionId = parsed.data.session_id;
  const rawToken = parsed.data.token;
  const rawCode = parsed.data.code;

  // If token is provided, extract session ID from token structure first
  if (rawToken) {
    try {
      const decoded = atob(rawToken.replace(/-/g, '+').replace(/_/g, '/'));
      const parts = decoded.split('.');
      if (parts.length >= 2) {
        targetSessionId = parts[0];
      }
    } catch {
      return errorResponse(req, 'Malformed QR token', 400, 'INVALID_TOKEN');
    }
  }

  // Validate session ID format (UUID)
  if (!targetSessionId || !UUID_REGEX.test(targetSessionId)) {
    return errorResponse(req, 'Invalid session ID format', 400, 'INVALID_INPUT');
  }

  // Throttle check-in attempts per user + session (15 / minute)
  const throttleKey = `${callerId}:${targetSessionId}`;
  if (!checkRateLimitPerUserSession(throttleKey, 15, 60000)) {
    return errorResponse(req, 'Too many check-in attempts. Please wait a minute.', 429, 'RATE_LIMITED');
  }

  // 4. Fetch Session Record & Session Secret
  const [sessionRes, secretRes] = await Promise.all([
    adminClient
      .from('attendance_sessions')
      .select('id, season_id, committee_id, starts_at, ends_at, check_in_open, title')
      .eq('id', targetSessionId)
      .maybeSingle(),
    adminClient
      .from('session_secrets')
      .select('secret')
      .eq('session_id', targetSessionId)
      .maybeSingle(),
  ]);

  if (sessionRes.error || !sessionRes.data) {
    return errorResponse(req, 'Attendance session not found', 404, 'NOT_FOUND');
  }
  if (secretRes.error || !secretRes.data?.secret) {
    console.error('[qr-checkin] Missing secret for session:', targetSessionId);
    return errorResponse(req, 'Session security verification failed', 500);
  }

  const session = sessionRes.data;
  const secret = secretRes.data.secret;

  // 5. Verify Token or Manual Code (Accepts current and previous window)
  const nowMs = Date.now();
  let verificationSuccess = false;

  if (rawToken) {
    const tokenResult = await verifyQrToken(rawToken, secret, nowMs);
    if (!tokenResult.valid || tokenResult.sessionId !== targetSessionId) {
      return errorResponse(req, tokenResult.error || 'Invalid or expired QR token', 400, 'TOKEN_INVALID');
    }
    verificationSuccess = true;
  } else if (rawCode) {
    const codeResult = await verifyManualCode(targetSessionId, rawCode, secret, nowMs);
    if (!codeResult.valid) {
      return errorResponse(req, codeResult.error || 'Invalid or expired manual code', 400, 'CODE_INVALID');
    }
    verificationSuccess = true;
  }

  if (!verificationSuccess) {
    return errorResponse(req, 'Verification failed', 400, 'VERIFICATION_FAILED');
  }

  // 6. Check if session check-in is currently open
  if (!session.check_in_open) {
    return errorResponse(req, 'Check-in is closed for this session', 400, 'CHECK_IN_CLOSED');
  }

  // 7. Time Window: starts_at - 30 min <= now <= coalesce(ends_at, starts_at + 4h)
  const startsAtMs = new Date(session.starts_at).getTime();
  const earliestCheckin = startsAtMs - 30 * 60 * 1000;
  const defaultEndsAt = startsAtMs + 4 * 60 * 60 * 1000;
  const latestCheckin = session.ends_at ? new Date(session.ends_at).getTime() : defaultEndsAt;

  if (nowMs < earliestCheckin || nowMs > latestCheckin) {
    return errorResponse(
      req,
      'Current time is outside the allowed check-in window for this session',
      400,
      'OUTSIDE_CHECKIN_WINDOW'
    );
  }

  // 8. Eligibility Check:
  // (a) Profile status must be 'active' (not suspended or alumni)
  const { data: userProfile } = await adminClient
    .from('profiles')
    .select('status')
    .eq('id', callerId)
    .maybeSingle();

  if (!userProfile || userProfile.status !== 'active') {
    return errorResponse(req, 'Account is not active or suspended', 403, 'NOT_ELIGIBLE');
  }

  // (b) Always require an active membership this season (in committee when set)
  let membershipQuery = adminClient
    .from('memberships')
    .select('id, status')
    .eq('user_id', callerId)
    .eq('season_id', session.season_id)
    .eq('status', 'active');

  if (session.committee_id) {
    membershipQuery = membershipQuery.eq('committee_id', session.committee_id);
  }

  const { data: membership, error: memErr } = await membershipQuery.limit(1).maybeSingle();

  if (memErr || !membership) {
    return errorResponse(
      req,
      session.committee_id
        ? 'You are not an active member of this committee for this season'
        : 'You do not have an active membership for this season',
      403,
      'NOT_ELIGIBLE'
    );
  }

  // 9. Check Existing Attendance (Never overwrite 'excused', and keep existing 'present'/'late' untouched)
  const { data: existingAttendance } = await adminClient
    .from('attendance')
    .select('id, status, checked_in_at')
    .eq('session_id', targetSessionId)
    .eq('user_id', callerId)
    .maybeSingle();

  if (existingAttendance) {
    if (existingAttendance.status === 'excused') {
      return json(req, {
        ok: true,
        status: 'excused',
        message: 'You have an approved excuse on record for this session',
      });
    }

    if (existingAttendance.status === 'present' || existingAttendance.status === 'late') {
      return json(req, {
        ok: true,
        status: existingAttendance.status,
        checked_in_at: existingAttendance.checked_in_at,
        alreadyRecorded: true,
        session_title: session.title,
      });
    }
  }

  // 10. Determine Status: 'late' if now > starts_at + 15 min else 'present'
  const lateThreshold = startsAtMs + 15 * 60 * 1000;
  const statusToRecord = nowMs > lateThreshold ? 'late' : 'present';

  // 11. Upsert Attendance Record
  const nowIso = new Date(nowMs).toISOString();
  const { error: upsertErr } = await adminClient.from('attendance').upsert(
    {
      session_id: targetSessionId,
      user_id: callerId,
      status: statusToRecord,
      method: 'qr',
      checked_in_at: nowIso,
      recorded_by: callerId,
      notes: rawToken ? 'QR check-in' : 'Manual code check-in',
    },
    { onConflict: 'session_id,user_id' }
  );

  if (upsertErr) {
    console.error('[qr-checkin] Failed to upsert attendance:', upsertErr);
    return errorResponse(req, 'Failed to record attendance', 500);
  }

  return json(req, {
    ok: true,
    status: statusToRecord,
    checked_in_at: nowIso,
    session_title: session.title,
  });
});
