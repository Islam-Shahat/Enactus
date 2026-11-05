// supabase/functions/create-member/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse } from '../_shared/http.ts';
import { createMemberSchema } from '../_shared/schemas.ts';

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
    console.error('[create-member] Missing Supabase environment variables');
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
    console.error('[create-member] Caller auth verification failed:', authError);
    return errorResponse(req, 'Unauthorized user session', 401, 'UNAUTHORIZED');
  }

  const callerId = callerUser.id;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // 3. Explicit Role Check in user_roles (System Admin & HR only)
  const ALLOWED_ROLES = ['hr_admin', 'president', 'vice_president', 'super_admin'];
  const { data: callerRoles, error: rolesErr } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId);

  if (rolesErr) {
    console.error('[create-member] Error checking caller roles:', rolesErr);
    return errorResponse(req, 'Failed to verify caller permissions', 500);
  }

  const hasPermission = callerRoles?.some((r) => ALLOWED_ROLES.includes(r.role));
  if (!hasPermission) {
    return errorResponse(req, 'Forbidden: Insufficient privileges to add members.', 403, 'FORBIDDEN');
  }

  // 4. Validate input payload
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse(req, 'Invalid JSON body', 400);
  }

  const parsed = createMemberSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(
      req,
      parsed.error.issues[0]?.message || 'Invalid input parameters',
      400,
      'VALIDATION_ERROR'
    );
  }

  const {
    fullNameAr,
    fullNameEn,
    nationalId,
    phone,
    email: rawEmail,
    committeeId,
    position,
    faculty,
    studyYear,
    birthDate,
    gender,
    governorate,
    seasonId: requestedSeasonId,
  } = parsed.data;

  // 5. Check if a member with this National ID already exists
  const { data: existingNationalId } = await adminClient
    .from('profile_private')
    .select('user_id, national_id')
    .eq('national_id', nationalId)
    .maybeSingle();

  if (existingNationalId) {
    return errorResponse(
      req,
      'يوجد عضو مسجل بالفعل بنفس الرقم القومي',
      409,
      'MEMBER_ALREADY_EXISTS'
    );
  }

  // 6. Resolve active season
  let seasonId = requestedSeasonId;
  let seasonYear = '2026';

  const { data: activeSeason, error: seasonErr } = await adminClient
    .from('seasons')
    .select('id, name')
    .eq('is_active', true)
    .maybeSingle();

  if (!seasonErr && activeSeason) {
    seasonId = seasonId || activeSeason.id;
    const yearMatch = activeSeason.name?.match(/\d{4}/);
    if (yearMatch) {
      seasonYear = yearMatch[0];
    }
  } else {
    seasonYear = String(new Date().getFullYear());
  }

  if (!seasonId) {
    // Fallback to most recent season
    const { data: latestSeason } = await adminClient
      .from('seasons')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    seasonId = latestSeason?.id;
  }

  if (!seasonId) {
    return errorResponse(req, 'No active season found', 400, 'NO_ACTIVE_SEASON');
  }

  // 7. Verify Committee exists
  const { data: targetCommittee, error: commErr } = await adminClient
    .from('committees')
    .select('id, slug, name_ar, name_en')
    .eq('id', committeeId)
    .maybeSingle();

  if (commErr || !targetCommittee) {
    return errorResponse(req, 'اللجنة المختارة غير موجودة', 404, 'COMMITTEE_NOT_FOUND');
  }

  // 8. Generate next sequential 7-digit Member Code (e.g. 2026001)
  const { data: generatedCode, error: codeErr } = await adminClient.rpc(
    'generate_next_member_code',
    { p_season_year: seasonYear }
  );

  let memberCode = generatedCode;
  if (codeErr || !memberCode) {
    console.warn('[create-member] RPC code generation fallback:', codeErr);
    // Manual query fallback
    const { data: maxProfile } = await adminClient
      .from('profiles')
      .select('member_code')
      .like('member_code', `${seasonYear}%`)
      .order('member_code', { ascending: false })
      .limit(1)
      .maybeSingle();

    let seq = 1;
    if (maxProfile?.member_code && maxProfile.member_code.length === 7) {
      const parsedSeq = parseInt(maxProfile.member_code.substring(4), 10);
      if (!isNaN(parsedSeq)) seq = parsedSeq + 1;
    }
    memberCode = `${seasonYear}${String(seq).padStart(3, '0')}`;
  }

  // 9. Determine Auth login email
  // If no email provided, create a portal alias email using the 7-digit member code
  const candidateEmail = rawEmail
    ? rawEmail.toLowerCase().trim()
    : `${memberCode}@portal.enactusqena.org`;

  // 10. Create user in Supabase Auth
  // Password is the 14-digit National ID as requested!
  const { data: authCreated, error: createAuthErr } = await adminClient.auth.admin.createUser({
    email: candidateEmail,
    password: nationalId,
    email_confirm: true,
    user_metadata: {
      member_code: memberCode,
      national_id: nationalId,
      full_name_ar: fullNameAr,
      full_name_en: fullNameEn || fullNameAr,
      governorate: governorate || null,
    },
  });

  if (createAuthErr || !authCreated?.user) {
    console.error('[create-member] Failed to create auth user:', createAuthErr);
    return errorResponse(
      req,
      `فشل إنشاء حساب العضو: ${createAuthErr?.message || 'خطأ غير متوقع'}`,
      500,
      'AUTH_USER_CREATION_FAILED'
    );
  }

  const newUserId = authCreated.user.id;

  try {
    // 11. Insert Profile
    const { error: profileErr } = await adminClient.from('profiles').upsert({
      id: newUserId,
      full_name_ar: fullNameAr,
      full_name_en: fullNameEn || fullNameAr,
      member_code: memberCode,
      status: 'active',
      locale: 'ar',
    });
    if (profileErr) throw profileErr;

    // 12. Insert Profile Private
    const { error: privateErr } = await adminClient.from('profile_private').upsert({
      user_id: newUserId,
      email: candidateEmail,
      phone: phone || null,
      national_id: nationalId,
      faculty: faculty || null,
      study_year: studyYear || 1,
      birth_date: birthDate || null,
      gender: gender || null,
      governorate: governorate || null,
    });
    if (privateErr) throw privateErr;

    // 13. Insert Season Membership
    const { error: memberErr } = await adminClient.from('memberships').upsert(
      {
        user_id: newUserId,
        season_id: seasonId,
        committee_id: committeeId,
        position: position || 'member',
        status: 'active',
        joined_at: new Date().toISOString().split('T')[0],
      },
      { onConflict: 'user_id,season_id,committee_id' }
    );
    if (memberErr) throw memberErr;

    // 14. Assign User Role (Select-then-insert of assigned role)
    // The table unique index is an expression index on (user_id, role, coalesce(committee_id, ...)),
    // so PostgREST onConflict: 'user_id,role' fails because no raw column constraint matches.
    const assignedRole = position === 'head' ? 'committee_head' : 'member';
    const roleCommitteeId = assignedRole === 'committee_head' ? committeeId : null;

    const { data: existingRole } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', newUserId)
      .eq('role', assignedRole)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleErr } = await adminClient.from('user_roles').insert({
        user_id: newUserId,
        role: assignedRole,
        committee_id: roleCommitteeId,
        season_id: seasonId,
        granted_by: callerId,
      });
      if (roleErr && roleErr.code !== '23505') throw roleErr;
    }

    // 15. Award Welcome Points (+50 points)
    const { error: pointErr } = await adminClient.from('point_entries').insert({
      user_id: newUserId,
      season_id: seasonId,
      committee_id: committeeId,
      type: 'bonus',
      value: 50,
      reason: 'نقاط ترحيبية بالانضمام إلى مجتمع إيناكوس قنا',
      source: 'manual',
      given_by: callerId,
    });
    if (pointErr) {
      console.warn('[create-member] Welcome points bonus skipped:', pointErr);
    }

    return json(req, {
      ok: true,
      memberCode,
      userId: newUserId,
      nationalId,
      email: candidateEmail,
      fullNameAr,
      committeeNameAr: targetCommittee.name_ar,
      message: `تمت إضافة العضو بنجاح! كود العضو: ${memberCode} وكلمة المرور هي الرقم القومي (${nationalId}).`,
    });
  } catch (err: unknown) {
    console.error('[create-member] Cleanup rollback after DB error:', err);
    // Cleanup created auth user on failure
    await adminClient.auth.admin.deleteUser(newUserId).catch(() => {});
    const postgrestErr = err as { message?: string; details?: string; hint?: string; code?: string };
    const msg = postgrestErr?.message || (err instanceof Error ? err.message : '') || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || 'Database insertion error';
    return errorResponse(req, `حدث خطأ أثناء حفظ بيانات العضو: ${msg}`, 500);
  }
});

