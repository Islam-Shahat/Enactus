// src/pages/dashboard/PaymentsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import DataTable from '../../components/dashboard/DataTable';
import StatCard from '../../components/dashboard/StatCard';
import StatusBadge from '../../components/dashboard/StatusBadge';
import EmptyState from '../../components/dashboard/EmptyState';
import RecordPaymentModal from '../../components/dashboard/business/RecordPaymentModal';
import ConfirmPaymentDialog from '../../components/dashboard/business/ConfirmPaymentDialog';
import ReceiptViewerModal from '../../components/dashboard/business/ReceiptViewerModal';
import {
  formatMoney,
  PAYMENT_KINDS,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  getPaymentDueStatus,
  exportToCsv,
} from '../../lib/businessHelpers';

const PAGE_SIZE = 15;

export default function PaymentsPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const isPrOrExec = isSuperAdmin || hasRole(['pr_admin', 'president', 'vice_president']);
  const isFinanceOrExec = isSuperAdmin || hasRole(['finance_admin', 'president', 'vice_president']);

  // Tabs: 'all' | 'overdue' | 'due_soon' | 'paid' | 'pending'
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Modals state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);

  // Fetch payments query
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', 'page_list', activeTab, kindFilter, search, page],
    queryFn: async () => {
      let q = supabase
        .from('payments')
        .select(`
          id,
          agreement_id,
          kind,
          amount,
          due_date,
          paid_at,
          method,
          receipt_path,
          status,
          notes,
          created_at,
          agreement:agreement_id (
            id,
            title,
            company:company_id (id, name_ar, name_en)
          ),
          recorder:recorded_by (id, full_name_ar, full_name_en),
          confirmer:confirmed_by (id, full_name_ar, full_name_en)
        `, { count: 'exact' });

      // Tab filtering
      const todayStr = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (activeTab === 'overdue') {
        q = q.or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${todayStr})`);
      } else if (activeTab === 'due_soon') {
        q = q
          .eq('status', 'pending')
          .gte('due_date', todayStr)
          .lte('due_date', nextWeek);
      } else if (activeTab === 'paid') {
        q = q.eq('status', 'paid');
      } else if (activeTab === 'pending') {
        q = q.eq('status', 'pending');
      }

      if (kindFilter !== 'all') {
        q = q.eq('kind', kindFilter);
      }

      q = q.order('due_date', { ascending: true });

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      q = q.range(from, to);

      const { data, count, error } = await q;
      if (error) throw error;
      return { list: data || [], total: count || 0 };
    },
  });

  const payments = paymentsData?.list || [];
  const totalCount = paymentsData?.total || 0;

  // Global counts for stat cards
  const { data: statsData } = useQuery({
    queryKey: ['payments', 'aggregate_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, status, due_date');
      if (error) return null;

      const todayStr = new Date().toISOString().split('T')[0];
      const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let collectedTotal = 0;
      let overdueTotal = 0;
      let dueSoonTotal = 0;
      let pendingTotal = 0;

      (data || []).forEach((p) => {
        const amt = Number(p.amount) || 0;
        if (p.status === 'paid') {
          collectedTotal += amt;
        } else if (p.status === 'overdue' || (p.status === 'pending' && p.due_date && p.due_date < todayStr)) {
          overdueTotal += amt;
        } else if (p.status === 'pending' && p.due_date && p.due_date >= todayStr && p.due_date <= nextWeekStr) {
          dueSoonTotal += amt;
        } else if (p.status === 'pending') {
          pendingTotal += amt;
        }
      });

      return { collectedTotal, overdueTotal, dueSoonTotal, pendingTotal };
    },
  });

  // Client-side CSV export
  const handleExportCsv = () => {
    if (payments.length === 0) return;

    const columns = [
      {
        key: 'company',
        label: isAr ? 'الشركة' : 'Company',
        getValue: (r) =>
          r.agreement?.company
            ? isAr
              ? r.agreement.company.name_ar
              : r.agreement.company.name_en || r.agreement.company.name_ar
            : '',
      },
      {
        key: 'agreement',
        label: isAr ? 'الاتفاقية' : 'Agreement',
        getValue: (r) => r.agreement?.title || '',
      },
      {
        key: 'kind',
        label: isAr ? 'نوع الدفعة' : 'Kind',
        getValue: (r) => PAYMENT_KINDS[r.kind]?.[lang] || r.kind,
      },
      {
        key: 'amount',
        label: isAr ? 'المبلغ' : 'Amount',
        getValue: (r) => r.amount,
      },
      {
        key: 'status',
        label: isAr ? 'الحالة' : 'Status',
        getValue: (r) => PAYMENT_STATUSES.find((s) => s.key === r.status)?.label[lang] || r.status,
      },
      {
        key: 'due_date',
        label: isAr ? 'تاريخ الاستحقاق' : 'Due Date',
        getValue: (r) => r.due_date || '',
      },
      {
        key: 'paid_at',
        label: isAr ? 'تاريخ الدفع' : 'Paid Date',
        getValue: (r) => (r.paid_at ? new Date(r.paid_at).toLocaleDateString() : ''),
      },
      {
        key: 'method',
        label: isAr ? 'طريقة الدفع' : 'Method',
        getValue: (r) => PAYMENT_METHODS[r.method]?.[lang] || r.method || '',
      },
    ];

    exportToCsv(`Enactus_Payments_${activeTab}_${Date.now()}`, payments, columns);
  };

  const columns = [
    {
      key: 'agreement',
      label: isAr ? 'الاتفاقية / الشركة' : 'Agreement / Company',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>
            {row.agreement?.title || '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#ffd54f', marginTop: '0.2rem' }}>
            {row.agreement?.company
              ? isAr
                ? row.agreement.company.name_ar
                : row.agreement.company.name_en || row.agreement.company.name_ar
              : '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'kind',
      label: isAr ? 'نوع الدفعة' : 'Kind',
      render: (row) => (
        <span
          style={{
            padding: '0.2rem 0.55rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(255, 184, 0, 0.1)',
            color: '#ffb800',
          }}
        >
          {PAYMENT_KINDS[row.kind]?.[lang] || PAYMENT_KINDS[row.kind]?.ar || row.kind}
        </span>
      ),
    },
    {
      key: 'amount',
      label: isAr ? 'المبلغ' : 'Amount',
      render: (row) => (
        <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
          {formatMoney(row.amount, lang)}
        </span>
      ),
    },
    {
      key: 'due_date',
      label: isAr ? 'تاريخ الاستحقاق' : 'Due Date',
      render: (row) => {
        const dueCalc = getPaymentDueStatus(row.due_date, row.status);
        return (
          <div>
            <div style={{ fontSize: '0.85rem', color: '#c5c5d6' }}>{row.due_date || '—'}</div>
            {dueCalc.status === 'overdue' && (
              <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700 }}>
                {isAr ? `متأخر ${dueCalc.daysDiff} يوم` : `${dueCalc.daysDiff}d overdue`}
              </span>
            )}
            {dueCalc.status === 'due_soon' && (
              <span style={{ fontSize: '0.75rem', color: '#facc15', fontWeight: 700 }}>
                {isAr ? `مستحق خلال ${dueCalc.daysDiff} يوم` : `Due in ${dueCalc.daysDiff}d`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: isAr ? 'الحالة' : 'Status',
      render: (row) => {
        const st = PAYMENT_STATUSES.find((s) => s.key === row.status);
        return (
          <span
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: st?.color || 'rgba(255, 255, 255, 0.1)',
              color: st?.text || '#fff',
            }}
          >
            {st?.label[lang] || st?.label.ar || row.status}
          </span>
        );
      },
    },
    {
      key: 'receipt',
      label: isAr ? 'الإيصال' : 'Receipt',
      render: (row) =>
        row.receipt_path ? (
          <button
            type="button"
            onClick={() =>
              setViewerFile({
                path: row.receipt_path,
                title: `${isAr ? 'إيصال دفعة' : 'Receipt'} - ${formatMoney(row.amount, lang)}`,
              })
            }
            className="btn-secondary"
            style={{
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer',
            }}
          >
            <Eye size={12} color="#ffb800" />
            <span>{isAr ? 'عرض' : 'View'}</span>
          </button>
        ) : (
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{isAr ? 'لا يوجد' : 'None'}</span>
        ),
    },
    {
      key: 'actions',
      label: isAr ? 'الإجراء' : 'Actions',
      align: 'right',
      render: (row) => {
        if (row.status === 'pending' && isFinanceOrExec) {
          return (
            <button
              type="button"
              onClick={() => setPaymentToConfirm(row)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Check size={12} />
              <span>{isAr ? 'تأكيد' : 'Confirm'}</span>
            </button>
          );
        }
        if (row.status === 'paid') {
          return (
            <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
              <CheckCircle2 size={13} />
              <span>{isAr ? 'مؤكد' : 'Confirmed'}</span>
            </span>
          );
        }
        return <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>—</span>;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 900, color: '#fff' }}>
            {isAr ? 'الدفعات والتحصيلات المالية' : 'Payments & Collections'}
          </h1>
          <p style={{ color: '#a0a0b2', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isAr
              ? 'تسجيل إيصالات التحصيل ومتابعة الدفعات المستحقة وتأكيد الخزينة'
              : 'Record manual receipts, track due dates, and confirm treasury receipts'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={payments.length === 0}
            className="btn-secondary"
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={16} color="#34d399" />
            <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>

          {isPrOrExec && (
            <button
              type="button"
              onClick={() => setShowRecordModal(true)}
              className="btn-primary"
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              <span>{isAr ? 'تسجيل دفعة جديدة' : 'Record Payment'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <StatCard
          title={isAr ? 'إجمالي المحصل المؤكد' : 'Total Collected'}
          value={formatMoney(statsData?.collectedTotal ?? 0, lang)}
          icon={CheckCircle2}
          subtitle={isAr ? 'تم استلامه في الخزينة' : 'Confirmed in treasury'}
        />
        <StatCard
          title={isAr ? 'المتأخرات غير المحصلة' : 'Overdue Payments'}
          value={formatMoney(statsData?.overdueTotal ?? 0, lang)}
          icon={AlertTriangle}
          subtitle={isAr ? 'تجاوزت تاريخ الاستحقاق' : 'Past due date'}
        />
        <StatCard
          title={isAr ? 'مستحق خلال 7 أيام' : 'Due in 7 Days'}
          value={formatMoney(statsData?.dueSoonTotal ?? 0, lang)}
          icon={Clock}
          subtitle={isAr ? 'يتطلب المتابعة والتحصيل' : 'Upcoming collections'}
        />
        <StatCard
          title={isAr ? 'معلق في انتظار التأكيد' : 'Pending Confirmation'}
          value={formatMoney(statsData?.pendingTotal ?? 0, lang)}
          icon={DollarSign}
          subtitle={isAr ? 'سُجل بواسطة PR وبانتظار المالية' : 'Awaiting finance sign-off'}
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        {[
          { key: 'all', label: isAr ? 'جميع الدفعات' : 'All Payments' },
          { key: 'overdue', label: isAr ? '⚠️ المتأخرات' : '⚠️ Overdue' },
          { key: 'due_soon', label: isAr ? '⏳ مستحق قريباً (7 أيام)' : '⏳ Due in 7 Days' },
          { key: 'pending', label: isAr ? 'قيد الانتظار' : 'Pending' },
          { key: 'paid', label: isAr ? 'المؤكد والمدفوع' : 'Confirmed & Paid' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === tab.key ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
              color: activeTab === tab.key ? '#ffb800' : '#a0a0b2',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem',
          borderRadius: '14px',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="#ffd54f" />
          <select
            value={kindFilter}
            onChange={(e) => {
              setKindFilter(e.target.value);
              setPage(1);
            }}
            className="dashboard-input"
            style={{ padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="all">{isAr ? '-- جميع أنواع الدفعات --' : '-- All Payment Kinds --'}</option>
            {Object.entries(PAYMENT_KINDS).map(([key, obj]) => (
              <option key={key} value={key}>
                {obj[lang] || obj.ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={(p) => setPage(p)}
        emptyMessage={isAr ? 'لا توجد دفعات مسجلة في هذا القسم' : 'No payments found'}
      />

      {/* Record Payment Modal */}
      {showRecordModal && (
        <RecordPaymentModal
          isOpen={showRecordModal}
          onClose={() => setShowRecordModal(false)}
        />
      )}

      {/* Confirm Payment Dialog */}
      {paymentToConfirm && (
        <ConfirmPaymentDialog
          isOpen={Boolean(paymentToConfirm)}
          onClose={() => setPaymentToConfirm(null)}
          payment={paymentToConfirm}
        />
      )}

      {/* Receipt Viewer Modal */}
      {viewerFile && (
        <ReceiptViewerModal
          isOpen={Boolean(viewerFile)}
          onClose={() => setViewerFile(null)}
          filePath={viewerFile.path}
          title={viewerFile.title}
        />
      )}
    </div>
  );
}

