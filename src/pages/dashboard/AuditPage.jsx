// src/pages/dashboard/AuditPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  Activity,
  Cpu,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Layers,
  Database,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime, formatRelativeTime } from '../../lib/formatters';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import StatCard from '../../components/dashboard/StatCard';
import Drawer from '../../components/dashboard/Drawer';
import EmptyState from '../../components/dashboard/EmptyState';
import Skeleton from '../../components/dashboard/Skeleton';

const PAGE_SIZE = 20;

export default function AuditPage() {
  const { lang } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';

  const [activeTab, setActiveTab] = useState('jobs'); // jobs | audit
  const [page, setPage] = useState(1);
  const [selectedDetails, setSelectedDetails] = useState(null);

  // 1. Fetch Job Runs (Tab: jobs)
  const {
    data: jobRunsData,
    isLoading: loadingJobs,
    refetch: refetchJobs,
    isFetching: fetchingJobs,
  } = useQuery({
    queryKey: ['dashboard', 'job_runs', page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('job_runs')
        .select('*', { count: 'exact' })
        .order('ran_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { list: data || [], total: count || 0 };
    },
    enabled: activeTab === 'jobs',
    keepPreviousData: true,
  });

  // 2. Fetch System Audit Logs (Tab: audit)
  const {
    data: auditLogsData,
    isLoading: loadingAudit,
    refetch: refetchAudit,
    isFetching: fetchingAudit,
  } = useQuery({
    queryKey: ['dashboard', 'audit_logs', page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('audit_logs')
        .select(`
          id,
          actor_id,
          action,
          table_name,
          row_id,
          old_data,
          new_data,
          created_at,
          profiles:actor_id (full_name_ar, full_name_en)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { list: data || [], total: count || 0 };
    },
    enabled: activeTab === 'audit',
    keepPreviousData: true,
  });

  const jobsList = jobRunsData?.list || [];
  const jobsTotal = jobRunsData?.total || 0;

  const auditList = auditLogsData?.list || [];
  const auditTotal = auditLogsData?.total || 0;

  const currentTotal = activeTab === 'jobs' ? jobsTotal : auditTotal;
  const totalPages = Math.max(1, Math.ceil(currentTotal / PAGE_SIZE));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(184, 120, 0, 0.12)',
                color: isDark ? '#ffd54f' : '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <h1
              className="gold-gradient-text"
              style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}
            >
              {isAr ? 'سجل العمليات والمهام التلقائية' : 'Audit & Automation Log'}
            </h1>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: isDark ? '#a3a3b2' : '#6b7280', fontSize: '0.88rem' }}>
            {isAr
              ? 'مراقبة العمليات الحساسة وسجل تنفيذ المهام المجدولة (pg_cron & Edge Functions).'
              : 'Monitor sensitive operations and scheduled background routine runs.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => (activeTab === 'jobs' ? refetchJobs() : refetchAudit())}
          className="btn-secondary"
          style={{
            padding: '0.65rem 1.15rem',
            borderRadius: '12px',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <RefreshCw
            size={16}
            className={(activeTab === 'jobs' ? fetchingJobs : fetchingAudit) ? 'animate-spin' : ''}
          />
          <span>{isAr ? 'تحديث السجل' : 'Refresh Log'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.6rem',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e5e7eb',
          paddingBottom: '0.75rem',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('jobs');
            setPage(1);
          }}
          style={{
            background: activeTab === 'jobs'
              ? isDark ? 'rgba(255, 184, 0, 0.18)' : 'rgba(184, 120, 0, 0.15)'
              : 'transparent',
            color: activeTab === 'jobs' ? (isDark ? '#ffd54f' : '#b45309') : isDark ? '#a3a3b2' : '#6b7280',
            border: activeTab === 'jobs'
              ? isDark ? '1px solid rgba(255, 184, 0, 0.4)' : '1px solid #d97706'
              : '1px solid transparent',
            padding: '0.55rem 1.25rem',
            borderRadius: '12px',
            fontWeight: activeTab === 'jobs' ? 800 : 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <Cpu size={16} />
          <span>{isAr ? 'المهام التلقائية (Job Runs)' : 'Job Runs'}</span>
          <span
            style={{
              fontSize: '0.72rem',
              background: 'rgba(255, 184, 0, 0.2)',
              padding: '2px 7px',
              borderRadius: '999px',
            }}
          >
            {jobsTotal}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('audit');
            setPage(1);
          }}
          style={{
            background: activeTab === 'audit'
              ? isDark ? 'rgba(255, 184, 0, 0.18)' : 'rgba(184, 120, 0, 0.15)'
              : 'transparent',
            color: activeTab === 'audit' ? (isDark ? '#ffd54f' : '#b45309') : isDark ? '#a3a3b2' : '#6b7280',
            border: activeTab === 'audit'
              ? isDark ? '1px solid rgba(255, 184, 0, 0.4)' : '1px solid #d97706'
              : '1px solid transparent',
            padding: '0.55rem 1.25rem',
            borderRadius: '12px',
            fontWeight: activeTab === 'audit' ? 800 : 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <Database size={16} />
          <span>{isAr ? 'سجل العمليات (Audit Log)' : 'Audit Log'}</span>
          <span
            style={{
              fontSize: '0.72rem',
              background: 'rgba(255, 184, 0, 0.2)',
              padding: '2px 7px',
              borderRadius: '999px',
            }}
          >
            {auditTotal}
          </span>
        </button>
      </div>

      {/* Tab 1: Job Runs Table */}
      {activeTab === 'jobs' && (
        <DataTable
          columns={[
            {
              key: 'job',
              header: isAr ? 'اسم المهمة' : 'Job Name',
              render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={16} style={{ color: '#ffb800' }} />
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: isDark ? '#ffd54f' : '#b45309' }}>
                    {row.job}
                  </span>
                </div>
              ),
            },
            {
              key: 'ok',
              header: isAr ? 'حالة التنفيذ' : 'Status',
              render: (row) =>
                row.ok ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: '#10b981',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>{isAr ? 'ناجحة' : 'Success'}</span>
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: '#ef4444',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                    }}
                  >
                    <XCircle size={15} />
                    <span>{isAr ? 'فشلت' : 'Failed'}</span>
                  </span>
                ),
            },
            {
              key: 'ran_at',
              header: isAr ? 'تاريخ ووقت التنفيذ' : 'Ran At',
              render: (row) => (
                <div style={{ fontSize: '0.82rem' }}>
                  <div>{formatDateTime(row.ran_at, lang)}</div>
                  <div style={{ color: '#888899', fontSize: '0.74rem' }}>
                    {formatRelativeTime(row.ran_at, lang)}
                  </div>
                </div>
              ),
            },
            {
              key: 'details',
              header: isAr ? 'التفاصيل والنتائج' : 'Details',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => setSelectedDetails({ title: row.job, data: row.details })}
                  className="btn-secondary"
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Eye size={13} />
                  <span>{isAr ? 'عرض JSON' : 'View Details'}</span>
                </button>
              ),
            },
          ]}
          data={jobsList}
          loading={loadingJobs}
          emptyMessage={isAr ? 'لا توجد مهام مجدولة مسجلة بعد' : 'No job runs recorded yet'}
        />
      )}

      {/* Tab 2: System Audit Log Table */}
      {activeTab === 'audit' && (
        <DataTable
          columns={[
            {
              key: 'action',
              header: isAr ? 'العملية' : 'Action',
              render: (row) => (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background:
                      row.action === 'INSERT'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : row.action === 'UPDATE'
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    color:
                      row.action === 'INSERT'
                        ? '#10b981'
                        : row.action === 'UPDATE'
                        ? '#3b82f6'
                        : '#ef4444',
                  }}
                >
                  {row.action}
                </span>
              ),
            },
            {
              key: 'table_name',
              header: isAr ? 'الجدول' : 'Table',
              render: (row) => (
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.table_name}</span>
              ),
            },
            {
              key: 'actor',
              header: isAr ? 'المستخدم' : 'Actor',
              render: (row) => {
                const name =
                  (isAr ? row.profiles?.full_name_ar : row.profiles?.full_name_en) ||
                  row.profiles?.full_name_ar ||
                  (row.actor_id ? row.actor_id.slice(0, 8) + '...' : isAr ? 'النظام' : 'System');
                return <span>{name}</span>;
              },
            },
            {
              key: 'created_at',
              header: isAr ? 'الوقت' : 'Timestamp',
              render: (row) => (
                <div style={{ fontSize: '0.82rem' }}>
                  <div>{formatDateTime(row.created_at, lang)}</div>
                  <div style={{ color: '#888899', fontSize: '0.74rem' }}>
                    {formatRelativeTime(row.created_at, lang)}
                  </div>
                </div>
              ),
            },
            {
              key: 'diff',
              header: isAr ? 'التفاصيل' : 'Changes',
              render: (row) => (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDetails({
                      title: `${row.action} on ${row.table_name}`,
                      data: { old_data: row.old_data, new_data: row.new_data },
                    })
                  }
                  className="btn-secondary"
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Eye size={13} />
                  <span>{isAr ? 'عرض التغييرات' : 'View Diff'}</span>
                </button>
              ),
            },
          ]}
          data={auditList}
          loading={loadingAudit}
          emptyMessage={isAr ? 'لا توجد سجلات تدقيق حتى الآن' : 'No audit records yet'}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            {isAr ? 'السابق' : 'Previous'}
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffd54f', margin: '0 0.5rem' }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            {isAr ? 'التالي' : 'Next'}
          </button>
        </div>
      )}

      {/* JSON Viewer Drawer */}
      <Drawer
        isOpen={Boolean(selectedDetails)}
        onClose={() => setSelectedDetails(null)}
        title={selectedDetails?.title || (isAr ? 'تفاصيل السجل' : 'Record Details')}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <pre
            style={{
              background: isDark ? '#090a0f' : '#f4f5f8',
              color: isDark ? '#ffd54f' : '#1e293b',
              padding: '1.25rem',
              borderRadius: '12px',
              border: isDark ? '1px solid rgba(255, 184, 0, 0.2)' : '1px solid #e2e8f0',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}
          >
            {JSON.stringify(selectedDetails?.data, null, 2)}
          </pre>
          <button
            type="button"
            onClick={() => setSelectedDetails(null)}
            className="btn-primary"
            style={{ padding: '0.65rem', borderRadius: '10px', fontWeight: 700 }}
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </Drawer>
    </div>
  );
}

