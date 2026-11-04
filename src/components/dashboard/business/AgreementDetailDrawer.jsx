// src/components/dashboard/business/AgreementDetailDrawer.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  CheckCircle2,
  Calendar,
  Download,
  Plus,
  CreditCard,
  Layers,
  Eye,
  Check,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../Toast';
import Drawer from '../Drawer';
import {
  formatMoney,
  AGREEMENT_STATUSES,
  PAYMENT_KINDS,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  DELIVERABLE_KINDS,
  calculateDeliverableProgress,
  getPaymentDueStatus,
} from '../../../lib/businessHelpers';
import { getSignedFileUrl } from '../../../lib/businessStorage';
import RecordPaymentModal from './RecordPaymentModal';
import ConfirmPaymentDialog from './ConfirmPaymentDialog';
import AddDeliverableModal from './AddDeliverableModal';
import ReceiptViewerModal from './ReceiptViewerModal';

export default function AgreementDetailDrawer({ isOpen, onClose, agreementId }) {
  const { isSuperAdmin, hasRole } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const isPrOrExec = isSuperAdmin || hasRole(['pr_admin', 'president', 'vice_president']);
  const isFinanceOrExec = isSuperAdmin || hasRole(['finance_admin', 'president', 'vice_president']);

  // Tabs: 'overview' | 'payments' | 'deliverables'
  const [activeTab, setActiveTab] = useState('overview');

  // Modals state
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);

  // Fetch agreement details + company + package
  const { data: agreement, isLoading: loadingAgreement } = useQuery({
    queryKey: ['agreement', agreementId],
    queryFn: async () => {
      if (!agreementId) return null;
      const { data, error } = await supabase
        .from('agreements')
        .select(`
          id,
          title,
          total_value,
          start_date,
          end_date,
          contract_path,
          status,
          notes,
          created_at,
          company:company_id (id, name_ar, name_en, industry),
          package:package_id (id, name_ar, name_en, tier, price),
          owner:owner_id (id, full_name_ar, full_name_en)
        `)
        .eq('id', agreementId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && Boolean(agreementId),
  });

  // Fetch agreement balance from view
  const { data: balance } = useQuery({
    queryKey: ['agreement_balance', agreementId],
    queryFn: async () => {
      if (!agreementId) return null;
      const { data, error } = await supabase
        .from('agreement_balances')
        .select('*')
        .eq('agreement_id', agreementId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: isOpen && Boolean(agreementId),
  });

  // Fetch agreement payments
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', agreementId],
    queryFn: async () => {
      if (!agreementId) return [];
      const { data, error } = await supabase
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
          recorder:recorded_by (id, full_name_ar, full_name_en),
          confirmer:confirmed_by (id, full_name_ar, full_name_en)
        `)
        .eq('agreement_id', agreementId)
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: isOpen && Boolean(agreementId),
  });

  // Fetch deliverables + progress from deliverable_progress view + published posts
  const { data: deliverables = [] } = useQuery({
    queryKey: ['deliverables', agreementId],
    queryFn: async () => {
      if (!agreementId) return [];
      const { data: delivs, error: dErr } = await supabase
        .from('deliverables')
        .select(`
          id,
          agreement_id,
          company_id,
          kind,
          title,
          required_count,
          due_date,
          created_at,
          post_deliverables (
            post:post_id (
              id,
              title,
              platform,
              status,
              published_at,
              post_url
            )
          )
        `)
        .eq('agreement_id', agreementId)
        .order('created_at', { ascending: true });

      if (dErr) return [];

      // Query deliverable_progress view
      const { data: progressRows } = await supabase
        .from('deliverable_progress')
        .select('*')
        .eq('agreement_id', agreementId);

      const progressMap = (progressRows || []).reduce((acc, row) => {
        acc[row.deliverable_id] = row.done_count || 0;
        return acc;
      }, {});

      return (delivs || []).map((d) => ({
        ...d,
        done_count: progressMap[d.id] ?? 0,
      }));
    },
    enabled: isOpen && Boolean(agreementId),
  });

  // Update Agreement Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const { error } = await supabase
        .from('agreements')
        .update({ status: newStatus })
        .eq('id', agreementId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم تحديث حالة الاتفاقية' : 'Agreement status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      queryClient.invalidateQueries({ queryKey: ['agreement', agreementId] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل التحديث' : 'Update failed'), 'error');
    },
  });

  const handleContractDownload = async () => {
    if (!agreement?.contract_path) return;
    const url = await getSignedFileUrl('contracts', agreement.contract_path, 60);
    if (url) {
      window.open(url, '_blank', 'noreferrer');
    } else {
      toast.show(isAr ? 'تعذر تحميل ملف العقد' : 'Failed to download contract', 'error');
    }
  };

  const statusObj = AGREEMENT_STATUSES.find((s) => s.key === agreement?.status);

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        width="720px"
        title={agreement?.title || (isAr ? 'تفاصيل الاتفاقية' : 'Agreement Details')}
        subtitle={
          agreement?.company
            ? isAr
              ? agreement.company.name_ar
              : agreement.company.name_en || agreement.company.name_ar
            : null
        }
      >
        {loadingAgreement ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ffb800' }}>
            {isAr ? 'جاري التحميل...' : 'Loading agreement...'}
          </div>
        ) : !agreement ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
            {isAr ? 'الاتفاقية غير موجودة' : 'Agreement not found'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem' }}>
            {/* Balance Overview Pill Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div
                className="glass-panel"
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 184, 0, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.25)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#ffd54f', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {isAr ? 'القيمة الإجمالية' : 'Total Value'}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
                  {formatMoney(agreement.total_value, lang)}
                </div>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {isAr ? 'المبلغ المحصل' : 'Collected'}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#34d399' }}>
                  {formatMoney(balance?.paid_total ?? 0, lang)}
                </div>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.04)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {isAr ? 'المتبقي' : 'Remaining'}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#60a5fa' }}>
                  {formatMoney(balance?.remaining ?? agreement.total_value, lang)}
                </div>
              </div>

              {(balance?.overdue_total ?? 0) > 0 && (
                <div
                  className="glass-panel"
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {isAr ? 'المتأخرات' : 'Overdue'}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f87171' }}>
                    {formatMoney(balance.overdue_total, lang)}
                  </div>
                </div>
              )}
            </div>

            {/* Tab navigation pills */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '0.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'overview' ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
                  color: activeTab === 'overview' ? '#ffb800' : '#a0a0b2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <FileText size={15} />
                {isAr ? 'نظرة عامة' : 'Overview'}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'payments' ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
                  color: activeTab === 'payments' ? '#ffb800' : '#a0a0b2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <CreditCard size={15} />
                {isAr ? 'الدفعات والتحصيل' : 'Payments'} ({payments.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('deliverables')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'deliverables' ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
                  color: activeTab === 'deliverables' ? '#ffb800' : '#a0a0b2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Layers size={15} />
                {isAr ? 'التسليمات والالتزامات' : 'Deliverables'} ({deliverables.length})
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#c5c5d6' }}>{isAr ? 'الحالة الحالية:' : 'Status:'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          backgroundColor: statusObj?.color || 'rgba(255, 255, 255, 0.1)',
                          color: statusObj?.text || '#fff',
                        }}
                      >
                        {statusObj?.label[lang] || statusObj?.label.ar || agreement.status}
                      </span>
                      {isPrOrExec && (
                        <select
                          value={agreement.status}
                          onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                          disabled={updateStatusMutation.isPending}
                          className="dashboard-input"
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            background: '#161822',
                            color: '#fff',
                          }}
                        >
                          {AGREEMENT_STATUSES.map((st) => (
                            <option key={st.key} value={st.key}>
                              {st.label[lang] || st.label.ar}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.8rem',
                      fontSize: '0.85rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div>
                      <span style={{ color: '#88889a' }}>{isAr ? 'الشركة:' : 'Company:'} </span>
                      <strong style={{ color: '#fff' }}>
                        {agreement.company
                          ? isAr
                            ? agreement.company.name_ar
                            : agreement.company.name_en || agreement.company.name_ar
                          : '—'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: '#88889a' }}>{isAr ? 'الباقة:' : 'Package:'} </span>
                      <strong style={{ color: '#ffd54f' }}>
                        {agreement.package
                          ? isAr
                            ? agreement.package.name_ar
                            : agreement.package.name_en
                          : isAr
                          ? 'مخصص'
                          : 'Custom'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: '#88889a' }}>{isAr ? 'تاريخ البداية:' : 'Start Date:'} </span>
                      <span style={{ color: '#c5c5d6' }}>{agreement.start_date || '—'}</span>
                    </div>

                    <div>
                      <span style={{ color: '#88889a' }}>{isAr ? 'تاريخ الانتهاء:' : 'End Date:'} </span>
                      <span style={{ color: '#c5c5d6' }}>{agreement.end_date || '—'}</span>
                    </div>

                    <div>
                      <span style={{ color: '#88889a' }}>{isAr ? 'مسؤول الاتفاقية:' : 'PR Owner:'} </span>
                      <span style={{ color: '#c5c5d6' }}>
                        {agreement.owner
                          ? isAr
                            ? agreement.owner.full_name_ar || agreement.owner.full_name_en
                            : agreement.owner.full_name_en || agreement.owner.full_name_ar
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Contract file button */}
                  {agreement.contract_path && (
                    <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <button
                        type="button"
                        onClick={handleContractDownload}
                        className="btn-secondary"
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Download size={15} color="#ffb800" />
                        <span>{isAr ? 'تحميل العقد الموقع (PDF عبر رابط موقّع)' : 'Download Signed Contract (PDF)'}</span>
                      </button>
                    </div>
                  )}

                  {agreement.notes && (
                    <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.78rem', color: '#88889a', marginBottom: '0.25rem' }}>
                        {isAr ? 'ملاحظات وبنود إضافية:' : 'Notes:'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#e0e0ec', whiteSpace: 'pre-wrap' }}>
                        {agreement.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PAYMENTS */}
            {activeTab === 'payments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffd54f' }}>
                    {isAr ? 'جدول الدفعات المالية' : 'Payment Schedule'}
                  </h4>
                  {isPrOrExec && (
                    <button
                      type="button"
                      onClick={() => setShowRecordPayment(true)}
                      className="btn-primary"
                      style={{
                        padding: '0.4rem 0.9rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} />
                      {isAr ? 'تسجيل دفعة جديدة' : 'Record Payment'}
                    </button>
                  )}
                </div>

                {payments.length === 0 ? (
                  <div
                    style={{
                      padding: '2rem',
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '12px',
                      color: '#9ca3af',
                      fontSize: '0.88rem',
                    }}
                  >
                    {isAr ? 'لم يتم تسجيل أي دفعات لهذه الاتفاقية حتى الآن.' : 'No payments recorded yet.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {payments.map((p) => {
                      const dueCalc = getPaymentDueStatus(p.due_date, p.status);
                      const statusConfig = PAYMENT_STATUSES.find((s) => s.key === p.status);

                      return (
                        <div
                          key={p.id}
                          className="glass-panel"
                          style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            border:
                              p.status === 'paid'
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : dueCalc.status === 'overdue'
                                ? '1px solid rgba(239, 68, 68, 0.4)'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                                {formatMoney(p.amount, lang)}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: '#a0a0b2', marginInlineStart: '0.5rem' }}>
                                ({PAYMENT_KINDS[p.kind]?.[lang] || PAYMENT_KINDS[p.kind]?.ar || p.kind})
                              </span>
                            </div>

                            <span
                              style={{
                                padding: '0.2rem 0.65rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: statusConfig?.color || 'rgba(255, 255, 255, 0.1)',
                                color: statusConfig?.text || '#fff',
                              }}
                            >
                              {statusConfig?.label[lang] || statusConfig?.label.ar || p.status}
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.8rem',
                              color: '#a0a0b2',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={13} />
                              <span>{isAr ? 'الاستحقاق: ' : 'Due: '}{p.due_date || '—'}</span>
                              {dueCalc.status === 'overdue' && (
                                <span style={{ color: '#f87171', fontWeight: 700 }}>
                                  ({isAr ? `متأخر ${dueCalc.daysDiff} يوم` : `${dueCalc.daysDiff}d overdue`})
                                </span>
                              )}
                            </div>

                            {p.status === 'paid' && p.method && (
                              <div style={{ color: '#34d399' }}>
                                {isAr ? 'الطريقة: ' : 'Method: '}
                                {PAYMENT_METHODS[p.method]?.[lang] || PAYMENT_METHODS[p.method]?.ar || p.method}
                              </div>
                            )}
                          </div>

                          {/* Action row: view receipt & confirm */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginTop: '0.25rem',
                              paddingTop: '0.5rem',
                              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            {p.receipt_path && (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewerFile({
                                    path: p.receipt_path,
                                    title: `${isAr ? 'إيصال دفعة' : 'Receipt'} - ${formatMoney(p.amount, lang)}`,
                                  })
                                }
                                className="btn-secondary"
                                style={{
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  cursor: 'pointer',
                                }}
                              >
                                <Eye size={12} color="#ffb800" />
                                <span>{isAr ? 'عرض الإيصال' : 'View Receipt'}</span>
                              </button>
                            )}

                            {p.status === 'pending' && isFinanceOrExec && (
                              <button
                                type="button"
                                onClick={() => setPaymentToConfirm(p)}
                                style={{
                                  padding: '0.3rem 0.75rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#fff',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                }}
                              >
                                <Check size={12} />
                                <span>{isAr ? 'تأكيد الاستلام' : 'Confirm'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DELIVERABLES */}
            {activeTab === 'deliverables' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffd54f' }}>
                    {isAr ? 'التزامات النشر والفعاليات' : 'Promised Deliverables'}
                  </h4>
                  {isPrOrExec && (
                    <button
                      type="button"
                      onClick={() => setShowAddDeliverable(true)}
                      className="btn-primary"
                      style={{
                        padding: '0.4rem 0.9rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} />
                      {isAr ? 'إضافة التزام' : 'Add Deliverable'}
                    </button>
                  )}
                </div>

                {deliverables.length === 0 ? (
                  <div
                    style={{
                      padding: '2rem',
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '12px',
                      color: '#9ca3af',
                      fontSize: '0.88rem',
                    }}
                  >
                    {isAr ? 'لا توجد التزامات مسجلة لهذه الاتفاقية حتى الآن.' : 'No deliverables added yet.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {deliverables.map((d) => {
                      const prog = calculateDeliverableProgress(d.done_count, d.required_count);
                      const publishedPosts = (d.post_deliverables || [])
                        .map((pd) => pd.post)
                        .filter((p) => p && p.status === 'published');

                      return (
                        <div
                          key={d.id}
                          className="glass-panel"
                          style={{
                            padding: '1.1rem',
                            borderRadius: '12px',
                            border: prog.isComplete
                              ? '1px solid rgba(16, 185, 129, 0.4)'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span
                                style={{
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: 'rgba(255, 184, 0, 0.15)',
                                  color: '#ffb800',
                                }}
                              >
                                {DELIVERABLE_KINDS[d.kind]?.[lang] || DELIVERABLE_KINDS[d.kind]?.ar || d.kind}
                              </span>
                              <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                                {d.title || DELIVERABLE_KINDS[d.kind]?.[lang] || d.kind}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                color: prog.isComplete ? '#34d399' : '#ffd54f',
                              }}
                            >
                              {prog.done} / {prog.required}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div
                            style={{
                              width: '100%',
                              height: '8px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              borderRadius: '999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${prog.percentage}%`,
                                height: '100%',
                                background: prog.isComplete
                                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                                  : 'linear-gradient(90deg, #f59e0b, #ffb800)',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>

                          {d.due_date && (
                            <div style={{ fontSize: '0.75rem', color: '#88889a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Calendar size={12} />
                              <span>{isAr ? 'تاريخ الاستحقاق: ' : 'Due date: '}{d.due_date}</span>
                            </div>
                          )}

                          {/* Published posts that count */}
                          {publishedPosts.length > 0 && (
                            <div style={{ marginTop: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span style={{ fontSize: '0.75rem', color: '#c5c5d6', fontWeight: 600 }}>
                                {isAr ? 'المنشورات المنفذة المحسوبة:' : 'Fulfilling Published Posts:'}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.3rem' }}>
                                {publishedPosts.map((p) => (
                                  <div
                                    key={p.id}
                                    style={{
                                      fontSize: '0.78rem',
                                      color: '#60a5fa',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.4rem',
                                    }}
                                  >
                                    <CheckCircle2 size={12} color="#34d399" />
                                    <span>{p.title} ({p.platform})</span>
                                    {p.post_url && (
                                      <a
                                        href={p.post_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#ffd54f' }}
                                      >
                                        <ExternalLink size={12} />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <RecordPaymentModal
          isOpen={showRecordPayment}
          onClose={() => setShowRecordPayment(false)}
          agreementId={agreementId}
          companyName={
            agreement?.company
              ? isAr
                ? agreement.company.name_ar
                : agreement.company.name_en || agreement.company.name_ar
              : null
          }
        />
      )}

      {/* Confirm Payment Dialog */}
      {paymentToConfirm && (
        <ConfirmPaymentDialog
          isOpen={Boolean(paymentToConfirm)}
          onClose={() => setPaymentToConfirm(null)}
          payment={{ ...paymentToConfirm, agreements: agreement }}
        />
      )}

      {/* Add Deliverable Modal */}
      {showAddDeliverable && (
        <AddDeliverableModal
          isOpen={showAddDeliverable}
          onClose={() => setShowAddDeliverable(false)}
          agreementId={agreementId}
          companyId={agreement?.company?.id}
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
    </>
  );
}
