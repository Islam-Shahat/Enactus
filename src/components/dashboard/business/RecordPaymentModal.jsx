// src/components/dashboard/business/RecordPaymentModal.jsx
import React, { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { CreditCard, UploadCloud, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../Toast';
import FormField from '../FormField';
import { PAYMENT_KINDS, parseMoney, formatMoney } from '../../../lib/businessHelpers';
import { uploadPaymentReceipt } from '../../../lib/businessStorage';

export default function RecordPaymentModal({
  isOpen,
  onClose,
  agreementId = null,
  companyName = null,
  onRecorded,
}) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    agreement_id: agreementId || '',
    kind: 'installment',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [receiptFile, setReceiptFile] = useState(null);

  // Sync agreementId when passed as prop
  React.useEffect(() => {
    if (agreementId) {
      setFormData((prev) => ({ ...prev, agreement_id: agreementId }));
    }
  }, [agreementId]);

  // Fetch agreements if agreementId not provided
  const { data: agreements = [] } = useQuery({
    queryKey: ['agreements', 'select_for_payment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agreements')
        .select(`
          id,
          title,
          total_value,
          companies:company_id (id, name_ar, name_en)
        `)
        .in('status', ['draft', 'active'])
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: isOpen && !agreementId,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalAgreementId = formData.agreement_id || agreementId;
    if (!finalAgreementId) {
      toast.show(isAr ? 'يرجى اختيار الاتفاقية' : 'Please select an agreement', 'error');
      return;
    }

    const amt = parseMoney(formData.amount);
    if (amt <= 0) {
      toast.show(isAr ? 'يرجى إدخال مبلغ دفع صحيح' : 'Please enter a valid payment amount', 'error');
      return;
    }

    setLoading(true);
    try {
      let receiptPath = null;
      if (receiptFile) {
        receiptPath = await uploadPaymentReceipt(finalAgreementId, receiptFile);
      }

      const { data, error } = await supabase
        .from('payments')
        .insert({
          agreement_id: finalAgreementId,
          kind: formData.kind,
          amount: amt,
          due_date: formData.due_date || null,
          receipt_path: receiptPath,
          status: 'pending',
          recorded_by: user?.id,
          notes: formData.notes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.show(
        isAr ? 'تم تسجيل الدفعة بنجاح وفي انتظار تأكيد المالية' : 'Payment recorded successfully, pending finance confirmation',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['agreement_balances'] });
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      if (onRecorded) onRecorded(data);
      onClose();
    } catch (err) {
      console.error('Error recording payment:', err);
      toast.show(err.message || (isAr ? 'فشل تسجيل الدفعة' : 'Failed to record payment'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'linear-gradient(170deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))',
          borderRadius: '20px',
          border: '1px solid rgba(255, 184, 0, 0.3)',
          padding: '2rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(255, 184, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffb800',
            }}
          >
            <CreditCard size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              {isAr ? 'تسجيل دفعة جديدة (إيصال يدوي)' : 'Record New Payment'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
              {companyName ? `${isAr ? 'تابع لشركة: ' : 'For: '}${companyName}` : (isAr ? 'تسجيل دفعة مع إيصال للتحصيل' : 'Manual receipt & payment recording')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {!agreementId && (
            <FormField label={isAr ? 'الاتفاقية التابعة' : 'Agreement'} required>
              <select
                required
                value={formData.agreement_id}
                onChange={(e) => setFormData({ ...formData, agreement_id: e.target.value })}
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                  color: '#fff',
                }}
              >
                <option value="" style={{ background: '#161822', color: '#fff' }}>
                  {isAr ? '-- اختر الاتفاقية --' : '-- Select Agreement --'}
                </option>
                {agreements.map((ag) => {
                  const cName = ag.companies
                    ? isAr
                      ? ag.companies.name_ar
                      : ag.companies.name_en || ag.companies.name_ar
                    : '';
                  return (
                    <option key={ag.id} value={ag.id} style={{ background: '#161822', color: '#fff' }}>
                      {ag.title} {cName ? `(${cName})` : ''} - {formatMoney(ag.total_value, lang)}
                    </option>
                  );
                })}
              </select>
            </FormField>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem' }}>
            <FormField label={isAr ? 'نوع الدفعة' : 'Payment Kind'} required>
              <select
                value={formData.kind}
                onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                  color: '#fff',
                }}
              >
                {Object.entries(PAYMENT_KINDS).map(([key, obj]) => (
                  <option key={key} value={key} style={{ background: '#161822', color: '#fff' }}>
                    {obj[lang] || obj.ar}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={isAr ? 'المبلغ (جنيه مصري)' : 'Amount (EGP)'} required>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                  color: '#fff',
                  fontWeight: 700,
                }}
              />
            </FormField>
          </div>

          <FormField label={isAr ? 'تاريخ الاستحقاق' : 'Due Date'} required>
            <input
              type="date"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
              }}
            />
          </FormField>

          {/* Receipt Upload (Image or PDF <= 5MB) */}
          <FormField
            label={isAr ? 'صورة الإيصال أو التحويل (صورة أو PDF - حتى 5 ميجابايت)' : 'Receipt File (Image / PDF, max 5MB)'}
          >
            <div
              style={{
                border: '2px dashed rgba(255, 184, 0, 0.3)',
                borderRadius: '12px',
                padding: '1.25rem',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('receipt-file-input').click()}
            >
              <input
                id="receipt-file-input"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.size > 5 * 1024 * 1024) {
                      toast.show(isAr ? 'حجم الإيصال يجب ألا يتجاوز 5 ميجابايت' : 'Receipt max size is 5MB', 'error');
                      return;
                    }
                    setReceiptFile(f);
                  }
                }}
              />
              <UploadCloud size={26} color="#ffb800" style={{ margin: '0 auto 0.4rem' }} />
              {receiptFile ? (
                <div style={{ color: '#34d399', fontWeight: 600, fontSize: '0.9rem' }}>
                  {receiptFile.name} ({(receiptFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              ) : (
                <div style={{ color: '#a0a0b2', fontSize: '0.85rem' }}>
                  {isAr ? 'اضغط لرفع صورة إيصال الدفع أو التحويل' : 'Click to select receipt image or PDF'}
                </div>
              )}
            </div>
          </FormField>

          <FormField label={isAr ? 'ملاحظات الدفعة' : 'Notes'}>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={isAr ? 'رقم الحوالة، اسم المودع، أو تفاصيل أخرى...' : 'Transfer reference, depositor name, etc.'}
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
              }}
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                padding: '0.75rem 1.8rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {loading ? (isAr ? 'جاري التسجيل...' : 'Recording...') : (isAr ? 'تسجيل الدفعة' : 'Record Payment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

