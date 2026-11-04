// src/components/dashboard/DisputeModal.jsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import FormField from './FormField';
import { useToast } from './Toast';
import { getRemainingDisputeTime } from '../../lib/pointHelpers';
import { AlertCircle, Send, X, Clock, Loader2 } from 'lucide-react';

export default function DisputeModal({
  isOpen,
  onClose,
  entry = null,
}) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [reason, setReason] = useState('');

  const remaining = entry?.created_at ? getRemainingDisputeTime(entry.created_at) : { expired: true };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!entry?.id || !user?.id) throw new Error('Missing entry or user');

      const { data, error } = await supabase.from('point_disputes').insert([
        {
          point_entry_id: entry.id,
          user_id: user.id,
          reason: reason.trim(),
          status: 'pending',
        },
      ]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.show(
        isAr ? 'تم إرسال طلب التظلم بنجاح وسيقوم المسؤول بمراجعته' : 'Dispute request submitted successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_point_entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_scores'] });
      setReason('');
      onClose();
    },
    onError: (err) => {
      console.error('[DisputeModal error]:', err);
      let msg = err.message || (isAr ? 'فشل إرسال طلب التظلم' : 'Failed to submit dispute');
      if (err.message?.includes('violates row-level security') || err.code === '42501') {
        msg = isAr
          ? 'انتهت مهلة الـ 48 ساعة المحددة لتقديم تظلم على هذا البند'
          : 'The 48-hour dispute window has expired for this entry';
      }
      toast.show(msg, 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.show(isAr ? 'يرجى كتابة سبب التظلم' : 'Please provide dispute reason', 'error');
      return;
    }
    submitMutation.mutate();
  };

  if (!isOpen || !entry) return null;

  const titleColor = isDark ? '#ffd54f' : '#b45309';
  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
    border: isDark ? '1px solid rgba(255, 184, 0, 0.35)' : '1px solid #d97706',
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
        className="glass-panel gold-border-glow"
        dir={dir}
        style={{
          borderRadius: '20px',
          padding: '1.75rem',
          maxWidth: '520px',
          width: '100%',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.85)' : '0 20px 50px rgba(184, 120, 0, 0.15)',
          background: isDark
            ? 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))'
            : 'rgba(255, 255, 255, 0.98)',
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
                background: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(217, 119, 6, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: titleColor,
              }}
            >
              <AlertCircle size={20} />
            </div>
            <h3 className="modal-header-title" style={{ margin: 0, color: titleColor, fontSize: '1.2rem', fontWeight: 800 }}>
              {isAr ? 'تقديم تظلم على خصم نقاط' : 'Submit Point Deduction Dispute'}
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
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Entry Details Snapshot */}
        <div
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: isDark ? '#aaa' : '#6b7280' }}>
              {isAr ? 'البند المعني:' : 'Entry:'}
            </span>
            <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '1rem' }}>
              -{entry.value} {isAr ? 'نقطة' : 'pts'}
            </span>
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: isDark ? '#fff' : '#111', marginBottom: '0.5rem' }}>
            {entry.reason}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#ffb800' }}>
            <Clock size={13} />
            <span>
              {remaining.expired
                ? isAr ? 'انتهت فترة التظلم (48 ساعة)' : 'Dispute window expired'
                : isAr
                ? `متبقي في نافذة التظلم: ${remaining.hours} ساعة و ${remaining.minutes} دقيقة`
                : `Remaining in dispute window: ${remaining.hours}h ${remaining.minutes}m`}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label={isAr ? 'سبب التظلم وشرح الموقف بالتفصيل' : 'Dispute Reason & Clarification'} required>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isAr
                  ? 'اشرح أسباب عدم صحة الخصم أو تفاصيل العذر التقديري المعتمد...'
                  : 'Explain why this deduction should be reviewed...'
              }
              style={{ ...inputStyle, resize: 'vertical' }}
              required
            />
          </FormField>

          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitMutation.isPending}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending || !reason.trim() || remaining.expired}
              className="btn-primary"
              style={{
                flex: 2,
                padding: '0.75rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                opacity: submitMutation.isPending || !reason.trim() || remaining.expired ? 0.7 : 1,
              }}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isAr ? 'جاري الإرسال...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>{isAr ? 'إرسال التظلم' : 'Submit Dispute'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

