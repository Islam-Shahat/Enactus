// src/components/dashboard/business/ConfirmPaymentDialog.jsx
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../Toast';
import FormField from '../FormField';
import { PAYMENT_METHODS, formatMoney } from '../../../lib/businessHelpers';

export default function ConfirmPaymentDialog({ isOpen, onClose, payment, onConfirmed }) {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const canConfirm = isSuperAdmin || hasRole(['finance_admin', 'president', 'vice_president']);

  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');

  if (!isOpen || !payment) return null;

  const handleConfirm = async () => {
    if (!canConfirm) {
      toast.show(
        isAr ? 'عفواً، تأكيد الدفعات مقتصر على مسؤول المالية والرئاسة' : 'Permission denied: Finance & Leadership only',
        'error'
      );
      return;
    }

    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: nowIso,
          method,
          confirmed_by: user?.id,
          confirmed_at: nowIso,
          notes: notes.trim() ? (payment.notes ? `${payment.notes}\n[تأكيد]: ${notes.trim()}` : notes.trim()) : payment.notes,
        })
        .eq('id', payment.id)
        .select()
        .single();

      if (error) throw error;

      toast.show(isAr ? 'تم تأكيد استلام الدفعة وتحديث الرصيد بنجاح' : 'Payment confirmed successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['agreement_balances'] });
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      if (onConfirmed) onConfirmed(data);
      onClose();
    } catch (err) {
      console.error('Error confirming payment:', err);
      toast.show(err.message || (isAr ? 'فشل تأكيد الدفعة' : 'Failed to confirm payment'), 'error');
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
          maxWidth: '480px',
          background: 'linear-gradient(170deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))',
          borderRadius: '20px',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          padding: '2rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              {isAr ? 'تأكيد استلام الدفعة المالية' : 'Confirm Payment Receipt'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              {isAr ? 'إقرار مالي رسمي بدخول المبلغ لخزينة الفريق' : 'Official finance confirmation and ledger update'}
            </p>
          </div>
        </div>

        {/* Payment Summary Box */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#a0a0b2' }}>{isAr ? 'المبلغ المطلوب تأكيده:' : 'Amount to confirm:'}</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399' }}>
              {formatMoney(payment.amount, lang)}
            </span>
          </div>
          {payment.agreements && (
            <div style={{ fontSize: '0.82rem', color: '#ffd54f' }}>
              {payment.agreements.title}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label={isAr ? 'طريقة الاستلام الفعلية' : 'Payment Method'} required>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: '#161822',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#fff',
              }}
            >
              {Object.entries(PAYMENT_METHODS).map(([key, obj]) => (
                <option key={key} value={key} style={{ background: '#161822', color: '#fff' }}>
                  {obj[lang] || obj.ar}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={isAr ? 'ملاحظة التأكيد (اختياري)' : 'Confirmation Note'}>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? 'تم استلام المبلغ نقداً / التحقق من الحساب' : 'Received in bank account / cash drawer'}
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
              }}
            />
          </FormField>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
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
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: '0.75rem 1.8rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
            }}
          >
            {loading ? (isAr ? 'جاري التأكيد...' : 'Confirming...') : (isAr ? 'تأكيد الاستلام' : 'Confirm Payment')}
          </button>
        </div>
      </div>
    </div>
  );
}

