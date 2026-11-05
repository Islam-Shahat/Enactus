// src/pages/dashboard/AgreementsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  Search,
  Filter,
  DollarSign,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import DataTable from '../../components/dashboard/DataTable';
import StatCard from '../../components/dashboard/StatCard';
import StatusBadge from '../../components/dashboard/StatusBadge';
import CreateAgreementModal from '../../components/dashboard/business/CreateAgreementModal';
import AgreementDetailDrawer from '../../components/dashboard/business/AgreementDetailDrawer';
import {
  formatMoney,
  AGREEMENT_STATUSES,
  SPONSOR_TIERS,
} from '../../lib/businessHelpers';
import { getSignedFileUrl } from '../../lib/businessStorage';

const PAGE_SIZE = 12;
const EMPTY_LIST = [];

export default function AgreementsPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const canWrite = isSuperAdmin || hasRole(['pr_admin', 'president', 'vice_president']);

  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [selectedAgreementId, setSelectedAgreementId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch seasons for filter
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons', 'filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, is_active')
        .order('is_active', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  // Default season to active
  React.useEffect(() => {
    if (seasons.length > 0 && !seasonFilter) {
      const active = seasons.find((s) => s.is_active) || seasons[0];
      setSeasonFilter(active.id);
    }
  }, [seasons, seasonFilter]);

  // Fetch agreements with joined company, package, balances
  const { data: agreementsData, isLoading } = useQuery({
    queryKey: ['agreements', seasonFilter, statusFilter, search, page],
    queryFn: async () => {
      let q = supabase
        .from('agreements')
        .select(`
          id,
          title,
          total_value,
          start_date,
          end_date,
          contract_path,
          status,
          created_at,
          company:company_id (id, name_ar, name_en),
          package:package_id (id, name_ar, name_en, tier),
          owner:owner_id (id, full_name_ar, full_name_en)
        `, { count: 'exact' });

      if (seasonFilter) {
        q = q.eq('season_id', seasonFilter);
      }

      if (statusFilter && statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }

      if (search.trim()) {
        q = q.or(`title.ilike.%${search.trim()}%,notes.ilike.%${search.trim()}%`);
      }

      q = q.order('created_at', { ascending: false });

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      q = q.range(from, to);

      const { data: agreements, count, error } = await q;
      if (error) throw error;

      // Fetch corresponding balances from agreement_balances view
      const agreementIds = (agreements || []).map((a) => a.id);
      let balanceMap = {};
      if (agreementIds.length > 0) {
        const { data: balances } = await supabase
          .from('agreement_balances')
          .select('*')
          .in('agreement_id', agreementIds);

        balanceMap = (balances || []).reduce((acc, b) => {
          acc[b.agreement_id] = b;
          return acc;
        }, {});
      }

      const merged = (agreements || []).map((ag) => ({
        ...ag,
        paid_total: balanceMap[ag.id]?.paid_total ?? 0,
        remaining: balanceMap[ag.id]?.remaining ?? ag.total_value,
        overdue_total: balanceMap[ag.id]?.overdue_total ?? 0,
      }));

      return { list: merged, total: count || 0 };
    },
    enabled: Boolean(seasonFilter),
  });

  const agreements = agreementsData?.list || EMPTY_LIST;
  const totalCount = agreementsData?.total || 0;

  // Compute aggregate stats across currently loaded agreements
  const stats = React.useMemo(() => {
    let totalContracted = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalOverdue = 0;

    agreements.forEach((a) => {
      totalContracted += Number(a.total_value) || 0;
      totalPaid += Number(a.paid_total) || 0;
      totalRemaining += Number(a.remaining) || 0;
      totalOverdue += Number(a.overdue_total) || 0;
    });

    return { totalContracted, totalPaid, totalRemaining, totalOverdue };
  }, [agreements]);

  const columns = [
    {
      key: 'title',
      label: isAr ? 'الاتفاقية / الشركة' : 'Agreement / Company',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.92rem' }}>{row.title}</div>
          <div style={{ fontSize: '0.8rem', color: '#ffd54f', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
            <Building2 size={12} />
            <span>
              {row.company
                ? isAr
                  ? row.company.name_ar
                  : row.company.name_en || row.company.name_ar
                : '—'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'package',
      label: isAr ? 'الباقة' : 'Package',
      render: (row) => {
        if (!row.package) {
          return <span style={{ color: '#88889a', fontSize: '0.8rem' }}>{isAr ? 'مخصص' : 'Custom'}</span>;
        }
        const tier = SPONSOR_TIERS[row.package.tier];
        return (
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(255, 184, 0, 0.12)',
              color: tier?.color || '#ffb800',
            }}
          >
            {isAr ? row.package.name_ar : row.package.name_en}
          </span>
        );
      },
    },
    {
      key: 'total_value',
      label: isAr ? 'القيمة الإجمالية' : 'Total Value',
      render: (row) => (
        <span style={{ fontWeight: 800, color: '#fff' }}>
          {formatMoney(row.total_value, lang)}
        </span>
      ),
    },
    {
      key: 'paid_total',
      label: isAr ? 'المحصل' : 'Collected',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#34d399' }}>
          {formatMoney(row.paid_total, lang)}
        </span>
      ),
    },
    {
      key: 'remaining',
      label: isAr ? 'المتبقي' : 'Remaining',
      render: (row) => (
        <span style={{ fontWeight: 700, color: row.remaining > 0 ? '#60a5fa' : '#34d399' }}>
          {formatMoney(row.remaining, lang)}
        </span>
      ),
    },
    {
      key: 'status',
      label: isAr ? 'الحالة' : 'Status',
      render: (row) => {
        const st = AGREEMENT_STATUSES.find((s) => s.key === row.status);
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
      key: 'actions',
      label: isAr ? 'تفاصيل' : 'Details',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedAgreementId(row.id)}
          className="btn-secondary"
          style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
        >
          {isAr ? 'عرض العقد' : 'View'}
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 900, color: '#fff' }}>
            {isAr ? 'الاتفاقيات وعقود الرعاية' : 'Sponsorship Agreements'}
          </h1>
          <p style={{ color: '#a0a0b2', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isAr
              ? 'إدارة العقود المبرمة، تتبع الأقساط والمبالغ المحصلة، والالتزامات المتبادلة'
              : 'Contract lifecycle, payment tracking, remaining balances, and deliverables'}
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
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
            <span>{isAr ? 'إنشاء اتفاقية جديدة' : 'New Agreement'}</span>
          </button>
        )}
      </div>

      {/* Aggregate Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <StatCard
          title={isAr ? 'إجمالي قيمة الاتفاقيات' : 'Total Contracted'}
          value={formatMoney(stats.totalContracted, lang)}
          icon={FileText}
          subtitle={isAr ? 'القيمة المتفق عليها في الموسم' : 'Total sponsorship value'}
        />
        <StatCard
          title={isAr ? 'المبالغ المحصلة' : 'Collected Payments'}
          value={formatMoney(stats.totalPaid, lang)}
          icon={DollarSign}
          subtitle={isAr ? 'تم استلامها وتأكيدها بالخزينة' : 'Confirmed received'}
        />
        <StatCard
          title={isAr ? 'المبالغ المتبقية' : 'Remaining Balance'}
          value={formatMoney(stats.totalRemaining, lang)}
          icon={Calendar}
          subtitle={isAr ? 'في انتظار استحقاقها وتحصيلها' : 'Pending collection'}
        />
        {stats.totalOverdue > 0 && (
          <StatCard
            title={isAr ? 'دفعات متأخرة' : 'Overdue Amount'}
            value={formatMoney(stats.totalOverdue, lang)}
            icon={AlertCircle}
            subtitle={isAr ? 'تجاوزت تاريخ الاستحقاق' : 'Past due date'}
          />
        )}
      </div>

      {/* Filter / Search Bar */}
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
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%),',
              insetInlineStart: '12px',
              color: '#88889a',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث بعنوان الاتفاقية...' : 'Search agreement title...'}
            className="dashboard-input"
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              paddingInlineStart: '36px',
              borderRadius: '8px',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={seasonFilter}
            onChange={(e) => {
              setSeasonFilter(e.target.value);
              setPage(1);
            }}
            className="dashboard-input"
            style={{ padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_active ? (isAr ? '(الموسم الحالي)' : '(Active)') : ''}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="dashboard-input"
            style={{ padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="all">{isAr ? '-- جميع الحالات --' : '-- All Statuses --'}</option>
            {AGREEMENT_STATUSES.map((st) => (
              <option key={st.key} value={st.key}>
                {st.label[lang] || st.label.ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={agreements}
        isLoading={isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={(p) => setPage(p)}
        onRowClick={(row) => setSelectedAgreementId(row.id)}
        emptyMessage={isAr ? 'لا توجد اتفاقيات مطابقة' : 'No agreements found'}
      />

      {/* Create Agreement Modal */}
      {showCreateModal && (
        <CreateAgreementModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newAg) => setSelectedAgreementId(newAg.id)}
        />
      )}

      {/* Agreement Detail Drawer */}
      {selectedAgreementId && (
        <AgreementDetailDrawer
          isOpen={Boolean(selectedAgreementId)}
          onClose={() => setSelectedAgreementId(null)}
          agreementId={selectedAgreementId}
        />
      )}
    </div>
  );
}

