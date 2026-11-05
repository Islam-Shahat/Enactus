// src/pages/dashboard/FinancePage.jsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  FileSpreadsheet,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import StatCard from '../../components/dashboard/StatCard';
import {
  formatMoney,
  exportToCsv,
  PAYMENT_KINDS,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  AGREEMENT_STATUSES,
} from '../../lib/businessHelpers';

export default function FinancePage() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [seasonFilter, setSeasonFilter] = useState('');

  // Fetch seasons
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons', 'finance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, is_active')
        .order('is_active', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  // Default active season
  React.useEffect(() => {
    if (seasons.length > 0) {
      setSeasonFilter((prev) => {
        if (prev) return prev;
        const active = seasons.find((s) => s.is_active) || seasons[0];
        return active ? active.id : '';
      });
    }
  }, [seasons]);

  // Fetch agreements with company for this season
  const { data: agreements = [], isLoading: loadingAgreements } = useQuery({
    queryKey: ['finance_agreements', seasonFilter],
    queryFn: async () => {
      let q = supabase
        .from('agreements')
        .select(`
          id,
          title,
          total_value,
          status,
          start_date,
          end_date,
          created_at,
          company:company_id (id, name_ar, name_en, industry)
        `);

      if (seasonFilter) {
        q = q.eq('season_id', seasonFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(seasonFilter),
  });

  // Fetch agreement balances view
  const { data: balances = [] } = useQuery({
    queryKey: ['finance_balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agreement_balances')
        .select('*');
      if (error) return [];
      return data || [];
    },
  });

  // Fetch all payments for agreements in this season
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['finance_payments', seasonFilter],
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
          status,
          created_at,
          agreement:agreement_id (
            id,
            title,
            season_id,
            company:company_id (id, name_ar, name_en)
          )
        `);

      const { data, error } = await q;
      if (error) throw error;

      // Filter in-memory for matching season if seasonFilter is set
      if (seasonFilter) {
        return (data || []).filter((p) => p.agreement?.season_id === seasonFilter);
      }
      return data || [];
    },
    enabled: Boolean(seasonFilter),
  });

  // Calculate Aggregates
  const metrics = useMemo(() => {
    const balanceMap = (balances || []).reduce((acc, b) => {
      acc[b.agreement_id] = b;
      return acc;
    }, {});

    let expectedTotal = 0;
    let collectedTotal = 0;
    let overdueTotal = 0;
    let remainingTotal = 0;

    agreements.forEach((ag) => {
      const val = Number(ag.total_value) || 0;
      expectedTotal += val;
      const b = balanceMap[ag.id];
      if (b) {
        collectedTotal += Number(b.paid_total) || 0;
        overdueTotal += Number(b.overdue_total) || 0;
        remainingTotal += Number(b.remaining) || 0;
      } else {
        remainingTotal += val;
      }
    });

    const collectionRate = expectedTotal > 0 ? Math.round((collectedTotal / expectedTotal) * 100) : 0;

    return {
      expectedTotal,
      collectedTotal,
      overdueTotal,
      remainingTotal,
      collectionRate,
    };
  }, [agreements, balances]);

  // Chart 1: Revenue & Collections per Company (Top 8)
  const companyChartData = useMemo(() => {
    const compMap = {};

    agreements.forEach((ag) => {
      const cName = ag.company
        ? isAr
          ? ag.company.name_ar
          : ag.company.name_en || ag.company.name_ar
        : isAr
        ? 'شركة عامة'
        : 'General';

      if (!compMap[cName]) {
        compMap[cName] = { name: cName, expected: 0, collected: 0 };
      }
      compMap[cName].expected += Number(ag.total_value) || 0;
    });

    payments.forEach((p) => {
      if (p.status === 'paid') {
        const cName = p.agreement?.company
          ? isAr
            ? p.agreement.company.name_ar
            : p.agreement.company.name_en || p.agreement.company.name_ar
          : isAr
          ? 'شركة عامة'
          : 'General';

        if (compMap[cName]) {
          compMap[cName].collected += Number(p.amount) || 0;
        }
      }
    });

    return Object.values(compMap)
      .sort((a, b) => b.expected - a.expected)
      .slice(0, 8);
  }, [agreements, payments, isAr]);

  // Chart 2: Monthly Cash Flow (Collections vs Due)
  const monthlyChartData = useMemo(() => {
    const months = {};

    // Group due payments
    payments.forEach((p) => {
      if (p.due_date) {
        const d = new Date(p.due_date);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const mLabel = d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', year: '2-digit' });
        if (!months[mKey]) {
          months[mKey] = { key: mKey, label: mLabel, due: 0, collected: 0 };
        }
        months[mKey].due += Number(p.amount) || 0;
      }

      if (p.status === 'paid' && p.paid_at) {
        const d = new Date(p.paid_at);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const mLabel = d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', year: '2-digit' });
        if (!months[mKey]) {
          months[mKey] = { key: mKey, label: mLabel, due: 0, collected: 0 };
        }
        months[mKey].collected += Number(p.amount) || 0;
      }
    });

    return Object.keys(months)
      .sort()
      .map((k) => months[k]);
  }, [payments, isAr]);

  const [todayDateStr] = useState(() => new Date().toISOString().split('T')[0]);

  // Chart 3: Payment Status Distribution for Pie Chart
  const statusPieData = useMemo(() => {
    let paidAmt = 0;
    let pendingAmt = 0;
    let overdueAmt = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (p.status === 'paid') {
        paidAmt += amt;
      } else if (p.status === 'overdue' || (p.status === 'pending' && p.due_date && p.due_date < todayDateStr)) {
        overdueAmt += amt;
      } else {
        pendingAmt += amt;
      }
    });

    return [
      { name: isAr ? 'المحصل' : 'Collected', value: paidAmt, color: '#10b981' },
      { name: isAr ? 'قيد الانتظار' : 'Pending', value: pendingAmt, color: '#f59e0b' },
      { name: isAr ? 'المتأخرات' : 'Overdue', value: overdueAmt, color: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [payments, isAr, todayDateStr]);

  // CSV Export for Agreements
  const handleExportAgreementsCsv = () => {
    const balanceMap = (balances || []).reduce((acc, b) => {
      acc[b.agreement_id] = b;
      return acc;
    }, {});

    const cols = [
      {
        key: 'company',
        label: isAr ? 'الشركة' : 'Company',
        getValue: (r) => (r.company ? (isAr ? r.company.name_ar : r.company.name_en || r.company.name_ar) : ''),
      },
      { key: 'title', label: isAr ? 'عنوان الاتفاقية' : 'Agreement Title' },
      { key: 'total_value', label: isAr ? 'القيمة الإجمالية' : 'Total Value' },
      {
        key: 'paid',
        label: isAr ? 'المحصل' : 'Paid',
        getValue: (r) => balanceMap[r.id]?.paid_total ?? 0,
      },
      {
        key: 'remaining',
        label: isAr ? 'المتبقي' : 'Remaining',
        getValue: (r) => balanceMap[r.id]?.remaining ?? r.total_value,
      },
      {
        key: 'status',
        label: isAr ? 'الحالة' : 'Status',
        getValue: (r) => AGREEMENT_STATUSES.find((s) => s.key === r.status)?.label[lang] || r.status,
      },
      { key: 'start_date', label: isAr ? 'تاريخ البداية' : 'Start Date' },
      { key: 'end_date', label: isAr ? 'تاريخ النهاية' : 'End Date' },
    ];

    exportToCsv(`Enactus_Agreements_Finance_${Date.now()}`, agreements, cols);
  };

  // CSV Export for Payments
  const handleExportPaymentsCsv = () => {
    const cols = [
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
      { key: 'amount', label: isAr ? 'المبلغ' : 'Amount' },
      {
        key: 'status',
        label: isAr ? 'الحالة' : 'Status',
        getValue: (r) => PAYMENT_STATUSES.find((s) => s.key === r.status)?.label[lang] || r.status,
      },
      { key: 'due_date', label: isAr ? 'تاريخ الاستحقاق' : 'Due Date' },
      {
        key: 'paid_at',
        label: isAr ? 'تاريخ الدفع' : 'Paid At',
        getValue: (r) => (r.paid_at ? new Date(r.paid_at).toLocaleDateString() : ''),
      },
      {
        key: 'method',
        label: isAr ? 'طريقة الدفع' : 'Method',
        getValue: (r) => PAYMENT_METHODS[r.method]?.[lang] || r.method || '',
      },
    ];

    exportToCsv(`Enactus_Payments_Finance_${Date.now()}`, payments, cols);
  };

  const isLoading = loadingAgreements || loadingPayments;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 900, color: '#fff' }}>
            {isAr ? 'المركز المالي وإحصائيات الرعايات' : 'Financial Overview & Analytics'}
          </h1>
          <p style={{ color: '#a0a0b2', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isAr
              ? 'متابعة التدفق النقدي، نسب التحصيل، التزامات الشركات، وإجمالي الإيرادات'
              : 'Cash flow analytics, collection rates, corporate commitments & revenue'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Season Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={16} color="#ffb800" />
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="dashboard-input"
              style={{ padding: '0.55rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_active ? (isAr ? '(الموسم الحالي)' : '(Active)') : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Export Dropdown / Buttons */}
          <button
            type="button"
            onClick={handleExportAgreementsCsv}
            disabled={agreements.length === 0}
            className="btn-secondary"
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={15} color="#34d399" />
            <span>{isAr ? 'تصدير العقود' : 'Export Contracts'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPaymentsCsv}
            disabled={payments.length === 0}
            className="btn-secondary"
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={15} color="#60a5fa" />
            <span>{isAr ? 'تصدير الدفعات' : 'Export Payments'}</span>
          </button>
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
          title={isAr ? 'إجمالي الإيراد المتوقع' : 'Expected Revenue'}
          value={formatMoney(metrics.expectedTotal, lang)}
          icon={TrendingUp}
          subtitle={isAr ? 'إجمالي قيمة عقود الرعاية للموسم' : 'Total contracted sponsorships'}
          isLoading={isLoading}
        />

        <StatCard
          title={isAr ? 'المبالغ المحصلة فعلياً' : 'Collected Cash'}
          value={formatMoney(metrics.collectedTotal, lang)}
          icon={DollarSign}
          subtitle={`${isAr ? 'نسبة التحصيل: ' : 'Collection rate: '}${metrics.collectionRate}%`}
          isLoading={isLoading}
        />

        <StatCard
          title={isAr ? 'المتبقي قيد التحصيل' : 'Remaining Balance'}
          value={formatMoney(metrics.remainingTotal, lang)}
          icon={Clock}
          subtitle={isAr ? 'أقساط مجدولة قادمة' : 'Scheduled incoming'}
          isLoading={isLoading}
        />

        <StatCard
          title={isAr ? 'إجمالي المتأخرات' : 'Overdue Amount'}
          value={formatMoney(metrics.overdueTotal, lang)}
          icon={AlertTriangle}
          subtitle={isAr ? 'دفعات تجاوزت موعد الاستحقاق' : 'Past due installments'}
          isLoading={isLoading}
        />
      </div>

      {/* Chart Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Chart 1: Revenue by Company */}
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 184, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minHeight: '380px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="#ffb800" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
              {isAr ? 'الإيرادات والمتحصلات حسب الشركة الشريكة' : 'Revenue & Collections by Company'}
            </h3>
          </div>

          {companyChartData.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#88889a' }}>
              {isAr ? 'لا توجد بيانات مسجلة لهذا الموسم' : 'No corporate data recorded'}
            </div>
          ) : (
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyChartData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#88889a"
                    fontSize={12}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis stroke="#88889a" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(18, 20, 28, 0.95)',
                      borderColor: 'rgba(255, 184, 0, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value) => [formatMoney(value, lang)]}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#c5c5d6' }} />
                  <Bar
                    dataKey="expected"
                    name={isAr ? 'المتفق عليه' : 'Expected'}
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="collected"
                    name={isAr ? 'المحصل' : 'Collected'}
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Cash Flow Timeline */}
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 184, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minHeight: '380px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} color="#ffb800" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
              {isAr ? 'التدفق المالي شهرياً (الاستحقاق مقابل التحصيل)' : 'Monthly Cash Flow (Due vs Collected)'}
            </h3>
          </div>

          {monthlyChartData.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#88889a' }}>
              {isAr ? 'لا توجد دفعات مجدولة' : 'No payments scheduled'}
            </div>
          ) : (
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                  <XAxis dataKey="label" stroke="#88889a" fontSize={12} />
                  <YAxis stroke="#88889a" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(18, 20, 28, 0.95)',
                      borderColor: 'rgba(255, 184, 0, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value) => [formatMoney(value, lang)]}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#c5c5d6' }} />
                  <Area
                    type="monotone"
                    dataKey="due"
                    name={isAr ? 'المستحق' : 'Due'}
                    stroke="#f59e0b"
                    fill="rgba(245, 158, 11, 0.2)"
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name={isAr ? 'المحصل' : 'Collected'}
                    stroke="#10b981"
                    fill="rgba(16, 185, 129, 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Chart 3: Collection Status Split */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 184, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PieIcon size={18} color="#ffb800" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
            {isAr ? 'توزيع نسب ومبالغ الدفعات' : 'Collection Status Distribution'}
          </h3>
        </div>

        {statusPieData.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#88889a' }}>
            {isAr ? 'لا توجد دفعات' : 'No payments'}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ width: '280px', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(18, 20, 28, 0.95)',
                      borderColor: 'rgba(255, 184, 0, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value) => [formatMoney(value, lang)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {statusPieData.map((item) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: item.color }} />
                  <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{item.name}:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: item.color }}>
                    {formatMoney(item.value, lang)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
