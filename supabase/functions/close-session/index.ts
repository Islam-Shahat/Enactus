// supabase/functions/close-session/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse } from '../_shared/http.ts';

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
    console.error('[close-session] Missing Supabase environment variables');
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

  // 3. Parse input
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

  // 4. Fetch Session
  const { data: session, error: sessionErr } = await adminClient
    .from('attendance_sessions')
    .select('id, season_id, committee_id, check_in_open, title')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionErr || !session) {
    return errorResponse(req, 'Session not found', 404, 'NOT_FOUND');
  }

  // 5. Check Manager Permissions
  const { data: userRoles, error: rolesErr } = await adminClient
    .from('user_roles')
    .select('role, committee_id')
    .eq('user_id', callerId);

  if (rolesErr) {
    return errorResponse(req, 'Failed to verify manager permissions', 500);
  }

  const LEADERSHIP_ROLES = ['hr_admin', 'president', 'vice_president', 'coordinator', 'oc_admin', 'super_admin'];
  const isLeader = userRoles?.some((r) => LEADERSHIP_ROLES.includes(r.role));
  const isCommitteeHead = Boolean(
    session.committee_id &&
      userRoles?.some((r) => r.role === 'committee_head' && r.committee_id === session.committee_id)
  );

  if (!isLeader && !isCommitteeHead) {
    return errorResponse(req, 'Forbidden: Insufficient privileges to close attendance sessions', 403, 'FORBIDDEN');
  }

  // 6. Set check_in_open = false
  const { error: closeErr } = await adminClient
    .from('attendance_sessions')
    .update({ check_in_open: false, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (closeErr) {
    console.error('[close-session] Error closing check-in:', closeErr);
    return errorResponse(req, 'Failed to close session check-in', 500);
  }

  // 7. Fetch All Eligible Members for this session
  // If committee_id is null: all active memberships in that season.
  // If committee_id is set: active memberships in that committee & season.
  let membersQuery = adminClient
    .from('memberships')
    .select('user_id')
    .eq('season_id', session.season_id)
    .eq('status', 'active');

  if (session.committee_id) {
    membersQuery = membersQuery.eq('committee_id', session.committee_id);
  }

  const { data: eligibleMembers, error: membersErr } = await membersQuery;
  if (membersErr) {
    console.error('[close-session] Error fetching eligible members:', membersErr);
    return errorResponse(req, 'Failed to resolve eligible members', 500);
  }

  const eligibleUserIds = Array.from(new Set((eligibleMembers || []).map((m) => m.user_id)));

  // 8. Fetch Existing Attendance Records for this session
  const { data: existingRecords, error: attErr } = await adminClient
    .from('attendance')
    .select('user_id, status')
    .eq('session_id', sessionId);

  if (attErr) {
    console.error('[close-session] Error fetching existing attendance:', attErr);
    return errorResponse(req, 'Failed to query attendance records', 500);
  }

  const recordedUserIds = new Set((existingRecords || []).map((r) => r.user_id));

  // 9. Fetch Approved Excuse Requests for this session
  const { data: approvedExcuses, error: excuseErr } = await adminClient
    .from('excuse_requests')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('status', 'approved');

  if (excuseErr) {
    console.error('[close-session] Error fetching approved excuses:', excuseErr);
    return errorResponse(req, 'Failed to check excuse requests', 500);
  }

  const approvedExcuseUserIds = new Set((approvedExcuses || []).map((e) => e.user_id));

  // 10. Prepare missing attendance records: 'excused' if approved excuse exists, else 'absent'
  const missingUserIds = eligibleUserIds.filter((uid) => !recordedUserIds.has(uid));
  const newAttendanceRows: Array<{
    session_id: string;
    user_id: string;
    status: 'excused' | 'absent';
    method: 'manual';
    recorded_by: string;
    notes: string;
  }> = [];

  let newlyExcused = 0;
  let newlyAbsent = 0;

  for (const uid of missingUserIds) {
    const isApprovedExcuse = approvedExcuseUserIds.has(uid);
    if (isApprovedExcuse) {
      newlyExcused++;
      newAttendanceRows.push({
        session_id: sessionId,
        user_id: uid,
        status: 'excused',
        method: 'manual',
        recorded_by: callerId,
        notes: 'Auto-recorded from approved excuse request',
      });
    } else {
      newlyAbsent++;
      newAttendanceRows.push({
        session_id: sessionId,
        user_id: uid,
        status: 'absent',
        method: 'manual',
        recorded_by: callerId,
        notes: 'Session closed - marked absent',
      });
    }
  }

  if (newAttendanceRows.length > 0) {
    const { error: insertErr } = await adminClient
      .from('attendance')
      .upsert(newAttendanceRows, { onConflict: 'session_id,user_id', ignoreDuplicates: true });

    if (insertErr) {
      console.error('[close-session] Error inserting attendance defaults:', insertErr);
      return errorResponse(req, 'Failed to record closed attendance values', 500);
    }
  }

  // 11. Phase 9: Apply automated attendance penalties for absent and late members
  let penaltiesApplied: unknown = null;
  try {
    const { data: penaltyData, error: penaltyErr } = await adminClient.rpc(
      'apply_attendance_penalties',
      { p_session: sessionId }
    );
    if (penaltyErr) {
      console.warn('[close-session] apply_attendance_penalties RPC error (continuing):', penaltyErr);
    } else {
      penaltiesApplied = penaltyData;
    }
  } catch (pErr) {
    console.warn('[close-session] Error invoking apply_attendance_penalties:', pErr);
  }

  return json(req, {
    ok: true,
    totalEligible: eligibleUserIds.length,
    alreadyRecorded: recordedUserIds.size,
    newlyExcused,
    newlyAbsent,
    check_in_open: false,
    penalties: penaltiesApplied,
  });
});

