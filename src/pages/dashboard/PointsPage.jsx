// src/pages/dashboard/PointsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import DataTable from '../../components/dashboard/DataTable';
import StatCard from '../../components/dashboard/StatCard';
import StatusBadge from '../../components/dashboard/StatusBadge';
import EmptyState from '../../components/dashboard/EmptyState';
import DisputeModal from '../../components/dashboard/DisputeModal';
import GivePointsModal from '../../components/dashboard/GivePointsModal';
import VoidPointDialog from '../../components/dashboard/VoidPointDialog';
import ResolveDisputeDialog from '../../components/dashboard/ResolveDisputeDialog';
import PointRuleModal from '../../components/dashboard/PointRuleModal';
import { isDisputeEligible, getRemainingDisputeTime } from '../../lib/pointHelpers';
import {
  Award,
  PlusCircle,
  MinusCircle,
  Plus,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Settings,
  Scale,
  Layers,
} from 'lucide-react';

const PAGE_SIZE = 10;

export default function PointsPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';

  const isHrOrExec = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president']);
  const isHead = hasRole('committee_head');
  const canGive = isHrOrExec || isHead;

  // Active Tab: 'my_points' | 'management' | 'disputes_queue' | 'rules'
  const [activeTab, setActiveTab] = useState('my_points');

  // Modals state
  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [entryToDispute, setEntryToDispute] = useState(null);
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [entryToVoid, setEntryToVoid] = useState(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [disputeToResolve, setDisputeToResolve] = useState(null);
  const [resolveActionType, setResolveActionType] = useState('accept');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState(null);

  // Pagination & Filters
  const [myEntriesPage, setMyEntriesPage] = useState(1);
  const [myTypeFilter, setMyTypeFilter] = useState('all');
  const [allEntriesPage, setAllEntriesPage] = useState(1);
  const [allSearch, setAllSearch] = useState('');
  const [allCommitteeFilter, setAllCommitteeFilter] = useState('all');

  // 1. Fetch Active Season
  const { data: activeSeason } = useQuery({
    queryKey: ['dashboard', 'active-season'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, is_active')
        .eq('is_active', true)
        .maybeSingle();
      if (error || !data) {
        const { data: fallback } = await supabase
          .from('seasons')
          .select('id, name, is_active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return fallback ? { ...fallback, name_ar: fallback.name, name_en: fallback.name } : null;
      }
      return { ...data, name_ar: data.name, name_en: data.name };
    },
    staleTime: 10 * 60 * 1000,
  });

  // 2. Fetch Committees
  const { data: committees = [] } = useQuery({
    queryKey: ['dashboard', 'committees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committees')
        .select('id, slug, name_ar, name_en, color')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // 3. Fetch My Score (from member_scores)
  const { data: myScore, isLoading: loadingScore } = useQuery({
    queryKey: ['dashboard', 'my_scores', user?.id, activeSeason?.id],
    queryFn: async () => {
      if (!user?.id || !activeSeason?.id) return { bonus_total: 0, penalty_total: 0, total: 0 };
      const { data, error } = await supabase
        .from('member_scores')
        .select('*')
        .eq('user_id', user.id)
        .eq('season_id', activeSeason.id)
        .maybeSingle();
      if (error) return { bonus_total: 0, penalty_total: 0, total: 0 };
      return data || { bonus_total: 0, penalty_total: 0, total: 0 };
    },
    enabled: Boolean(user?.id && activeSeason?.id),
  });

  // 4. Fetch My Point Entries (with disputes)
  const { data: myEntriesData, isLoading: loadingMyEntries } = useQuery({
    queryKey: ['dashboard', 'my_point_entries', user?.id, myEntriesPage, myTypeFilter],
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };
      const from = (myEntriesPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from('point_entries')
        .select(`
          id,
          season_id,
          committee_id,
          type,
          value,
          reason,
          source,
          source_id,
          created_at,
          voided_at,
          void_reason,
          point_disputes (
            id,
            status,
            reason,
            response,
            created_at
          )
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (myTypeFilter !== 'all') {
        q = q.eq('type', myTypeFilter);
      }

      const { data, count, error } = await q;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: Boolean(user?.id),
  });

  // 5. Fetch Disputes Queue (for leadership)
  const { data: disputesQueue = [], isLoading: loadingDisputes } = useQuery({
    queryKey: ['dashboard', 'disputes_queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('point_disputes')
        .select(`
          id,
          point_entry_id,
          user_id,
          reason,
          status,
          created_at,
          profiles (
            full_name_ar,
            full_name_en,
            avatar_url
          ),
          point_entries (
            id,
            type,
            value,
            reason,
            source,
            created_at
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isHrOrExec,
  });

  // 6. Fetch Point Rules List (for admin)
  const { data: pointRulesList = [], isLoading: loadingRules } = useQuery({
    queryKey: ['dashboard', 'point_rules_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('point_rules')
        .select('*')
        .order('is_auto', { ascending: true })
        .order('type', { ascending: true })
        .order('code', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isHrOrExec,
  });

  // 7. Fetch All Point Entries (for Leadership Management)
  const { data: allEntriesData, isLoading: loadingAllEntries } = useQuery({
    queryKey: ['dashboard', 'all_point_entries', allEntriesPage, allCommitteeFilter, allSearch],
    queryFn: async () => {
      const from = (allEntriesPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from('point_entries')
        .select(`
          id,
          user_id,
          season_id,
          committee_id,
          type,
          value,
          reason,
          source,
          created_at,
          voided_at,
          void_reason,
          profiles (
            full_name_ar,
            full_name_en,
            avatar_url
          ),
          committees (
            name_ar,
            name_en,
            color
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (allCommitteeFilter !== 'all') {
        q = q.eq('committee_id', allCommitteeFilter);
      }

      if (allSearch.trim()) {
        q = q.ilike('reason', `%${allSearch.trim()}%`);
      }

      const { data, count, error } = await q;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: isHrOrExec,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner & Header */}
      <div
        className="glass-panel gold-border-glow"
        dir={dir}
        style={{
          borderRadius: '24px',
          padding: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          background: isDark
            ? 'linear-gradient(135deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.95))'
            : 'rgba(255, 255, 255, 0.95)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Award size={26} color="#ffb800" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>
              {isAr ? 'نظام النقاط والمكافآت' : 'Points & Performance Ledger'}
            </h1>
          </div>
          <p style={{ margin: 0, color: isDark ? '#a0a0b2' : '#6b7280', fontSize: '0.95rem' }}>
            {isAr
              ? 'سجل تقييم الأداء والمكافآت والخصومات المعتمدة لكتيبة إيناكتس قنا'
              : 'Performance recognition, bonuses, penalties and ledger transparency'}
          </p>
        </div>

        {canGive && (
          <button
            type="button"
            onClick={() => setIsGiveModalOpen(true)}
            className="btn-primary"
            style={{
              padding: '0.75rem 1.4rem',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
            }}
          >
            <Plus size={18} />
            <span>{isAr ? 'منح / خصم نقاط' : 'Give / Deduct Points'}</span>
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: isDark ? '1px solid rgba(255, 184, 0, 0.15)' : '1px solid rgba(217, 119, 6, 0.15)',
          paddingBottom: '0.5rem',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('my_points')}
          className={`tab-btn ${activeTab === 'my_points' ? 'active font-bold' : ''}`}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'my_points' ? (isDark ? 'rgba(255, 184, 0, 0.15)' : '#fef3c7') : 'transparent',
            color: activeTab === 'my_points' ? (isDark ? '#ffd54f' : '#b45309') : isDark ? '#aaa' : '#666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600,
          }}
        >
          <Award size={18} />
          <span>{isAr ? 'سجل نقاطي' : 'My Points'}</span>
        </button>

        {isHrOrExec && (
          <button
            type="button"
            onClick={() => setActiveTab('management')}
            className={`tab-btn ${activeTab === 'management' ? 'active font-bold' : ''}`}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'management' ? (isDark ? 'rgba(255, 184, 0, 0.15)' : '#fef3c7') : 'transparent',
              color: activeTab === 'management' ? (isDark ? '#ffd54f' : '#b45309') : isDark ? '#aaa' : '#666',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
            }}
          >
            <Layers size={18} />
            <span>{isAr ? 'إدارة السجل العام' : 'Ledger Management'}</span>
          </button>
        )}

        {isHrOrExec && (
          <button
            type="button"
            onClick={() => setActiveTab('disputes_queue')}
            className={`tab-btn ${activeTab === 'disputes_queue' ? 'active font-bold' : ''}`}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'disputes_queue' ? (isDark ? 'rgba(255, 184, 0, 0.15)' : '#fef3c7') : 'transparent',
              color: activeTab === 'disputes_queue' ? (isDark ? '#ffd54f' : '#b45309') : isDark ? '#aaa' : '#666',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
              position: 'relative',
            }}
          >
            <Scale size={18} />
            <span>{isAr ? 'طابور التظلمات' : 'Disputes Queue'}</span>
            {disputesQueue.length > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                }}
              >
                {disputesQueue.length}
              </span>
            )}
          </button>
        )}

        {isHrOrExec && (
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`tab-btn ${activeTab === 'rules' ? 'active font-bold' : ''}`}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'rules' ? (isDark ? 'rgba(255, 184, 0, 0.15)' : '#fef3c7') : 'transparent',
              color: activeTab === 'rules' ? (isDark ? '#ffd54f' : '#b45309') : isDark ? '#aaa' : '#666',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
            }}
          >
            <Settings size={18} />
            <span>{isAr ? 'قواعد النقاط' : 'Point Rules'}</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MY POINTS                                                          */}
      {/* ========================================================================= */}
      {activeTab === 'my_points' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Member Score Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <StatCard
              title={isAr ? 'إجمالي رصيد النقاط' : 'Total Score'}
              value={loadingScore ? '...' : myScore?.total ?? 0}
              icon={Award}
              color="gold"
              description={
                isAr
                  ? activeSeason ? `الموسم: ${activeSeason.name_ar}` : 'الموسم الحالي'
                  : activeSeason ? `Season: ${activeSeason.name_en}` : 'Current Season'
              }
            />
            <StatCard
              title={isAr ? 'مجموع المكافآت (+)' : 'Bonus Points (+)'}
              value={loadingScore ? '...' : `+${myScore?.bonus_total ?? 0}`}
              icon={PlusCircle}
              color="emerald"
              description={isAr ? 'نقاط التميز والمهام' : 'Bonuses and task points'}
            />
            <StatCard
              title={isAr ? 'مجموع الخصومات (-)' : 'Penalty Deductions (-)'}
              value={loadingScore ? '...' : `-${myScore?.penalty_total ?? 0}`}
              icon={MinusCircle}
              color="rose"
              description={isAr ? 'الغياب والتأخير' : 'Absences and penalties'}
            />
          </div>

          {/* Points Ledger Table */}
          <div
            className="glass-panel gold-border-glow"
            dir={dir}
            style={{
              borderRadius: '20px',
              padding: '1.5rem',
              background: isDark ? 'rgba(22, 24, 34, 0.85)' : '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  {isAr ? 'سجل العمليات والقيود' : 'Points Ledger'}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: isDark ? '#aaa' : '#666' }}>
                  {isAr
                    ? 'يمكنك تقديم تظلم على أي خصم خلال 48 ساعة فقط من تسجيله'
                    : 'Disputes can be submitted within 48 hours of penalty deduction'}
                </p>
              </div>

              {/* Filter */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={myTypeFilter}
                  onChange={(e) => {
                    setMyTypeFilter(e.target.value);
                    setMyEntriesPage(1);
                  }}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                    border: isDark ? '1px solid rgba(255,184,0,0.3)' : '1px solid #d1d5db',
                    color: isDark ? '#fff' : '#111',
                    fontSize: '0.88rem',
                  }}
                >
                  <option value="all" style={{ background: isDark ? '#181920' : '#fff' }}>
                    {isAr ? 'جميع القيود' : 'All Types'}
                  </option>
                  <option value="bonus" style={{ background: isDark ? '#181920' : '#fff' }}>
                    {isAr ? 'مكافآت فقط (+)' : 'Bonus Only'}
                  </option>
                  <option value="penalty" style={{ background: isDark ? '#181920' : '#fff' }}>
                    {isAr ? 'خصومات فقط (-)' : 'Penalties Only'}
                  </option>
                </select>
              </div>
            </div>

            <DataTable
              columns={[
                {
                  key: 'created_at',
                  header: isAr ? 'التاريخ والوقت' : 'Date & Time',
                  render: (row) => (
                    <span style={{ fontSize: '0.85rem', color: isDark ? '#bbb' : '#555' }}>
                      {new Date(row.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  ),
                },
                {
                  key: 'type',
                  header: isAr ? 'النوع' : 'Type',
                  render: (row) => (
                    <StatusBadge
                      status={row.type}
                      label={
                        row.type === 'bonus'
                          ? isAr ? 'مكافأة' : 'Bonus'
                          : isAr ? 'خصم' : 'Penalty'
                      }
                    />
                  ),
                },
                {
                  key: 'value',
                  header: isAr ? 'النقاط' : 'Value',
                  render: (row) => {
                    const isVoided = Boolean(row.voided_at);
                    const color = isVoided ? '#888' : row.type === 'bonus' ? '#22c55e' : '#ef4444';
                    return (
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          color,
                          textDecoration: isVoided ? 'line-through' : 'none',
                        }}
                      >
                        {row.type === 'bonus' ? `+${row.value}` : `-${row.value}`}
                      </span>
                    );
                  },
                },
                {
                  key: 'reason',
                  header: isAr ? 'السبب والبيان' : 'Reason / Note',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: 600, color: isDark ? '#fff' : '#111' }}>
                        {row.reason}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: isDark ? '#888' : '#777', marginTop: '0.2rem' }}>
                        {isAr ? 'المصدر:' : 'Source:'} {row.source}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: isAr ? 'الحالة / التظلم' : 'Status / Dispute',
                  render: (row) => {
                    if (row.voided_at) {
                      return (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span
                            style={{
                              background: 'rgba(107, 114, 128, 0.15)',
                              color: isDark ? '#9ca3af' : '#4b5563',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            {isAr ? 'ملغاة (Voided)' : 'Voided'}
                          </span>
                          {row.void_reason && (
                            <span style={{ fontSize: '0.72rem', color: isDark ? '#aaa' : '#777' }}>
                              {row.void_reason}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // Check if dispute exists
                    const dispute = row.point_disputes?.[0];
                    if (dispute) {
                      return (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <StatusBadge
                            status={
                              dispute.status === 'pending'
                                ? 'in_progress'
                                : dispute.status === 'accepted'
                                ? 'done'
                                : 'cancelled'
                            }
                            label={
                              dispute.status === 'pending'
                                ? isAr ? 'قيد المراجعة' : 'Under Review'
                                : dispute.status === 'accepted'
                                ? isAr ? 'تظلم مقبول' : 'Accepted'
                                : isAr ? 'تظلم مرفوض' : 'Rejected'
                            }
                          />
                          {dispute.response && (
                            <span style={{ fontSize: '0.72rem', color: isDark ? '#bbb' : '#666' }}>
                              {dispute.response}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // If penalty and eligible for dispute within 48h
                    if (isDisputeEligible(row)) {
                      const remaining = getRemainingDisputeTime(row.created_at);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEntryToDispute(row);
                              setIsDisputeModalOpen(true);
                            }}
                            style={{
                              background: isDark ? 'rgba(255, 184, 0, 0.15)' : '#fef3c7',
                              border: isDark ? '1px solid rgba(255, 184, 0, 0.4)' : '1px solid #f59e0b',
                              color: isDark ? '#ffd54f' : '#b45309',
                              padding: '0.3rem 0.65rem',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <Scale size={13} />
                            <span>{isAr ? 'تقديم تظلم' : 'Dispute'}</span>
                          </button>
                          <span style={{ fontSize: '0.72rem', color: '#ffb800' }}>
                            {remaining.hours}h {remaining.minutes}m
                          </span>
                        </div>
                      );
                    }

                    return (
                      <span style={{ fontSize: '0.8rem', color: isDark ? '#666' : '#999' }}>
                        {isAr ? 'سارية' : 'Active'}
                      </span>
                    );
                  },
                },
              ]}
              data={myEntriesData?.data || []}
              isLoading={loadingMyEntries}
              page={myEntriesPage}
              pageSize={PAGE_SIZE}
              total={myEntriesData?.count || 0}
              onPageChange={(p) => setMyEntriesPage(p)}
              emptyMessage={isAr ? 'لا توجد حركات مسجلة في سجل نقاطك' : 'No point entries recorded yet'}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GENERAL LEDGER MANAGEMENT (LEADERSHIP)                             */}
      {/* ========================================================================= */}
      {activeTab === 'management' && isHrOrExec && (
        <div
          className="glass-panel gold-border-glow"
          dir={dir}
          style={{
            borderRadius: '20px',
            padding: '1.5rem',
            background: isDark ? 'rgba(22, 24, 34, 0.85)' : '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                {isAr ? 'السجل العام لجميع الأعضاء' : 'Overall Organization Ledger'}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: isDark ? '#aaa' : '#666' }}>
                {isAr
                  ? 'يمكن لمسؤولي الموارد البشرية والرئاسة إبطال أي نقطة مع تسجيل سبب الإلغاء الإلزامي'
                  : 'Leadership can void point records with mandatory reasoning'}
              </p>
            </div>

            {/* Filter by Committee & Search */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={allSearch}
                onChange={(e) => {
                  setAllSearch(e.target.value);
                  setAllEntriesPage(1);
                }}
                placeholder={isAr ? 'بحث بالسبب...' : 'Search reason...'}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                  border: isDark ? '1px solid rgba(255,184,0,0.3)' : '1px solid #d1d5db',
                  color: isDark ? '#fff' : '#111',
                  fontSize: '0.88rem',
                }}
              />
              <select
                value={allCommitteeFilter}
                onChange={(e) => {
                  setAllCommitteeFilter(e.target.value);
                  setAllEntriesPage(1);
                }}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                  border: isDark ? '1px solid rgba(255,184,0,0.3)' : '1px solid #d1d5db',
                  color: isDark ? '#fff' : '#111',
                  fontSize: '0.88rem',
                }}
              >
                <option value="all" style={{ background: isDark ? '#181920' : '#fff' }}>
                  {isAr ? 'جميع اللجان' : 'All Committees'}
                </option>
                {committees.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: isDark ? '#181920' : '#fff' }}>
                    {isAr ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DataTable
            columns={[
              {
                key: 'created_at',
                header: isAr ? 'التاريخ' : 'Date',
                render: (row) => (
                  <span style={{ fontSize: '0.85rem', color: isDark ? '#bbb' : '#555' }}>
                    {new Date(row.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                  </span>
                ),
              },
              {
                key: 'member',
                header: isAr ? 'العضو' : 'Member',
                render: (row) => {
                  const name = isAr
                    ? row.profiles?.full_name_ar || row.profiles?.full_name_en
                    : row.profiles?.full_name_en || row.profiles?.full_name_ar;
                  const comm = isAr ? row.committees?.name_ar : row.committees?.name_en;
                  return (
                    <div>
                      <div style={{ fontWeight: 700, color: isDark ? '#fff' : '#111' }}>{name}</div>
                      {comm && (
                        <div style={{ fontSize: '0.75rem', color: isDark ? '#aaa' : '#666' }}>
                          {comm}
                        </div>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'type',
                header: isAr ? 'النوع والقيمة' : 'Type & Value',
                render: (row) => {
                  const isVoided = Boolean(row.voided_at);
                  const color = isVoided ? '#888' : row.type === 'bonus' ? '#22c55e' : '#ef4444';
                  return (
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color, textDecoration: isVoided ? 'line-through' : 'none' }}>
                      {row.type === 'bonus' ? `+${row.value}` : `-${row.value}`}
                    </span>
                  );
                },
              },
              {
                key: 'reason',
                header: isAr ? 'البيان والمصدر' : 'Reason & Source',
                render: (row) => (
                  <div>
                    <div style={{ color: isDark ? '#ddd' : '#222' }}>{row.reason}</div>
                    <div style={{ fontSize: '0.75rem', color: isDark ? '#888' : '#777' }}>
                      {row.source}
                    </div>
                  </div>
                ),
              },
              {
                key: 'actions',
                header: isAr ? 'الإجراءات' : 'Actions',
                render: (row) => {
                  if (row.voided_at) {
                    return (
                      <span style={{ fontSize: '0.8rem', color: isDark ? '#888' : '#777', fontWeight: 600 }}>
                        {isAr ? 'تم الإلغاء' : 'Voided'}
                      </span>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setEntryToVoid(row);
                        setIsVoidDialogOpen(true);
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <RotateCcw size={13} />
                      <span>{isAr ? 'إلغاء النقطة' : 'Void'}</span>
                    </button>
                  );
                },
              },
            ]}
            data={allEntriesData?.data || []}
            isLoading={loadingAllEntries}
            page={allEntriesPage}
            pageSize={PAGE_SIZE}
            total={allEntriesData?.count || 0}
            onPageChange={(p) => setAllEntriesPage(p)}
            emptyMessage={isAr ? 'لا توجد حركات مسجلة' : 'No records found'}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DISPUTES QUEUE (HR & EXECS)                                        */}
      {/* ========================================================================= */}
      {activeTab === 'disputes_queue' && isHrOrExec && (
        <div
          className="glass-panel gold-border-glow"
          dir={dir}
          style={{
            borderRadius: '20px',
            padding: '1.5rem',
            background: isDark ? 'rgba(22, 24, 34, 0.85)' : '#ffffff',
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              {isAr ? 'طابور مراجعة التظلمات الواردة' : 'Disputes Resolution Queue'}
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: isDark ? '#aaa' : '#666' }}>
              {isAr
                ? 'مراجعة طلبات تظلم الأعضاء حول الخصومات، وقبولها أو رفضها بخطوة ذرية موحدة'
                : 'Review member dispute requests, accept to void penalties or reject with response'}
            </p>
          </div>

          {loadingDisputes ? (
            <p style={{ color: isDark ? '#aaa' : '#666' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : disputesQueue.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={isAr ? 'لا توجد تظلمات معلقة' : 'No Pending Disputes'}
              description={isAr ? 'تمت معالجة والرد على كافة تظلمات الأعضاء بنجاح' : 'All submitted disputes have been resolved'}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {disputesQueue.map((dispute) => {
                const memberName = isAr
                  ? dispute.profiles?.full_name_ar || dispute.profiles?.full_name_en
                  : dispute.profiles?.full_name_en || dispute.profiles?.full_name_ar;

                return (
                  <div
                    key={dispute.id}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                      border: isDark ? '1px solid rgba(255, 184, 0, 0.2)' : '1px solid #e5e7eb',
                      borderRadius: '14px',
                      padding: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: isDark ? '#ffd54f' : '#b45309' }}>
                          {memberName}
                        </span>
                        <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.95rem' }}>
                          (-{dispute.point_entries?.value} pts)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: isDark ? '#aaa' : '#666', marginBottom: '0.5rem' }}>
                        {isAr ? 'سبب الخصم:' : 'Deduction Reason:'} {dispute.point_entries?.reason}
                      </div>
                      <div
                        style={{
                          background: isDark ? 'rgba(0,0,0,0.3)' : '#ffffff',
                          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '0.65rem 0.85rem',
                          fontSize: '0.88rem',
                          color: isDark ? '#eee' : '#111',
                          lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ color: isDark ? '#ffd54f' : '#b45309' }}>
                          {isAr ? 'بيان التظلم:' : 'Member Statement:'}{' '}
                        </strong>
                        {dispute.reason}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'center' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setDisputeToResolve(dispute);
                          setResolveActionType('accept');
                          setIsResolveDialogOpen(true);
                        }}
                        style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          color: '#22c55e',
                          padding: '0.55rem 0.95rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>{isAr ? 'قبول التظلم' : 'Accept'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDisputeToResolve(dispute);
                          setResolveActionType('reject');
                          setIsResolveDialogOpen(true);
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#ef4444',
                          padding: '0.55rem 0.95rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <XCircle size={16} />
                        <span>{isAr ? 'رفض' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: POINT RULES ADMIN (LEADERSHIP)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'rules' && isHrOrExec && (
        <div
          className="glass-panel gold-border-glow"
          dir={dir}
          style={{
            borderRadius: '20px',
            padding: '1.5rem',
            background: isDark ? 'rgba(22, 24, 34, 0.85)' : '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                {isAr ? 'قواعد ومعايير النقاط المعتمدة' : 'Official Point Rules'}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: isDark ? '#aaa' : '#666' }}>
                {isAr
                  ? 'ضبط مسميات وقيم القواعد الآلية واليدوية وتفعيلها أو إيقافها'
                  : 'Manage rule titles, point values, and active status'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setRuleToEdit(null);
                setIsRuleModalOpen(true);
              }}
              className="btn-primary"
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                fontSize: '0.88rem',
              }}
            >
              <Plus size={16} />
              <span>{isAr ? 'إضافة قاعدة جديدة' : 'Add Rule'}</span>
            </button>
          </div>

          <DataTable
            columns={[
              {
                key: 'code',
                header: isAr ? 'الكود' : 'Code',
                render: (r) => (
                  <code style={{ fontSize: '0.82rem', color: '#ffb800' }}>
                    {r.code}
                  </code>
                ),
              },
              {
                key: 'name',
                header: isAr ? 'المسمى' : 'Title',
                render: (r) => (
                  <div>
                    <div style={{ fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
                      {isAr ? r.name_ar : r.name_en}
                    </div>
                    {r.description && (
                      <div style={{ fontSize: '0.75rem', color: isDark ? '#aaa' : '#666' }}>
                        {r.description}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'type',
                header: isAr ? 'النوع والقيمة' : 'Type & Value',
                render: (r) => (
                  <span
                    style={{
                      fontWeight: 800,
                      color: r.type === 'bonus' ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {r.type === 'bonus' ? `+${r.value}` : `-${r.value}`} pts
                  </span>
                ),
              },
              {
                key: 'is_auto',
                header: isAr ? 'آلية التطبيق' : 'Application',
                render: (r) => (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      background: r.is_auto ? 'rgba(59, 130, 246, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: r.is_auto ? '#60a5fa' : isDark ? '#bbb' : '#666',
                      fontWeight: 700,
                    }}
                  >
                    {r.is_auto ? (isAr ? 'تلقائي (System)' : 'Automatic') : (isAr ? 'يدوي (Manual)' : 'Manual')}
                  </span>
                ),
              },
              {
                key: 'active',
                header: isAr ? 'الحالة' : 'Status',
                render: (r) => (
                  <StatusBadge
                    status={r.active ? 'active' : 'suspended'}
                    label={r.active ? (isAr ? 'مفعلة' : 'Active') : (isAr ? 'معطلة' : 'Inactive')}
                  />
                ),
              },
              {
                key: 'actions',
                header: isAr ? 'تعديل' : 'Edit',
                render: (r) => (
                  <button
                    type="button"
                    onClick={() => {
                      setRuleToEdit(r);
                      setIsRuleModalOpen(true);
                    }}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #d1d5db',
                      color: isDark ? '#fff' : '#111',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {isAr ? 'تعديل' : 'Edit'}
                  </button>
                ),
              },
            ]}
            data={pointRulesList}
            isLoading={loadingRules}
            emptyMessage={isAr ? 'لا توجد قواعد مسجلة' : 'No rules registered'}
          />
        </div>
      )}

      {/* Modals & Dialogs */}
      <GivePointsModal
        isOpen={isGiveModalOpen}
        onClose={() => setIsGiveModalOpen(false)}
        activeSeasonId={activeSeason?.id}
        committees={committees}
      />

      <DisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => {
          setIsDisputeModalOpen(false);
          setEntryToDispute(null);
        }}
        entry={entryToDispute}
      />

      <VoidPointDialog
        isOpen={isVoidDialogOpen}
        onClose={() => {
          setIsVoidDialogOpen(false);
          setEntryToVoid(null);
        }}
        entry={entryToVoid}
      />

      <ResolveDisputeDialog
        isOpen={isResolveDialogOpen}
        onClose={() => {
          setIsResolveDialogOpen(false);
          setDisputeToResolve(null);
        }}
        dispute={disputeToResolve}
        actionType={resolveActionType}
      />

      <PointRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => {
          setIsRuleModalOpen(false);
          setRuleToEdit(null);
        }}
        ruleToEdit={ruleToEdit}
      />
    </div>
  );
}
