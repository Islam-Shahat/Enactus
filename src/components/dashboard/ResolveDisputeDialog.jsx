// src/components/dashboard/ResolveDisputeDialog.jsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import FormField from './FormField';
import { useToast } from './Toast';
import { CheckCircle2, XCircle, X, Loader2 } from 'lucide-react';

export default function ResolveDisputeDialog({
  isOpen,
  onClose,
  dispute = null,
  actionType = 'accept', // 'accept' | 'reject'
}) {
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [response, setResponse] = useState('');

  const isAccept = actionType === 'accept';

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!dispute?.id) throw new Error('Missing dispute id');

      const { data, error } = await supabase.rpc('resolve_point_dispute', {
        p_dispute: dispute.id,
        p_accept: isAccept,
        p_response: response.trim() || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.show(
        isAccept
          ? isAr ? 'تم قبول التظلم وإلغاء خصم النقاط بنجاح' : 'Dispute accepted and point penalty voided'
          : isAr ? 'تم رفض التظلم بنجاح' : 'Dispute rejected successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'disputes_queue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_point_entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'all_point_entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_scores'] });
      setResponse('');
      onClose();
    },
    onError: (err) => {
      console.error('[ResolveDisputeDialog error]:', err);
      toast.show(err.message || (isAr ? 'فشل معالجة التظلم' : 'Failed to resolve dispute'), 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    resolveMutation.mutate();
  };

  if (!isOpen || !dispute) return null;

  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
    border: isDark
      ? `1px solid ${isAccept ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
      : `1px solid ${isAccept ? '#22c55e' : '#ef4444'}`,
    color: isDark ? '#ffffff' : '#0f111a',
    fontSize: '0.92rem',
    outline: 'none',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        dir={dir}
        style={{
          borderRadius: '20px',
          padding: '1.75rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.85)' : '0 20px 50px rgba(0,0,0,0.15)',
          background: isDark
            ? 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))'
            : 'rgba(255, 255, 255, 0.98)',
          border: `1px solid ${isAccept ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: isAccept ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isAccept ? '#22c55e' : '#ef4444',
              }}
            >
              {isAccept ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            </div>
            <h3
              style={{
                margin: 0,
                color: isAccept ? (isDark ? '#4ade80' : '#15803d') : (isDark ? '#f87171' : '#b91c1c'),
                fontSize: '1.2rem',
                fontWeight: 800,
              }}
            >
              {isAccept
                ? isAr ? 'قبول التظلم وإلغاء الخصم' : 'Accept Dispute & Void Deduction'
                : isAr ? 'رفض طلب التظلم' : 'Reject Dispute'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#a0a0b2' : '#6b7280',
              cursor: 'pointer',
              padding: '0.35rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Member Dispute Details */}
        <div
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            borderRadius: '10px',
            padding: '0.85rem',
            marginBottom: '1rem',
            fontSize: '0.88rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ color: isDark ? '#aaa' : '#666' }}>{isAr ? 'مقدم التظلم:' : 'Member:'}</span>
            <span style={{ fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
              {dispute.profiles?.full_name_ar || dispute.profiles?.full_name_en || ''}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ color: isDark ? '#aaa' : '#666' }}>{isAr ? 'سبب الخصم الأصلي:' : 'Original Reason:'}</span>
            <span style={{ fontWeight: 600, color: '#ef4444' }}>
              {dispute.point_entries?.reason} (-{dispute.point_entries?.value} pts)
            </span>
          </div>
          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ color: isDark ? '#ffd54f' : '#b45309', fontWeight: 600 }}>{isAr ? 'شرح العضو:' : 'Member statement:'}</span>
            <p style={{ margin: '0.25rem 0 0', color: isDark ? '#eee' : '#333', lineHeight: 1.5 }}>
              {dispute.reason}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label={isAr ? 'رد وملاحظات الإدارة (اختياري)' : 'Admin Response / Notes (Optional)'}>
            <textarea
              rows={3}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={
                isAccept
                  ? isAr ? 'مثال: تم قبول العذر بناءً على الإثبات المقدم...' : 'e.g. Accepted per provided excuse...'
                  : isAr ? 'مثال: تعذر قبول التظلم لعدم تقديم إشعار مسبق...' : 'e.g. Rejected due to no prior notice...'
              }
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </FormField>

          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={resolveMutation.isPending}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={resolveMutation.isPending}
              style={{
                flex: 2,
                padding: '0.75rem',
                borderRadius: '10px',
                background: isAccept ? '#22c55e' : '#ef4444',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                cursor: resolveMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: resolveMutation.isPending ? 0.7 : 1,
              }}
            >
              {resolveMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isAr ? 'جاري المعالجة...' : 'Processing...'}</span>
                </>
              ) : isAccept ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isAr ? 'تأكيد قبول التظلم' : 'Confirm Accept'}</span>
                </>
              ) : (
                <>
                  <XCircle size={16} />
                  <span>{isAr ? 'تأكيد رفض التظلم' : 'Confirm Reject'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

