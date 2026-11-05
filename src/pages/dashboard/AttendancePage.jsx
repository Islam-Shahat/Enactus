import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import StatCard from '../../components/dashboard/StatCard';
import QrScannerModal from '../../components/dashboard/QrScannerModal';
import SessionLiveModal from '../../components/dashboard/SessionLiveModal';
import AttendanceSessionModal from '../../components/dashboard/AttendanceSessionModal';
import ExcuseRequestModal from '../../components/dashboard/ExcuseRequestModal';
import { exportToCsv } from '../../lib/csvExport';
import { useToast } from '../../components/dashboard/Toast';
import {
  CalendarCheck,
  QrCode,
  Users,
  Plus,
  Calendar,
  FileQuestion,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  Check,
  X,
} from 'lucide-react';

const PAGE_SIZE = 10;

export default function AttendancePage() {
  const { user, roles, isSuperAdmin, hasRole } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const isHrOrExec = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president', 'coordinator', 'oc_admin']);
  const isHead = hasRole('committee_head');
  const headRoleObj = roles.find((r) => r.role === 'committee_head');
  const headCommitteeId = headRoleObj?.committee_id;
  const canManage = isHrOrExec || isHead;

  // Active Tab: 'sessions' | 'my_attendance' | 'excuse_queue' | 'report'
  const [activeTab, setActiveTab] = useState(canManage ? 'sessions' : 'my_attendance');

  React.useEffect(() => {
    if (canManage) {
      setActiveTab((prev) => (prev === 'my_attendance' ? 'sessions' : prev));
    }
  }, [canManage]);

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLiveSessionOpen, setIsLiveSessionOpen] = useState(false);
  const [selectedLiveSession, setSelectedLiveSession] = useState(null);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [excuseDefaultSessionId, setExcuseDefaultSessionId] = useState('');

  // Filters state for sessions tab
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionTypeFilter, setSessionTypeFilter] = useState('all');
  const [sessionCommitteeFilter, setSessionCommitteeFilter] = useState('all');

  // Report committee selector
  const [reportCommitteeId, setReportCommitteeId] = useState(headCommitteeId || '');

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
        // Fallback: pick the latest season if no season has is_active = true
        const { data: fallback, error: fbErr } = await supabase
          .from('seasons')
          .select('id, name, is_active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fbErr) throw fbErr;
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

  // Set default report committee if empty
  React.useEffect(() => {
    if (committees.length > 0) {
      setReportCommitteeId((prev) => prev || headCommitteeId || committees[0].id);
    }
  }, [committees, headCommitteeId]);

  // 3. Query Sessions (Tab 1)
  const { data: sessionsData, isLoading: loadingSessions, error: sessionsError } = useQuery({
    queryKey: [
      'dashboard',
      'attendance_sessions',
      activeSeason?.id,
      sessionPage,
      sessionSearch,
      sessionTypeFilter,
      sessionCommitteeFilter,
    ],
    queryFn: async () => {
      const from = (sessionPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from('attendance_sessions')
        .select(
          `
          id,
          title,
          type,
          location,
          starts_at,
          ends_at,
          check_in_open,
          committee_id,
          season_id,
          created_by,
          committees(id, slug, name_ar, name_en, color)
        `,
          { count: 'exact' }
        );

      if (activeSeason?.id) {
        q = q.eq('season_id', activeSeason.id);
      }

      if (sessionTypeFilter !== 'all') {
        q = q.eq('type', sessionTypeFilter);
      }

      if (sessionCommitteeFilter !== 'all') {
        if (sessionCommitteeFilter === 'general') {
          q = q.is('committee_id', null);
        } else {
          q = q.eq('committee_id', sessionCommitteeFilter);
        }
      }

      if (sessionSearch.trim()) {
        q = q.ilike('title', `%${sessionSearch.trim()}%`);
      }

      q = q.order('starts_at', { ascending: false });
      q = q.range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;

      return {
        rows: data || [],
        total: count || 0,
      };
    },
    keepPreviousData: true,
  });

  // 4. Query Member's Own Attendance Records (Tab 2)
  const { data: myAttendanceRecords = [], isLoading: loadingMyAttendance } = useQuery({
    queryKey: ['dashboard', 'my_attendance', user?.id, activeSeason?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          session_id,
          status,
          method,
          checked_in_at,
          notes,
          attendance_sessions!inner(
            id,
            title,
            type,
            starts_at,
            season_id,
            committees(name_ar, name_en, color)
          )
        `)
        .eq('user_id', user.id)
        .order('checked_in_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(user?.id),
  });

  // 5. Query Upcoming Sessions (for scan & excuse submission)
  const { data: upcomingSessions = [] } = useQuery({
    queryKey: ['dashboard', 'upcoming_sessions', activeSeason?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('id, title, type, location, starts_at, ends_at, check_in_open, committee_id')
        .gte('starts_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // last 4 hours or upcoming
        .order('starts_at', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // 6. Query My Excuse Requests
  const { data: myExcuses = [], isLoading: loadingMyExcuses } = useQuery({
    queryKey: ['dashboard', 'my_excuse_requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('excuse_requests')
        .select(`
          id,
          session_id,
          reason,
          status,
          created_at,
          attendance_sessions(id, title, starts_at)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(user?.id),
  });

  // 7. Query Excuse Requests Queue for Managers (Tab 3)
  const { data: excuseQueue = [], isLoading: loadingExcuseQueue } = useQuery({
    queryKey: ['dashboard', 'excuse_queue', headCommitteeId, isHrOrExec],
    queryFn: async () => {
      let q = supabase
        .from('excuse_requests')
        .select(`
          id,
          session_id,
          user_id,
          reason,
          status,
          created_at,
          profiles!excuse_requests_user_id_fkey(
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          ),
          attendance_sessions!inner(
            id,
            title,
            starts_at,
            committee_id,
            committees(name_ar, name_en)
          )
        `)
        .eq('status', 'pending');

      if (!isHrOrExec && headCommitteeId) {
        q = q.eq('attendance_sessions.committee_id', headCommitteeId);
      }

      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(canManage && activeTab === 'excuse_queue'),
  });

  // Review Excuse Request Mutation
  const reviewExcuseMutation = useMutation({
    mutationFn: async ({ requestId, newStatus, sessionId, userId }) => {
      // 1. Update excuse_requests
      const { error: excErr } = await supabase
        .from('excuse_requests')
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (excErr) throw excErr;

      // 2. If approved, upsert attendance as 'excused'
      if (newStatus === 'approved') {
        const { error: attErr } = await supabase.from('attendance').upsert(
          {
            session_id: sessionId,
            user_id: userId,
            status: 'excused',
            method: 'manual',
            recorded_by: user.id,
            notes: 'Approved excuse request',
          },
          { onConflict: 'session_id,user_id' }
        );
        if (attErr) throw attErr;
      }
    },
    onSuccess: (_, { newStatus }) => {
      toast.show(
        newStatus === 'approved'
          ? isAr
            ? 'تم قبول العذر وتسجيل الحضور كـ "معذور"'
            : 'Excuse approved and recorded'
          : isAr
          ? 'تم رفض طلب العذر'
          : 'Excuse rejected',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'excuse_queue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'session_attendees'] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل معالجة العذر' : 'Failed to review excuse'), 'error');
    },
  });

  // 8. Query Committee Attendance Report (Tab 4)
  const { data: committeeReport = [], isLoading: loadingReport } = useQuery({
    queryKey: ['dashboard', 'attendance_report', reportCommitteeId, activeSeason?.id],
    queryFn: async () => {
      if (!reportCommitteeId || !activeSeason?.id) return [];

      // 1. Fetch all members in this committee & season
      const { data: members, error: memErr } = await supabase
        .from('memberships')
        .select(`
          user_id,
          position,
          profiles!inner(
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          )
        `)
        .eq('committee_id', reportCommitteeId)
        .eq('season_id', activeSeason.id)
        .eq('status', 'active');

      if (memErr) throw memErr;

      // 2. Fetch all sessions for this committee or general sessions in this season
      const { data: sessions, error: sessErr } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('season_id', activeSeason.id)
        .or(`committee_id.eq.${reportCommitteeId},committee_id.is.null`);

      if (sessErr) throw sessErr;

      const sessionIds = (sessions || []).map((s) => s.id);
      if (sessionIds.length === 0) {
        return (members || []).map((m) => ({
          member: m,
          totalSessions: 0,
          present: 0,
          late: 0,
          excused: 0,
          absent: 0,
          percentage: 0,
        }));
      }

      // 3. Fetch all attendance records for these sessions
      const { data: records, error: recErr } = await supabase
        .from('attendance')
        .select('user_id, status')
        .in('session_id', sessionIds);

      if (recErr) throw recErr;

      // 4. Calculate aggregates per member
      return (members || []).map((m) => {
        const userRecs = (records || []).filter((r) => r.user_id === m.user_id);
        const present = userRecs.filter((r) => r.status === 'present').length;
        const late = userRecs.filter((r) => r.status === 'late').length;
        const excused = userRecs.filter((r) => r.status === 'excused').length;
        const absent = userRecs.filter((r) => r.status === 'absent').length;
        const total = sessionIds.length;
        // Present and late count towards positive attendance
        const attended = present + late;
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

        return {
          member: m,
          totalSessions: total,
          present,
          late,
          excused,
          absent,
          percentage,
        };
      });
    },
    enabled: Boolean(activeTab === 'report' && reportCommitteeId && activeSeason?.id),
  });

  // Client-side CSV Export
  const handleExportCsv = () => {
    if (committeeReport.length === 0) {
      toast.show(isAr ? 'لا توجد بيانات لتصديرها' : 'No data to export', 'error');
      return;
    }

    const commObj = committees.find((c) => c.id === reportCommitteeId);
    const commName = commObj ? (isAr ? commObj.name_ar : commObj.name_en) : 'Committee';
    const filename = `Attendance_Report_${commName}_${new Date().toISOString().slice(0, 10)}`;

    const columns = [
      {
        key: 'name',
        label: isAr ? 'اسم العضو' : 'Member Name',
        accessor: (row) =>
          isAr
            ? row.member.profiles?.full_name_ar || row.member.profiles?.full_name_en
            : row.member.profiles?.full_name_en || row.member.profiles?.full_name_ar,
      },
      {
        key: 'position',
        label: isAr ? 'المنصب' : 'Position',
        accessor: (row) => row.member.position,
      },
      {
        key: 'totalSessions',
        label: isAr ? 'إجمالي الجلسات' : 'Total Sessions',
        accessor: (row) => row.totalSessions,
      },
      {
        key: 'present',
        label: isAr ? 'حضور في الموعد' : 'Present (On time)',
        accessor: (row) => row.present,
      },
      {
        key: 'late',
        label: isAr ? 'حضور متأخر' : 'Late',
        accessor: (row) => row.late,
      },
      {
        key: 'excused',
        label: isAr ? 'عذر مقبول' : 'Excused',
        accessor: (row) => row.excused,
      },
      {
        key: 'absent',
        label: isAr ? 'غياب' : 'Absent',
        accessor: (row) => row.absent,
      },
      {
        key: 'percentage',
        label: isAr ? 'نسبة الحضور %' : 'Attendance %',
        accessor: (row) => `${row.percentage}%`,
      },
    ];

    exportToCsv(filename, columns, committeeReport);
    toast.show(isAr ? 'تم تصدير ملف CSV بنجاح' : 'CSV exported successfully', 'success');
  };

  // Stats for member view
  const myTotalRecorded = myAttendanceRecords.length;
  const myPresentCount = myAttendanceRecords.filter((r) => r.status === 'present').length;
  const myLateCount = myAttendanceRecords.filter((r) => r.status === 'late').length;
  const myExcusedCount = myAttendanceRecords.filter((r) => r.status === 'excused').length;
  const myAbsentCount = myAttendanceRecords.filter((r) => r.status === 'absent').length;
  const myAttendedTotal = myPresentCount + myLateCount;
  const myPercentage =
    myTotalRecorded > 0 ? Math.round((myAttendedTotal / myTotalRecorded) * 100) : 100;

  // Session table columns
  const sessionColumns = [
    {
      key: 'title',
      label: isAr ? 'الجلسة' : 'Session',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{row.title}</div>
          <div style={{ fontSize: '0.74rem', color: '#888', marginTop: '0.2rem' }}>
            {new Date(row.starts_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
            {row.location && ` • ${row.location}`}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: isAr ? 'النوع' : 'Type',
      render: (row) => <StatusBadge status={row.type} />,
    },
    {
      key: 'committee',
      label: isAr ? 'الفئة المستهدفة' : 'Target Committee',
      render: (row) => (
        <StatusBadge
          label={
            row.committee_id
              ? isAr
                ? row.committees?.name_ar
                : row.committees?.name_en
              : isAr
              ? 'عامة للجميع'
              : 'General (All)'
          }
          color={row.committees?.color}
        />
      ),
    },
    {
      key: 'check_in_open',
      label: isAr ? 'حالة التسجيل' : 'Check-in Status',
      render: (row) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: row.check_in_open ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: row.check_in_open ? '#4ade80' : '#f87171',
            border: `1px solid ${row.check_in_open ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
          }}
        >
          {row.check_in_open ? (
            <>
              <CheckCircle2 size={12} />
              <span>{isAr ? 'مفتوح الآن' : 'Open'}</span>
            </>
          ) : (
            <>
              <Clock size={12} />
              <span>{isAr ? 'مغلق' : 'Closed'}</span>
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarCheck size={24} color="#ffd54f" />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffd54f', margin: 0 }}>
              {isAr ? 'نظام الحضور والجلسات' : 'Attendance & Sessions'}
            </h1>
          </div>
          <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
            {isAr
              ? 'تسجيل الحضور عبر QR الدوار اللحظي، كشف الغياب، ونظام الأعذار الإلكتروني'
              : 'Rotating QR attendance, real-time rosters, and excuse request workflow'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
            }}
          >
            <QrCode size={18} />
            <span>{isAr ? 'مسح كود الحضور (Scan)' : 'Scan Attendance'}</span>
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                setSessionToEdit(null);
                setIsCreateSessionOpen(true);
              }}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '8px',
                borderColor: 'rgba(255, 184, 0, 0.4)',
                color: '#ffd54f',
              }}
            >
              <Plus size={18} />
              <span>{isAr ? 'إنشاء جلسة جديدة' : 'Create Session'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 184, 0, 0.2)',
          marginBottom: '1.5rem',
          paddingBottom: '0.25rem',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('my_attendance')}
          style={{
            padding: '0.6rem 1rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'my_attendance' ? '2px solid #ffb800' : '2px solid transparent',
            color: activeTab === 'my_attendance' ? '#ffd54f' : '#888',
            fontWeight: activeTab === 'my_attendance' ? 700 : 500,
            fontSize: '0.92rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
          }}
        >
          <CalendarCheck size={17} />
          <span>{isAr ? 'سجل حضوري ومسح الكود' : 'My Attendance & Scan'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          style={{
            padding: '0.6rem 1rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'sessions' ? '2px solid #ffb800' : '2px solid transparent',
            color: activeTab === 'sessions' ? '#ffd54f' : '#888',
            fontWeight: activeTab === 'sessions' ? 700 : 500,
            fontSize: '0.92rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
          }}
        >
          <Calendar size={17} />
          <span>{isAr ? 'جدول الجلسات والتحضير' : 'Sessions List'}</span>
        </button>

        {canManage && (
          <button
            type="button"
            onClick={() => setActiveTab('excuse_queue')}
            style={{
              padding: '0.6rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'excuse_queue' ? '2px solid #ffb800' : '2px solid transparent',
              color: activeTab === 'excuse_queue' ? '#ffd54f' : '#888',
              fontWeight: activeTab === 'excuse_queue' ? 700 : 500,
              fontSize: '0.92rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
            }}
          >
            <FileQuestion size={17} />
            <span>{isAr ? 'طلبات الأعذار' : 'Excuse Requests'}</span>
            {excuseQueue.length > 0 && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  fontWeight: 800,
                }}
              >
                {excuseQueue.length}
              </span>
            )}
          </button>
        )}

        {canManage && (
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            style={{
              padding: '0.6rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'report' ? '2px solid #ffb800' : '2px solid transparent',
              color: activeTab === 'report' ? '#ffd54f' : '#888',
              fontWeight: activeTab === 'report' ? 700 : 500,
              fontSize: '0.92rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={17} />
            <span>{isAr ? 'تقرير الحضور للجان' : 'Committee Report'}</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SESSIONS LIST & LIVE PREPARATION */}
      {/* ============================================================== */}
      {activeTab === 'sessions' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select
              value={sessionTypeFilter}
              onChange={(e) => {
                setSessionTypeFilter(e.target.value);
                setSessionPage(1);
              }}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
                fontSize: '0.85rem',
              }}
            >
              <option value="all" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'كل أنواع الجلسات' : 'All Types'}
              </option>
              <option value="meeting" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'اجتماع (Meeting)' : 'Meeting'}
              </option>
              <option value="workshop" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'ورشة عمل (Workshop)' : 'Workshop'}
              </option>
              <option value="training" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'تدريب (Training)' : 'Training'}
              </option>
              <option value="event" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'فعالية (Event)' : 'Event'}
              </option>
            </select>

            <select
              value={sessionCommitteeFilter}
              onChange={(e) => {
                setSessionCommitteeFilter(e.target.value);
                setSessionPage(1);
              }}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
                fontSize: '0.85rem',
              }}
            >
              <option value="all" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'كل الفئات المستهدفة' : 'All Target Audiences'}
              </option>
              <option value="general" style={{ background: '#181920', color: '#ffd54f' }}>
                {isAr ? 'جلسات عامة (الجميع)' : 'General (All Members)'}
              </option>
              {committees.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#181920', color: '#fff' }}>
                  {isAr ? c.name_ar : c.name_en}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={sessionColumns}
            data={sessionsData?.rows || []}
            total={sessionsData?.total || 0}
            page={sessionPage}
            pageSize={PAGE_SIZE}
            onPageChange={setSessionPage}
            isLoading={loadingSessions}
            error={sessionsError}
            search={sessionSearch}
            onSearchChange={(val) => {
              setSessionSearch(val);
              setSessionPage(1);
            }}
            searchPlaceholder={isAr ? 'بحث بعنوان الجلسة...' : 'Search session title...'}
            onRowClick={(row) => {
              setSelectedLiveSession(row);
              setIsLiveSessionOpen(true);
            }}
            emptyTitle={isAr ? 'لا توجد جلسات' : 'No sessions found'}
            emptyDescription={
              isAr ? 'لم يتم العثور على جلسات تطابق البحث المحدد.' : 'No sessions matched your search.'
            }
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MEMBER VIEW & ATTENDANCE STATS */}
      {/* ============================================================== */}
      {activeTab === 'my_attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Stat Cards Overview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <StatCard
              title={isAr ? 'نسبة الالتزام بالحضور' : 'Attendance Rate'}
              value={`${myPercentage}%`}
              icon={Percent}
              subtitle={
                myPercentage >= 80
                  ? isAr
                    ? 'ممتاز • التزام عالي'
                    : 'Excellent'
                  : isAr
                  ? 'يرجى تجنب الغياب'
                  : 'Needs improvement'
              }
            />
            <StatCard
              title={isAr ? 'حضور في الموعد' : 'Present (On Time)'}
              value={myPresentCount}
              icon={CheckCircle2}
              subtitle={isAr ? 'جلسات مسجلة' : 'Sessions'}
            />
            <StatCard
              title={isAr ? 'حضور متأخر' : 'Late Check-ins'}
              value={myLateCount}
              icon={Clock}
              subtitle={isAr ? 'بعد 15 دقيقة' : 'After 15 min'}
            />
            <StatCard
              title={isAr ? 'أعذار مقبولة' : 'Excused Sessions'}
              value={myExcusedCount}
              icon={FileQuestion}
              subtitle={isAr ? 'معتمد رسمياً' : 'Officially approved'}
            />
            <StatCard
              title={isAr ? 'مرات الغياب' : 'Absences'}
              value={myAbsentCount}
              icon={XCircle}
              subtitle={isAr ? 'بدون عذر معتمد' : 'Unexcused'}
            />
          </div>

          {/* Upcoming Sessions Card */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 184, 0, 0.2)',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={18} color="#ffd54f" />
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', fontWeight: 700 }}>
                  {isAr ? 'الجلسات القادمة والنشطة حالياً' : 'Active & Upcoming Sessions'}
                </h3>
              </div>
            </div>

            {upcomingSessions.length === 0 ? (
              <div style={{ color: '#777', fontSize: '0.85rem', fontStyle: 'italic' }}>
                {isAr ? 'لا توجد جلسات قادمة مجدولة حالياً.' : 'No upcoming sessions scheduled.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {upcomingSessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255, 184, 0, 0.03)',
                      border: '1px solid rgba(255, 184, 0, 0.15)',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{s.title}</span>
                        <StatusBadge status={s.type} />
                        {s.check_in_open && (
                          <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700 }}>
                            ({isAr ? 'التسجيل مفتوح الآن' : 'Check-in Open'})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#888', marginTop: '0.2rem' }}>
                        {new Date(s.starts_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                        {s.location && ` • ${s.location}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setExcuseDefaultSessionId(s.id);
                          setIsExcuseModalOpen(true);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#ddd',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        {isAr ? 'طلب عذر' : 'Request Excuse'}
                      </button>

                      {s.check_in_open && (
                        <button
                          type="button"
                          onClick={() => setIsScannerOpen(true)}
                          className="btn-primary"
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <QrCode size={13} />
                          <span>{isAr ? 'تسجيل الحضور' : 'Check In'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History List */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 184, 0, 0.2)',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '1.05rem', fontWeight: 700 }}>
              {isAr ? 'سجل حضوري للجلسات السابقة' : 'My Attendance History'}
            </h3>

            {loadingMyAttendance ? (
              <div style={{ color: '#888', padding: '1rem', textAlign: 'center' }}>
                {isAr ? 'تحميل سجل الحضور...' : 'Loading history...'}
              </div>
            ) : myAttendanceRecords.length === 0 ? (
              <div style={{ color: '#777', padding: '1.5rem', textAlign: 'center', fontStyle: 'italic' }}>
                {isAr ? 'لم يتم تسجيل أي جلسات حضور لك بعد.' : 'No attendance recorded yet.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {myAttendanceRecords.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255, 184, 0, 0.12)',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                        {r.attendance_sessions?.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#777', marginTop: '0.2rem' }}>
                        {r.checked_in_at
                          ? new Date(r.checked_in_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')
                          : '—'}{' '}
                        • {r.method.toUpperCase()}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Excuse Requests Status */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 184, 0, 0.2)',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '1.05rem', fontWeight: 700 }}>
              {isAr ? 'متابعة طلبات الأعذار المقدمة مني' : 'My Excuse Requests Status'}
            </h3>

            {loadingMyExcuses ? (
              <div style={{ color: '#888', padding: '1rem', textAlign: 'center' }}>
                {isAr ? 'تحميل طلبات الأعذار...' : 'Loading excuse requests...'}
              </div>
            ) : myExcuses.length === 0 ? (
              <div style={{ color: '#777', padding: '1.5rem', textAlign: 'center', fontStyle: 'italic' }}>
                {isAr ? 'لم تقدم أي طلبات أعذار حتى الآن.' : 'No excuse requests submitted.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {myExcuses.map((exc) => (
                  <div
                    key={exc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 184, 0, 0.12)',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                        {exc.attendance_sessions?.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#aaa', marginTop: '0.2rem' }}>
                        {exc.reason}
                      </div>
                    </div>
                    <StatusBadge status={exc.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: EXCUSE REQUESTS QUEUE (MANAGERS) */}
      {/* ============================================================== */}
      {activeTab === 'excuse_queue' && canManage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ color: '#aaa', fontSize: '0.88rem' }}>
            {isAr
              ? 'قائمة طلبات الأعذار المقدمة من الأعضاء قيد المراجعة. عند الموافقة، يُسجل العضو تلقائياً كـ "معذور" (Excused).'
              : 'Pending absence excuses. Approving records the member as Excused.'}
          </div>

          {loadingExcuseQueue ? (
            <div style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>
              {isAr ? 'تحميل الطلبات...' : 'Loading excuse queue...'}
            </div>
          ) : excuseQueue.length === 0 ? (
            <div style={{ color: '#777', padding: '3rem', textAlign: 'center', fontStyle: 'italic' }}>
              {isAr ? 'لا توجد طلبات أعذار قيد الانتظار حالياً.' : 'No pending excuse requests.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {excuseQueue.map((req) => {
                const name = isAr
                  ? req.profiles?.full_name_ar || req.profiles?.full_name_en
                  : req.profiles?.full_name_en || req.profiles?.full_name_ar;
                return (
                  <div
                    key={req.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid rgba(255, 184, 0, 0.2)',
                      borderRadius: '10px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'rgba(255, 184, 0, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Users size={14} color="#ffb800" />
                        </div>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>{name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#ffd54f' }}>
                          • {req.attendance_sessions?.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() =>
                            reviewExcuseMutation.mutate({
                              requestId: req.id,
                              newStatus: 'approved',
                              sessionId: req.session_id,
                              userId: req.user_id,
                            })
                          }
                          disabled={reviewExcuseMutation.isPending}
                          style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            color: '#4ade80',
                            borderRadius: '6px',
                            padding: '0.4rem 0.85rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Check size={14} />
                          <span>{isAr ? 'قبول العذر' : 'Approve'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            reviewExcuseMutation.mutate({
                              requestId: req.id,
                              newStatus: 'rejected',
                              sessionId: req.session_id,
                              userId: req.user_id,
                            })
                          }
                          disabled={reviewExcuseMutation.isPending}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            borderRadius: '6px',
                            padding: '0.4rem 0.85rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={14} />
                          <span>{isAr ? 'رفض' : 'Reject'}</span>
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        color: '#ddd',
                        fontSize: '0.86rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {req.reason}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: COMMITTEE ATTENDANCE REPORT & CSV EXPORT */}
      {/* ============================================================== */}
      {activeTab === 'report' && canManage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header & Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: '#ffd54f', fontSize: '0.88rem', fontWeight: 600 }}>
                {isAr ? 'اختر اللجنة لعرض التقرير:' : 'Select Committee:'}
              </span>
              <select
                value={reportCommitteeId}
                onChange={(e) => setReportCommitteeId(e.target.value)}
                disabled={!isHrOrExec && Boolean(headCommitteeId)}
                style={{
                  padding: '0.55rem 0.9rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  color: '#fff',
                  fontSize: '0.88rem',
                }}
              >
                {committees.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: '#181920', color: '#fff' }}>
                    {isAr ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={committeeReport.length === 0}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              <Download size={15} />
              <span>{isAr ? 'تصدير تقرير CSV' : 'Export CSV Report'}</span>
            </button>
          </div>

          {/* Report Table */}
          {loadingReport ? (
            <div style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>
              {isAr ? 'حساب نسب الحضور وتجهيز التقرير...' : 'Calculating report aggregates...'}
            </div>
          ) : committeeReport.length === 0 ? (
            <div style={{ color: '#777', padding: '3rem', textAlign: 'center', fontStyle: 'italic' }}>
              {isAr ? 'لا يوجد أعضاء في هذه اللجنة لهذا الموسم.' : 'No members found for this committee.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.88rem',
                  color: '#fff',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 184, 0, 0.25)', color: '#ffd54f' }}>
                    <th style={{ padding: '0.75rem', textAlign: isAr ? 'right' : 'left' }}>
                      {isAr ? 'العضو' : 'Member'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{isAr ? 'المنصب' : 'Position'}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{isAr ? 'الجلسات' : 'Sessions'}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{isAr ? 'حاضر' : 'Present'}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{isAr ? 'متأخر' : 'Late'}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{isAr ? 'معذور' : 'Excused'}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{isAr ? 'غائب' : 'Absent'}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{isAr ? 'النسبة %' : 'Rate %'}</th>
                  </tr>
                </thead>
                <tbody>
                  {committeeReport.map((row) => {
                    const name = isAr
                      ? row.member.profiles?.full_name_ar || row.member.profiles?.full_name_en
                      : row.member.profiles?.full_name_en || row.member.profiles?.full_name_ar;

                    return (
                      <tr
                        key={row.member.user_id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          background: 'rgba(255, 255, 255, 0.015)',
                        }}
                      >
                        <td style={{ padding: '0.75rem' }}>{name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <StatusBadge status={row.member.position} />
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#aaa' }}>
                          {row.totalSessions}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#4ade80' }}>
                          {row.present}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#facc15' }}>
                          {row.late}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#7dd3fc' }}>
                          {row.excused}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#f87171' }}>
                          {row.absent}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: row.percentage >= 80 ? '#4ade80' : row.percentage >= 60 ? '#facc15' : '#f87171',
                            }}
                          >
                            {row.percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Camera & Manual Checkin Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        sessions={upcomingSessions}
        onCheckinSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_attendance'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'session_attendees'] });
        }}
      />

      {/* Live Session / Rotating QR Modal */}
      <SessionLiveModal
        isOpen={isLiveSessionOpen}
        onClose={() => {
          setIsLiveSessionOpen(false);
          setSelectedLiveSession(null);
        }}
        session={selectedLiveSession}
        onSessionUpdated={(updated) => {
          setSelectedLiveSession(updated);
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_sessions'] });
        }}
      />

      {/* Create / Edit Session Modal */}
      <AttendanceSessionModal
        isOpen={isCreateSessionOpen}
        onClose={() => {
          setIsCreateSessionOpen(false);
          setSessionToEdit(null);
        }}
        onSuccess={() => {
          setIsCreateSessionOpen(false);
          setSessionToEdit(null);
          setActiveTab('sessions');
          setSessionPage(1);
          setSessionSearch('');
          setSessionTypeFilter('all');
          setSessionCommitteeFilter('all');
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_sessions'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'upcoming_sessions'] });
        }}
        sessionToEdit={sessionToEdit}
        activeSeasonId={activeSeason?.id}
        committees={committees}
      />

      {/* Submit Excuse Modal */}
      <ExcuseRequestModal
        isOpen={isExcuseModalOpen}
        onClose={() => setIsExcuseModalOpen(false)}
        sessions={upcomingSessions}
        defaultSessionId={excuseDefaultSessionId}
      />
    </div>
  );
}
