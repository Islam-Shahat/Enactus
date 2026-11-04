// supabase/functions/convert-application/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse } from '../_shared/http.ts';
import { resolveCommittee } from '../_shared/committees.ts';
import { convertApplicationSchema } from '../_shared/schemas.ts';

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
    console.error('[convert-application] Missing Supabase environment variables');
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
    console.error('[convert-application] Caller auth verification failed:', authError);
    return errorResponse(req, 'Unauthorized user session', 401, 'UNAUTHORIZED');
  }

  const callerId = callerUser.id;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // 3. Explicit Role Check in user_roles
  const ALLOWED_ROLES = ['hr_admin', 'president', 'vice_president', 'super_admin'];
  const { data: callerRoles, error: rolesErr } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId);

  if (rolesErr) {
    console.error('[convert-application] Error checking caller roles:', rolesErr);
    return errorResponse(req, 'Failed to verify caller permissions', 500);
  }

  const hasPermission = callerRoles?.some((r) => ALLOWED_ROLES.includes(r.role));
  if (!hasPermission) {
    return errorResponse(req, 'Forbidden: Insufficient privileges to convert applications.', 403, 'FORBIDDEN');
  }

  // 4. Validate input payload
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse(req, 'Invalid JSON body', 400);
  }

  const parsed = convertApplicationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(req, parsed.error.issues[0]?.message || 'Invalid input parameters', 400, 'VALIDATION_ERROR');
  }
  const { applicationId, committeeSlug, position } = parsed.data;

  // 5. Fetch application record
  const { data: app, error: appErr } = await adminClient
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();

  if (appErr || !app) {
    console.error('[convert-application] Application not found:', appErr);
    return errorResponse(req, 'Application record not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // 6. Idempotent check: if already converted, return existing result
  if (app.converted_user_id) {
    return json(req, {
      ok: true,
      alreadyConverted: true,
      userId: app.converted_user_id,
      status: app.status,
      message: 'Application has already been converted to an active member.',
    });
  }

  // 7. Resolve target committee using code matching helper (no filter injection)
  const { data: allCommittees, error: commErr } = await adminClient
    .from('committees')
    .select('id, slug, name_ar, name_en');

  if (commErr || !allCommittees) {
    console.error('[convert-application] Error querying committees:', commErr);
    return errorResponse(req, 'Failed to query committees', 500);
  }

  const targetCommittee = resolveCommittee(committeeSlug, allCommittees);
  if (!targetCommittee) {
    console.error('[convert-application] Committee not found for input:', committeeSlug);
    return errorResponse(req, `Committee not found for: ${committeeSlug}`, 400, 'COMMITTEE_NOT_FOUND');
  }
  const committeeId = targetCommittee.id;

  // 8. Resolve active season
  const { data: activeSeason, error: seasonErr } = await adminClient
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (seasonErr) {
    console.warn('[convert-application] Error querying active season:', seasonErr);
  }
  const seasonId = activeSeason?.id || app.season_id;

  // 9. Find or create auth user (Safe Order)
  let authUserId: string | null = null;
  let isNewAuthUser = false;

  const candidateEmail = app.email.toLowerCase().trim();

  try {
    // Check if user already exists in profile_private
    const { data: existingProfile } = await adminClient
      .from('profile_private')
      .select('user_id')
      .eq('email', candidateEmail)
      .maybeSingle();

    if (existingProfile?.user_id) {
      authUserId = existingProfile.user_id;
    } else {
      // Check auth.users with paginated lookup (200 per page, up to 20 pages)
      const MAX_PAGES = 20;
      const PER_PAGE = 200;
      for (let page = 1; page <= MAX_PAGES; page++) {
        const { data: authList, error: listErr } = await adminClient.auth.admin.listUsers({
          page,
          perPage: PER_PAGE,
        });
        if (listErr || !authList?.users?.length) break;
        const found = authList.users.find((u) => u.email?.toLowerCase().trim() === candidateEmail);
        if (found) {
          authUserId = found.id;
          break;
        }
        if (authList.users.length < PER_PAGE) break;
      }
    }

    if (!authUserId) {
      // Create new user by sending invite email
      const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';
      const redirectTo = `${siteUrl.replace(/\/$/, '')}/reset-password`;

      const { data: inviteRes, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        candidateEmail,
        { redirectTo }
      );

      if (inviteErr || !inviteRes?.user) {
        console.error('[convert-application] Error inviting candidate:', inviteErr);
        return errorResponse(req, 'Failed to create user account for candidate', 500, 'USER_CREATION_FAILED');
      }

      authUserId = inviteRes.user.id;
      isNewAuthUser = true;
    }

    // 10. Update profiles & profile_private
    const { error: profileErr } = await adminClient.from('profiles').upsert({
      id: authUserId,
      full_name_ar: app.full_name,
      full_name_en: app.full_name,
      status: 'active',
      locale: 'ar',
    });
    if (profileErr) throw profileErr;

    const { error: privateErr } = await adminClient.from('profile_private').upsert({
      user_id: authUserId,
      email: candidateEmail,
      phone: app.phone,
      university_id: app.university_id,
      faculty: app.faculty,
      study_year: app.study_year,
    });
    if (privateErr) throw privateErr;

    // 11. Insert memberships for the ACTIVE season and chosen committee
    const { error: memberErr } = await adminClient.from('memberships').upsert(
      {
        user_id: authUserId,
        season_id: seasonId,
        committee_id: committeeId,
        position: position || 'member',
        status: 'active',
        joined_at: new Date().toISOString().split('T')[0],
      },
      { onConflict: 'user_id,season_id,committee_id' }
    );
    if (memberErr) throw memberErr;

    // 12. Insert user_roles: Select-then-insert of one global member role (tolerating 23505 unique violation)
    // The table unique index is an expression index on (user_id, role, coalesce(committee_id, ...)),
    // so ON CONFLICT on column names is rejected by PostgreSQL.
    const { data: existingRole } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', authUserId)
      .eq('role', 'member')
      .maybeSingle();

    if (!existingRole) {
      const { error: roleErr } = await adminClient.from('user_roles').insert({
        user_id: authUserId,
        role: 'member',
        committee_id: null,
        season_id: seasonId,
        granted_by: callerId,
      });

      if (roleErr && roleErr.code !== '23505') {
        throw roleErr;
      }
    }

    // 13. Update application (status accepted, converted_user_id, reviewed_by)
    const { error: updateAppErr } = await adminClient
      .from('applications')
      .update({
        status: 'accepted',
        converted_user_id: authUserId,
        reviewed_by: callerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);
    if (updateAppErr) throw updateAppErr;

    // 14. Insert notification for the caller
    await adminClient.from('notifications').insert({
      user_id: callerId,
      type: 'application_converted',
      title: 'تم تحويل المتقدم إلى عضو بنجاح',
      body: `تم تحويل ${app.full_name} إلى عضو في لجنة ${targetCommittee.name_ar || targetCommittee.slug}.`,
      data: {
        application_id: applicationId,
        converted_user_id: authUserId,
        committee_id: committeeId,
      },
    });

    return json(req, {
      ok: true,
      userId: authUserId,
      committeeId,
      seasonId,
      isNewUser: isNewAuthUser,
      message: 'Application converted to active member successfully',
    });
  } catch (err) {
    console.error('[convert-application] Transaction step error:', err);
    // Cleanup newly invited user if transaction failed midway
    if (isNewAuthUser && authUserId) {
      try {
        await adminClient.auth.admin.deleteUser(authUserId);
      } catch (delErr) {
        console.error('[convert-application] Failed to rollback created auth user:', delErr);
      }
    }
    return errorResponse(req, 'Failed to complete member conversion', 500);
  }
});
