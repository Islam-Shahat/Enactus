import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare,
  Award,
  Calendar,
  Users,
  Shield,
  FileText,
  UserCheck,
  Layers,
  Pin,
  Megaphone,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ROLE_LABELS } from '../../lib/roles';
import StatCard from '../../components/dashboard/StatCard';

export default function DashboardHome() {
  const { profile, roles, user, isSuperAdmin, hasRole } = useAuth();
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const navigate = useNavigate();

  const isHrOrExec = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president']);
  const isHead = hasRole('committee_head');
  const headRoleObj = roles.find((r) => r.role === 'committee_head');
  const headCommitteeId = headRoleObj?.committee_id;

  const displayName =
    (isAr ? (profile?.full_name_ar || profile?.full_name_en) : (profile?.full_name_en || profile?.full_name_ar)) ||
    user?.email?.split('@')[0] || (isAr ? 'عضو' : 'Member');

  const roleBadges = roles.map((r) => ({
    key: r.role,
    label: ROLE_LABELS[r.role]?.[lang] ?? ROLE_LABELS[r.role]?.ar ?? r.role,
  }));

  // 1) Queries for HR / Leadership
  const { data: newAppsCount, isLoading: loadingNewApps } = useQuery({
    queryKey: ['dashboard', 'count', 'new_apps'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');
      if (error) return 0;
      return count ?? 0;
    },
    enabled: isHrOrExec,
  });

  const { data: activeMembersCount, isLoading: loadingMembers } = useQuery({
    queryKey: ['dashboard', 'count', 'active_members'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (error) return 0;
      return count ?? 0;
    },
    enabled: isHrOrExec,
  });

  const { data: totalAppsCount, isLoading: loadingTotalApps } = useQuery({
    queryKey: ['dashboard', 'count', 'total_apps'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count ?? 0;
    },
    enabled: isHrOrExec,
  });

  // 2) Query for Committee Head
  const { data: headAppsCount, isLoading: loadingHeadApps } = useQuery({
    queryKey: ['dashboard', 'count', 'head_apps', headCommitteeId],
    queryFn: async () => {
      let q = supabase.from('applications').select('*', { count: 'exact', head: true });
      if (headCommitteeId) {
        q = q.eq('first_choice_id', headCommitteeId);
      }
      const { count, error } = await q;
      if (error) return 0;
      return count ?? 0;
    },
    enabled: isHead && !isHrOrExec,
  });

  const { data: headMembersCount, isLoading: loadingHeadMembers } = useQuery({
    queryKey: ['dashboard', 'count', 'head_members', headCommitteeId],
    queryFn: async () => {
      let q = supabase.from('memberships').select('*', { count: 'exact', head: true }).eq('status', 'active');
      if (headCommitteeId) {
        q = q.eq('committee_id', headCommitteeId);
      }
      const { count, error } = await q;
      if (error) return 0;
      return count ?? 0;
    },
    enabled: isHead && !isHrOrExec,
  });

  // 3) Common queries for tasks, committee, and attendance
  const { data: openTasksCount, isLoading: loadingTasks } = useQuery({
    queryKey: ['dashboard', 'count', 'open_tasks', user?.id, isHrOrExec],
    queryFn: async () => {
      let q = supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['assigned', 'in_progress']);

      if (!isHrOrExec) {
        q = q.eq('assignee_id', user?.id);
      }
      const { count, error } = await q;
      if (error) return 0;
      return count ?? 0;
    },
    enabled: Boolean(user?.id),
  });

  // My committee name query
  const { data: myMembership } = useQuery({
    queryKey: ['dashboard', 'my_active_membership', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('memberships')
        .select('id, position, status, committees(name_ar, name_en, color)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: Boolean(user?.id),
  });

  const myCommitteeName = myMembership?.committees
    ? isAr
      ? myMembership.committees.name_ar
      : myMembership.committees.name_en
    : isAr
    ? 'غير محدد'
    : 'Not assigned';

  // Member's points score
  const { data: myScore, isLoading: loadingScore } = useQuery({
    queryKey: ['dashboard', 'my_score', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('member_scores')
        .select('total, bonus_total, penalty_total')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: Boolean(user?.id),
  });

  // Pinned Announcements
  const { data: pinnedAnnouncements = [] } = useQuery({
    queryKey: ['dashboard', 'pinned_announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          body,
          published_at,
          committee_id,
          committees (name_ar, name_en)
        `)
        .eq('pinned', true)
        .order('published_at', { ascending: false })
        .limit(2);

      if (error) return [];
      return data || [];
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Card */}
      <div
        className="glass-panel gold-border-glow"
        style={{
          borderRadius: '24px',
          padding: '2.5rem',
          background: 'linear-gradient(135deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.95))',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span className="badge-gold font-cinzel" style={{ fontSize: '0.75rem' }}>
              ENACTUS QENA • PORTAL
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
            {t('dashboardWelcome')}{' '}
            <span className="gold-gradient-text">{displayName}</span>
          </h1>

          <p style={{ color: '#a0a0b2', fontSize: '0.95rem', maxWidth: '650px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {t('dashboardWelcomeDesc')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#c5c5d6', fontWeight: 600 }}>
              {isAr ? 'الأدوار المصرحة:' : 'Authorized Roles:'}
            </span>
            {roleBadges.length > 0 ? (
              roleBadges.map((rb) => (
                <span
                  key={rb.key}
                  className="badge-gold"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Shield size={12} />
                  <span>{rb.label}</span>
                </span>
              ))
            ) : (
              <span className="badge-gold" style={{ fontSize: '0.75rem' }}>
                {isAr ? 'عضو' : 'Member'}
              </span>
            )}

            {profile?.member_code && (
              <span
                style={{
                  background: 'rgba(255, 184, 0, 0.18)',
                  border: '1px solid rgba(255, 184, 0, 0.5)',
                  color: '#ffd54f',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  fontFamily: 'monospace',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  letterSpacing: '1px',
                }}
              >
                <span>🆔 {isAr ? 'كود العضو:' : 'ID:'}</span>
                <span style={{ color: '#fff' }}>{profile.member_code}</span>
              </span>
            )}
          </div>
        </div>

        {/* Ambient background decoration */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(255, 184, 0, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Pinned Announcements Card */}
      {pinnedAnnouncements.length > 0 && (
        <div
          className="glass-panel gold-border-glow"
          style={{
            borderRadius: '20px',
            padding: '1.25rem 1.5rem',
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 184, 0, 0.12), rgba(20, 22, 32, 0.98))'
              : 'rgba(255, 184, 0, 0.12)',
            border: '1.5px solid rgba(255, 184, 0, 0.45)',
            boxShadow: '0 8px 25px rgba(255, 184, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, #d48800, #ffb800)',
                  color: '#000000',
                  padding: '3px 9px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Pin size={13} />
                <span>{isAr ? 'إعلان هام ومثبت' : 'PINNED ANNOUNCEMENT'}</span>
              </span>
              {pinnedAnnouncements[0].committees && (
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffd54f',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {isAr ? pinnedAnnouncements[0].committees.name_ar : pinnedAnnouncements[0].committees.name_en}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard/announcements')}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#ffd54f' : '#b45309',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span>{isAr ? 'عرض كافة الإعلانات' : 'View All'}</span>
              {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
            </button>
          </div>

          <div>
            <h3
              style={{
                margin: '0 0 0.35rem 0',
                fontSize: '1.1rem',
                fontWeight: 800,
                color: isDark ? '#ffffff' : '#111827',
              }}
            >
              {pinnedAnnouncements[0].title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '0.88rem',
                color: isDark ? '#d1d5db' : '#4b5563',
                lineHeight: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {pinnedAnnouncements[0].body}
            </p>
          </div>
        </div>
      )}

      {/* Role-Specific Live Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {isHrOrExec ? (
          <>
            <StatCard
              title={isAr ? 'طلبات التقديم الجديدة' : 'New Applications'}
              value={newAppsCount ?? 0}
              icon={FileText}
              subtitle={isAr ? 'في انتظار المراجعة' : 'Pending review'}
              isLoading={loadingNewApps}
              onClick={() => navigate('/dashboard/applications')}
            />
            <StatCard
              title={isAr ? 'إجمالي الأعضاء النشطين' : 'Active Members'}
              value={activeMembersCount ?? 0}
              icon={Users}
              subtitle={isAr ? 'أعضاء الموسم الحالي' : 'Current season members'}
              isLoading={loadingMembers}
              onClick={() => navigate('/dashboard/members')}
            />
            <StatCard
              title={isAr ? 'إجمالي طلبات التقديم' : 'Total Applications'}
              value={totalAppsCount ?? 0}
              icon={UserCheck}
              subtitle={isAr ? 'مسجلة في قاعدة البيانات' : 'In database'}
              isLoading={loadingTotalApps}
              onClick={() => navigate('/dashboard/applications')}
            />
            <StatCard
              title={isAr ? 'المهام قيد التنفيذ' : 'Open Tasks'}
              value={openTasksCount ?? 0}
              icon={CheckSquare}
              subtitle={isAr ? 'مهام الفريق النشطة' : 'Active team tasks'}
              isLoading={loadingTasks}
            />
          </>
        ) : isHead ? (
          <>
            <StatCard
              title={isAr ? 'طلبات لجنة التابع لها' : 'Committee Applications'}
              value={headAppsCount ?? 0}
              icon={FileText}
              subtitle={isAr ? 'المتقدمون للجنتك' : 'Applicants to your committee'}
              isLoading={loadingHeadApps}
              onClick={() => navigate('/dashboard/applications')}
            />
            <StatCard
              title={isAr ? 'أعضاء لجنتك' : 'Committee Members'}
              value={headMembersCount ?? 0}
              icon={Users}
              subtitle={isAr ? 'الأعضاء النشطين' : 'Active members'}
              isLoading={loadingHeadMembers}
              onClick={() => navigate('/dashboard/members')}
            />
            <StatCard
              title={isAr ? 'المهام المفتوحة' : 'Open Tasks'}
              value={openTasksCount ?? 0}
              icon={CheckSquare}
              subtitle={isAr ? 'مهام قيد التنفيذ' : 'In progress'}
              isLoading={loadingTasks}
            />
            <StatCard
              title={isAr ? 'لجنتك' : 'My Committee'}
              value={myCommitteeName}
              icon={Layers}
              subtitle={isAr ? 'رئيس اللجنة' : 'Committee Head'}
            />
          </>
        ) : (
          <>
            <StatCard
              title={isAr ? 'المهام المعينة لي' : 'My Assigned Tasks'}
              value={openTasksCount ?? 0}
              icon={CheckSquare}
              subtitle={isAr ? 'مهام قيد التنفيذ' : 'In progress'}
              isLoading={loadingTasks}
              onClick={() => navigate('/dashboard/tasks')}
            />
            <StatCard
              title={isAr ? 'لجنتي' : 'My Committee'}
              value={myCommitteeName}
              icon={Users}
              subtitle={
                myMembership?.position
                  ? `${isAr ? 'المنصب: ' : 'Position: '}${myMembership.position}`
                  : null
              }
            />
            <StatCard
              title={isAr ? 'رصيد النقاط' : 'My Points'}
              value={loadingScore ? '...' : (myScore?.total ?? 0)}
              icon={Award}
              subtitle={isAr ? 'عرض سجل النقاط والتظلمات' : 'View ledger & disputes'}
              onClick={() => navigate('/dashboard/points')}
            />
            <StatCard
              title={isAr ? 'لوحة المتصدرين' : 'Leaderboard'}
              value={isAr ? 'المراكز' : 'Ranks'}
              icon={Calendar}
              subtitle={isAr ? 'ترتيب الأعضاء في الموسم' : 'Season member rankings'}
              onClick={() => navigate('/dashboard/leaderboard')}
            />
          </>
        )}
      </div>
    </div>
  );
}
