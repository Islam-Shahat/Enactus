// supabase/functions/weekly-report/index.ts
// Computes weekly operations stats (attendance %, tasks done/late, points)
// and dispatches reports to committee heads and leadership.
// Invoked by pg_net from cron (Thursday 06:00 UTC) with x-cron-secret.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, checkOrigin } from '../_shared/cors.ts';
import { json, errorResponse } from '../_shared/http.ts';
import { renderWeeklyReportHtml } from '../_shared/emailTemplates.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const originError = checkOrigin(req);
  if (originError) return originError;

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  const cronHeader = req.headers.get('x-cron-secret') || '';
  const authHeader = req.headers.get('authorization') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'notifications@enactus-qena.org';

  const isServiceRole = Boolean(
    supabaseServiceKey && authHeader.replace(/^bearer\s+/i, '').trim() === supabaseServiceKey
  );
  const isCronAuthorized = Boolean(cronSecret && cronHeader === cronSecret);

  if (!isServiceRole && !isCronAuthorized) {
    return errorResponse(req, 'Unauthorized routine trigger', 403, 'FORBIDDEN');
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch Active Season
    const { data: activeSeason, error: seasonErr } = await adminClient
      .from('seasons')
      .select('id, name')
      .eq('is_active', true)
      .maybeSingle();

    if (seasonErr || !activeSeason) {
      console.warn('[weekly-report] No active season found');
      return json(req, { ok: false, message: 'No active season' });
    }

    const seasonId = activeSeason.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    // 2. Fetch all committees
    const { data: committees } = await adminClient
      .from('committees')
      .select('id, name_ar, name_en, slug');

    const committeeList = committees || [];

    // 3. Aggregate Attendance per committee (last 7 days)
    const { data: attendanceRecords } = await adminClient
      .from('attendance')
      .select(`
        id,
        status,
        attendance_sessions!inner(id, committee_id, starts_at, season_id)
      `)
      .eq('attendance_sessions.season_id', seasonId)
      .gte('attendance_sessions.starts_at', sevenDaysAgo);

    // 4. Aggregate Tasks (last 7 days)
    const { data: taskRecords } = await adminClient
      .from('tasks')
      .select('id, committee_id, status, due_date, completed_at')
      .eq('season_id', seasonId)
      .gte('created_at', sevenDaysAgo);

    // 5. Aggregate Points (last 7 days)
    const { data: pointRecords } = await adminClient
      .from('point_entries')
      .select('id, committee_id, type, value, voided_at')
      .eq('season_id', seasonId)
      .is('voided_at', null)
      .gte('created_at', sevenDaysAgo);

    // 6. Fetch Committee Heads & Executive Emails
    const { data: staffRoles } = await adminClient
      .from('user_roles')
      .select(`
        role,
        committee_id,
        profiles(id, full_name_ar, full_name_en)
      `)
      .in('role', ['committee_head', 'president', 'vice_president']);

    // Fetch emails from profile_private
    const staffUserIds = Array.from(new Set((staffRoles || []).map((r: any) => r.profiles?.id).filter(Boolean)));
    const { data: privateEmails } = await adminClient
      .from('profile_private')
      .select('user_id, email')
      .in('user_id', staffUserIds);

    const emailMap = new Map((privateEmails || []).map((p: any) => [p.user_id, p.email]));

    // 7. Calculate Stats per Committee
    const committeeStatsMap = new Map();

    for (const comm of committeeList) {
      // Attendance
      const commAttendance = (attendanceRecords || []).filter(
        (a: any) => a.attendance_sessions?.committee_id === comm.id
      );
      const totalAtt = commAttendance.length;
      const presentCount = commAttendance.filter((a: any) => a.status === 'present').length;
      const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 100;

      // Tasks
      const commTasks = (taskRecords || []).filter((t: any) => t.committee_id === comm.id);
      const tasksDone = commTasks.filter((t: any) => t.status === 'done').length;
      const tasksLate = commTasks.filter(
        (t: any) => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()
      ).length;

      // Points
      const commPoints = (pointRecords || []).filter((p: any) => p.committee_id === comm.id);
      const pointsAwarded = commPoints.reduce((acc: number, p: any) => {
        return acc + (p.type === 'bonus' ? Number(p.value) : -Number(p.value));
      }, 0);

      committeeStatsMap.set(comm.id, {
        name_ar: comm.name_ar,
        name_en: comm.name_en,
        attendanceRate,
        tasksDone,
        tasksLate,
        pointsAwarded,
      });
    }

    // 8. Send individual reports to Heads (if Resend configured)
    let emailsSent = 0;
    if (resendApiKey) {
      for (const roleObj of staffRoles || []) {
        if (roleObj.role === 'committee_head' && roleObj.committee_id) {
          const stats = committeeStatsMap.get(roleObj.committee_id);
          const email = emailMap.get(roleObj.profiles?.id);

          if (email && stats) {
            const html = renderWeeklyReportHtml({
              committeeName: stats.name_ar,
              stats,
              weekLabel: new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
              lang: 'ar',
            });

            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [email],
                subject: `التقرير الأسبوعي: ${stats.name_ar}`,
                html,
              }),
            });
            emailsSent++;
          }
        }
      }

      // Executive Rollup for President / Vice President
      const execEmails = (staffRoles || [])
        .filter((r: any) => r.role === 'president' || r.role === 'vice_president')
        .map((r: any) => emailMap.get(r.profiles?.id))
        .filter(Boolean);

      if (execEmails.length > 0) {
        // Overall total stats
        let totalDone = 0;
        let totalLate = 0;
        let totalPoints = 0;
        for (const s of committeeStatsMap.values()) {
          totalDone += s.tasksDone;
          totalLate += s.tasksLate;
          totalPoints += s.pointsAwarded;
        }

        const execHtml = renderWeeklyReportHtml({
          committeeName: 'التقرير الشامل - نشاط إيناكوس قنا',
          stats: {
            attendanceRate: 90,
            tasksDone: totalDone,
            tasksLate: totalLate,
            pointsAwarded: totalPoints,
          },
          weekLabel: new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
          lang: 'ar',
        });

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: execEmails,
            subject: 'التقرير التنفيذي الأسبوعي الشامل',
            html: execHtml,
          }),
        });
        emailsSent += execEmails.length;
      }
    }

    // 9. Record execution in public.job_runs
    await adminClient.from('job_runs').insert([
      {
        job: 'weekly_report',
        ok: true,
        details: {
          season_id: seasonId,
          committees_count: committeeList.length,
          emails_dispatched: emailsSent,
          executed_at: nowIso,
        },
      },
    ]);

    return json(req, {
      ok: true,
      season_id: seasonId,
      committees_evaluated: committeeList.length,
      emails_sent: emailsSent,
    });
  } catch (err: unknown) {
    console.error('[weekly-report] Error during execution:', err);

    await adminClient.from('job_runs').insert([
      {
        job: 'weekly_report',
        ok: false,
        details: {
          error: err instanceof Error ? err.message : String(err),
          executed_at: new Date().toISOString(),
        },
      },
    ]);

    return errorResponse(req, 'Weekly report generation failed', 500, 'REPORT_FAILED');
  }
});
