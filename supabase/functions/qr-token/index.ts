// supabase/functions/qr-token/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse } from '../_shared/http.ts';
import { generateQrTokenAndCode } from '../_shared/qr.ts';

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
    console.error('[qr-token] Missing Supabase environment variables');
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

  // 3. Parse and validate body
  let body: { session_id?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse(req, 'Invalid JSON body', 400);
  }

  const sessionId = body?.session_id;
  if (!sessionId || typeof sessionId !== 'string') {
    return errorResponse(req, 'session_id is required', 400, 'INVALID_INPUT');
  }

  // 4. Fetch session details
  const { data: session, error: sessionErr } = await adminClient
    .from('attendance_sessions')
    .select('id, committee_id, check_in_open')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionErr || !session) {
    return errorResponse(req, 'Attendance session not found', 404, 'NOT_FOUND');
  }

  // 5. Manager Permission Check (Checked FIRST to avoid leaking session open/closed state to unauthorized callers)
  // Allowed: hr_admin, president, vice_president, coordinator, oc_admin, super_admin, or head of session's committee
  const { data: userRoles, error: rolesErr } = await adminClient
    .from('user_roles')
    .select('role, committee_id')
    .eq('user_id', callerId);

  if (rolesErr) {
    console.error('[qr-token] Error fetching user roles:', rolesErr);
    return errorResponse(req, 'Failed to verify permissions', 500);
  }

  const LEADERSHIP_ROLES = ['hr_admin', 'president', 'vice_president', 'coordinator', 'oc_admin', 'super_admin'];
  const isLeader = userRoles?.some((r) => LEADERSHIP_ROLES.includes(r.role));
  const isCommitteeHead = Boolean(
    session.committee_id &&
      userRoles?.some((r) => r.role === 'committee_head' && r.committee_id === session.committee_id)
  );

  if (!isLeader && !isCommitteeHead) {
    return errorResponse(req, 'Forbidden: Insufficient permissions to generate session QR tokens', 403, 'FORBIDDEN');
  }

  // 6. Check if session check-in is open (Revealed ONLY to authorized managers)
  if (!session.check_in_open) {
    return errorResponse(req, 'Check-in is currently closed for this session', 400, 'CHECK_IN_CLOSED');
  }

  // 7. Fetch Session Secret (Service Role only)
  const { data: secretRow, error: secretErr } = await adminClient
    .from('session_secrets')
    .select('secret')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (secretErr || !secretRow?.secret) {
    console.error('[qr-token] Missing session secret in database:', secretErr);
    return errorResponse(req, 'Session secret is not initialized', 500);
  }

  // 8. Generate rotating token and code
  const result = await generateQrTokenAndCode(sessionId, secretRow.secret);

  return json(req, {
    ok: true,
    token: result.token,
    code: result.code,
    expiresAt: result.expiresAt,
    window: result.window,
  });
});
