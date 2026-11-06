import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import Drawer from '../../components/dashboard/Drawer';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import FileLink from '../../components/dashboard/FileLink';
import FormField from '../../components/dashboard/FormField';
import { useToast } from '../../components/dashboard/Toast';
import { User, Mail, Phone, BookOpen, CheckCircle2, Trash2 } from 'lucide-react';

const PAGE_SIZE = 10;

export default function ApplicationsPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const canManage = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president']);

  // Table state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [committeeFilter, setCommitteeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Drawer & Action states
  const [selectedApp, setSelectedApp] = useState(null);
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const [targetCommitteeSlug, setTargetCommitteeSlug] = useState('');
  const [targetPosition, setTargetPosition] = useState('member');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewScore, setReviewScore] = useState('');

  // Fetch committees for filter and conversion select
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

  // Query applications with server-side pagination & RLS
  const { data: appData, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'applications', page, search, statusFilter, committeeFilter, sortBy, sortOrder],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from('applications')
        .select('*, first_choice:committees!applications_first_choice_id_fkey(id, slug, name_ar, name_en, color), second_choice:committees!applications_second_choice_id_fkey(id, slug, name_ar, name_en)', { count: 'exact' });

      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }

      if (committeeFilter !== 'all') {
        q = q.eq('first_choice_id', committeeFilter);
      }

      if (search.trim()) {
        const s = search.trim();
        q = q.or(`full_name.ilike."%${s}%",email.ilike."%${s}%",phone.ilike."%${s}%"`);
      }

      q = q.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);

      const { data, count, error: fetchErr } = await q;
      if (fetchErr) throw fetchErr;
      return { items: data || [], totalCount: count || 0 };
    },
  });

  // Mutation: Update application status, score, or notes
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes, interviewScore }) => {
      const updates = {
        status,
        reviewed_by: user?.id,
        updated_at: new Date().toISOString(),
      };
      if (notes !== undefined) updates.notes = notes;
      if (interviewScore !== undefined) {
        updates.interview_score = interviewScore === '' ? null : Number(interviewScore);
      }

      const { error: updateErr } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', id);

      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'applications'] });
      toast.success(isAr ? 'تم تحديث حالة الطلب بنجاح' : 'Application status updated successfully');
      if (selectedApp) {
        setSelectedApp(null);
      }
    },
    onError: (err) => {
      toast.error(err.message || (isAr ? 'فشل تحديث الطلب' : 'Failed to update application'));
    },
  });

  // Mutation: Convert application to member (RPC with Edge Function fallback)
  const convertMutation = useMutation({
    mutationFn: async ({ applicationId, committeeSlug, position }) => {
      // 1. Try secure database RPC first (independent of un-deployed Edge Functions)
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('convert_application_to_member', {
          p_application_id: applicationId,
          p_committee_slug: committeeSlug,
          p_position: position || 'member',
        });

        if (!rpcErr && rpcData) {
          if (rpcData.ok === false) {
            throw new Error(rpcData.error || (isAr ? 'فشل تحويل المتقدم إلى عضو' : 'Failed to convert application'));
          }
          return rpcData;
        }
        if (rpcErr && !rpcErr.message?.includes('function') && !rpcErr.message?.includes('does not exist')) {
          throw new Error(rpcErr.message);
        }
      } catch (rpcEx) {
        if (!rpcEx.message?.includes('does not exist') && !rpcEx.message?.includes('function')) {
          throw rpcEx;
        }
      }

      // 2. Secondary fallback: invoke Edge Function
      const { data, error: fnErr } = await supabase.functions.invoke('convert-application', {
        body: {
          applicationId,
          committeeSlug,
          position: position || 'member',
        },
      });

      if (fnErr || data?.error || data?.ok === false) {
        const message = data?.error || fnErr?.message || (isAr ? 'فشل تحويل المتقدم إلى عضو' : 'Failed to convert application');
        throw new Error(message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'members'] });
      toast.success(
        isAr ? 'تم قبول المتقدم وتحويله إلى عضو نشط بنجاح!' : 'Application accepted and converted to team member!'
      );
      setIsAcceptOpen(false);
      setSelectedApp(null);
    },
    onError: (err) => {
      toast.error(err.message || (isAr ? 'فشل تحويل المتقدم إلى عضو' : 'Failed to convert application'));
    },
  });

  // Mutation: Delete application with RPC and RLS fallback
  const deleteMutation = useMutation({
    mutationFn: async (applicationId) => {
      // 1. Try secure RPC delete_application first
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('delete_application', {
          p_application_id: applicationId,
        });

        if (!rpcErr && rpcData) {
          if (rpcData.ok === false) {
            throw new Error(rpcData.error || (isAr ? 'فشل حذف طلب التقديم' : 'Failed to delete application'));
          }
          return rpcData;
        }
        if (rpcErr && !rpcErr.message?.includes('function') && !rpcErr.message?.includes('does not exist')) {
          throw new Error(rpcErr.message);
        }
      } catch (rpcEx) {
        if (!rpcEx.message?.includes('does not exist') && !rpcEx.message?.includes('function')) {
          throw rpcEx;
        }
      }

      // 2. Direct table delete fallback
      const { error: directErr } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId);

      if (directErr) {
        throw new Error(directErr.message || (isAr ? 'فشل حذف طلب التقديم' : 'Failed to delete application'));
      }
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'applications'] });
      toast.success(isAr ? 'تم حذف طلب التقديم بنجاح' : 'Application deleted successfully');
      setAppToDelete(null);
      if (selectedApp) {
        setSelectedApp(null);
      }
    },
    onError: (err) => {
      toast.error(err.message || (isAr ? 'فشل حذف طلب التقديم' : 'Failed to delete application'));
    },
  });

  const handleOpenDrawer = (row) => {
    setSelectedApp(row);
    setReviewNotes(row.notes || '');
    setReviewScore(row.interview_score ?? '');
    setTargetCommitteeSlug(row.first_choice?.slug || committees[0]?.slug || '');
  };

  const handleSortChange = (colKey) => {
    if (sortBy === colKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(colKey);
      setSortOrder('asc');
    }
  };

  const columns = [
    {
      key: 'full_name',
      header: isAr ? 'اسم المتقدم' : 'Applicant Name',
      sortable: true,
      render: (row) => (
        <div>
          <span style={{ fontWeight: 700, color: '#fff', display: 'block' }}>{row.full_name}</span>
          <span style={{ fontSize: '0.78rem', color: '#a0a0b2', direction: 'ltr', display: 'inline-block' }}>
            {row.email}
          </span>
        </div>
      ),
    },
    {
      key: 'faculty',
      header: isAr ? 'الكلية والفرقة' : 'Faculty & Year',
      render: (row) => (
        <div>
          <span style={{ display: 'block', fontSize: '0.85rem' }}>{row.faculty || '—'}</span>
          <span style={{ fontSize: '0.75rem', color: '#ffd54f' }}>
            {row.study_year ? (isAr ? `الفرقة ${row.study_year}` : `Year ${row.study_year}`) : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'first_choice',
      header: isAr ? 'اللجنة المرغوبة' : 'Preferred Committee',
      render: (row) => {
        const comm = row.first_choice;
        if (!comm) return <span>—</span>;
        return (
          <StatusBadge
            status={comm.slug}
            customColor={comm.color}
            label={isAr ? comm.name_ar : comm.name_en}
          />
        );
      },
    },
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'interview_score',
      header: isAr ? 'التقييم' : 'Score',
      sortable: true,
      render: (row) =>
        row.interview_score !== null && row.interview_score !== undefined ? (
          <span style={{ fontWeight: 800, color: '#ffb800' }}>★ {row.interview_score}</span>
        ) : (
          <span style={{ color: '#666' }}>—</span>
        ),
    },
    {
      key: 'created_at',
      header: isAr ? 'تاريخ التقديم' : 'Applied On',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: '#a0a0b2' }}>
          {new Date(row.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: isAr ? 'إجراءات' : 'Actions',
            render: (row) => (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setAppToDelete(row)}
                  title={isAr ? 'حذف طلب التقديم' : 'Delete Application'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                    e.currentTarget.style.borderColor = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="dashboard-page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', margin: '0 0 0.35rem 0' }}>
          {isAr ? 'طلبات التقديم للانضمام' : 'Recruitment Applications'}
        </h1>
        <p style={{ color: '#a0a0b2', fontSize: '0.9rem', margin: 0 }}>
          {canManage
            ? (isAr ? 'فرز وإدارة طلبات التقديم وإجراء المقابلات وتحويل المقبولين إلى أعضاء.' : 'Screen applications, schedule interviews, and onboard accepted members.')
            : (isAr ? 'عرض طلبات التقديم الخاصة بلجنتك (عرض للقراءة فقط).' : 'View applications for your committee (Read-only view).')}
        </p>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={appData?.items || []}
        isLoading={isLoading}
        error={error}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={appData?.totalCount || 0}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={isAr ? 'بحث بالاسم، الإيميل، الهاتف...' : 'Search by name, email, phone...'}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onRowClick={handleOpenDrawer}
        emptyTitle={isAr ? 'لا توجد طلبات تقديم' : 'No Applications Found'}
        emptyDescription={isAr ? 'لم يتم العثور على أي طلبات تقديم تطابق الفلاتر المحددة.' : 'No applications match the selected criteria.'}
        filters={
          <>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(10, 11, 16, 0.7)',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            >
              <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="new">{isAr ? 'جديد (New)' : 'New'}</option>
              <option value="screening">{isAr ? 'قيد الفرز (Screening)' : 'Screening'}</option>
              <option value="interview">{isAr ? 'مقابلة (Interview)' : 'Interview'}</option>
              <option value="accepted">{isAr ? 'مقبول (Accepted)' : 'Accepted'}</option>
              <option value="rejected">{isAr ? 'مرفوض (Rejected)' : 'Rejected'}</option>
              <option value="withdrawn">{isAr ? 'منسحب (Withdrawn)' : 'Withdrawn'}</option>
            </select>

            {/* Committee Filter */}
            <select
              value={committeeFilter}
              onChange={(e) => {
                setCommitteeFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(10, 11, 16, 0.7)',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            >
              <option value="all">{isAr ? 'كل اللجان' : 'All Committees'}</option>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {isAr ? c.name_ar : c.name_en}
                </option>
              ))}
            </select>
          </>
        }
      />

      {/* Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        title={selectedApp?.full_name || ''}
        subtitle={selectedApp?.email}
        footer={
          canManage && selectedApp && selectedApp.status !== 'accepted' ? (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedApp.status !== 'screening' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: selectedApp.id, status: 'screening', notes: reviewNotes, interviewScore: reviewScore })}
                    disabled={updateStatusMutation.isPending}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                  >
                    {isAr ? 'فرز' : 'Screening'}
                  </button>
                )}
                {selectedApp.status !== 'interview' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: selectedApp.id, status: 'interview', notes: reviewNotes, interviewScore: reviewScore })}
                    disabled={updateStatusMutation.isPending}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', borderColor: '#c084fc', color: '#c084fc' }}
                  >
                    {isAr ? 'مقابلة' : 'Interview'}
                  </button>
                )}
                {selectedApp.status !== 'rejected' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: selectedApp.id, status: 'rejected', notes: reviewNotes, interviewScore: reviewScore })}
                    disabled={updateStatusMutation.isPending}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', borderColor: '#ef4444', color: '#ef4444' }}
                  >
                    {isAr ? 'رفض' : 'Reject'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAppToDelete(selectedApp)}
                  disabled={deleteMutation.isPending}
                  className="btn-secondary"
                  title={isAr ? 'حذف طلب التقديم نهائياً' : 'Permanently Delete Application'}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.45rem 0.75rem',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Trash2 size={14} />
                  <span>{isAr ? 'حذف' : 'Delete'}</span>
                </button>
              </div>

              <button
                onClick={() => setIsAcceptOpen(true)}
                disabled={convertMutation.isPending}
                className="btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
              >
                <CheckCircle2 size={16} />
                <span>{isAr ? 'قبول وتحويل لعضو' : 'Accept & Convert'}</span>
              </button>
            </div>
          ) : null
        }
      >
        {selectedApp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Status & ID banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
              <StatusBadge status={selectedApp.status} />
              <span style={{ fontSize: '0.75rem', color: '#888' }}>ID: {selectedApp.id.substring(0, 8)}...</span>
            </div>

            {/* Contact Details */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#ffd54f', margin: '0 0 0.75rem 0' }}>
                {isAr ? 'بيانات الاتصال والأكاديمية' : 'Contact & Academic Info'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#888', display: 'block', fontSize: '0.75rem' }}>{isAr ? 'رقم الهاتف:' : 'Phone:'}</span>
                  <span style={{ color: '#fff', direction: 'ltr', display: 'inline-block' }}>{selectedApp.phone || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#888', display: 'block', fontSize: '0.75rem' }}>{isAr ? 'الكلية:' : 'Faculty:'}</span>
                  <span style={{ color: '#fff' }}>{selectedApp.faculty || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#888', display: 'block', fontSize: '0.75rem' }}>{isAr ? 'الفرقة الدراسية:' : 'Study Year:'}</span>
                  <span style={{ color: '#fff' }}>{selectedApp.study_year ? (isAr ? `الفرقة ${selectedApp.study_year}` : `Year ${selectedApp.study_year}`) : '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#888', display: 'block', fontSize: '0.75rem' }}>{isAr ? 'الرقم الجامعي:' : 'University ID:'}</span>
                  <span style={{ color: '#fff' }}>{selectedApp.university_id || '—'}</span>
                </div>
              </div>
            </div>

            {/* Committee Choices */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#ffd54f', margin: '0 0 0.75rem 0' }}>
                {isAr ? 'رغبات اللجان' : 'Committee Choices'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#888', marginInlineEnd: '0.5rem' }}>{isAr ? 'الرغبة الأولى:' : '1st Choice:'}</span>
                  {selectedApp.first_choice ? (
                    <StatusBadge
                      status={selectedApp.first_choice.slug}
                      customColor={selectedApp.first_choice.color}
                      label={isAr ? selectedApp.first_choice.name_ar : selectedApp.first_choice.name_en}
                    />
                  ) : (
                    <span>—</span>
                  )}
                </div>
                {selectedApp.second_choice && (
                  <div>
                    <span style={{ color: '#888', marginInlineEnd: '0.5rem' }}>{isAr ? 'الرغبة الثانية:' : '2nd Choice:'}</span>
                    <span style={{ color: '#fff' }}>
                      {isAr ? selectedApp.second_choice.name_ar : selectedApp.second_choice.name_en}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Motivation & Answers */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#ffd54f', margin: '0 0 0.5rem 0' }}>
                {isAr ? 'الشغف والأثر المرجو (Motivation)' : 'Motivation & Impact Goal'}
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#e0e0ec', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {selectedApp.motivation || selectedApp.answers?.impactGoal || (isAr ? 'لم يذكر المتقدم أي تفاصيل إضافية.' : 'No additional motivation provided.')}
              </p>
            </div>

            {/* CV Download Link (Private bucket 'cvs' via signed URL) */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#ffd54f', margin: '0 0 0.6rem 0' }}>
                {isAr ? 'السيرة الذاتية (CV)' : 'Resume / CV Document'}
              </h4>
              <FileLink bucket="cvs" path={selectedApp.cv_url} />
            </div>

            {/* Evaluation & Notes Section */}
            {canManage && (
              <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#ffd54f', margin: '0 0 0.75rem 0' }}>
                  {isAr ? 'تقييم المقابلة وملاحظات الـ HR' : 'HR Notes & Interview Score'}
                </h4>

                <FormField label={isAr ? 'درجة المقابلة (من 10)' : 'Interview Score (out of 10)'}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={reviewScore}
                    onChange={(e) => setReviewScore(e.target.value)}
                    placeholder="مثال: 8.5"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(10, 11, 16, 0.7)',
                      border: '1px solid rgba(255, 184, 0, 0.25)',
                      color: '#fff',
                      fontSize: '0.9rem',
                    }}
                  />
                </FormField>

                <FormField label={isAr ? 'ملاحظات فريق الفرز والمقابلات' : 'Internal Reviewer Notes'}>
                  <textarea
                    rows="3"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={isAr ? 'اكتب ملاحظاتك حول نقاط القوة وتوصيات التوزيع...' : 'Internal notes on candidate strengths & placement...'}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(10, 11, 16, 0.7)',
                      border: '1px solid rgba(255, 184, 0, 0.25)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      resize: 'none',
                    }}
                  />
                </FormField>

                <button
                  type="button"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: selectedApp.id,
                      status: selectedApp.status,
                      notes: reviewNotes,
                      interviewScore: reviewScore,
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: '0.5rem' }}
                >
                  {isAr ? 'حفظ التقييم والملاحظات' : 'Save Notes & Score'}
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Accept & Convert Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isAcceptOpen}
        onClose={() => setIsAcceptOpen(false)}
        onConfirm={() =>
          convertMutation.mutate({
            applicationId: selectedApp?.id,
            committeeSlug: targetCommitteeSlug,
            position: targetPosition,
          })
        }
        isLoading={convertMutation.isPending}
        title={isAr ? 'تأكيد قبول المتقدم وتحويله لعضو' : 'Confirm Acceptance & Member Conversion'}
        message={
          isAr
            ? `سيتم إنشاء حساب مستخدم رسمي لـ "${selectedApp?.full_name}" وإرسال رسالة بريد إلكتروني ترحيبية، وإدراجه كعضو رسمي في اللجنة المختارة للموسم النشط.`
            : `An official account will be provisioned for "${selectedApp?.full_name}", with an invite link sent to their email.`
        }
        confirmText={isAr ? 'قبول وإنشاء العضوية' : 'Accept & Issue Membership'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <FormField label={isAr ? 'اللجنة الموزع عليها العضو *' : 'Assigned Committee *'}>
            <select
              value={targetCommitteeSlug}
              onChange={(e) => setTargetCommitteeSlug(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(10, 11, 16, 0.85)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            >
              {committees.map((c) => (
                <option key={c.id} value={c.slug}>
                  {isAr ? c.name_ar : c.name_en} ({c.slug})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={isAr ? 'الدور / المنصب *' : 'Role / Position *'}>
            <select
              value={targetPosition}
              onChange={(e) => setTargetPosition(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(10, 11, 16, 0.85)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            >
              <option value="member">{isAr ? 'عضو (Member)' : 'Member'}</option>
              <option value="coordinator">{isAr ? 'منسق (Coordinator)' : 'Coordinator'}</option>
              <option value="vice">{isAr ? 'نائب رئيس لجنة (Vice Head)' : 'Vice Head'}</option>
              <option value="head">{isAr ? 'رئيس لجنة (Head)' : 'Head'}</option>
            </select>
          </FormField>
        </div>
      </ConfirmDialog>

      {/* Delete Application Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(appToDelete)}
        onClose={() => setAppToDelete(null)}
        onConfirm={() => deleteMutation.mutate(appToDelete?.id)}
        isLoading={deleteMutation.isPending}
        title={isAr ? 'تأكيد حذف طلب التقديم' : 'Confirm Application Deletion'}
        message={
          isAr
            ? `هل أنت متأكد من رغبتك في حذف طلب التقديم الخاص بـ "${appToDelete?.full_name}" بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.`
            : `Are you sure you want to permanently delete the application for "${appToDelete?.full_name}"? This action cannot be undone.`
        }
        confirmText={isAr ? 'نعم، احذف الطلب' : 'Yes, Delete'}
        confirmVariant="danger"
        variant="danger"
      />
    </div>
  );
}
