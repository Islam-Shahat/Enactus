// src/components/dashboard/VoidPointDialog.jsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import FormField from './FormField';
import { useToast } from './Toast';
import { AlertTriangle, X, Trash2, Loader2 } from 'lucide-react';

export default function VoidPointDialog({
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

  const [voidReason, setVoidReason] = useState('');

  const voidMutation = useMutation({
    mutationFn: async () => {
      if (!entry?.id || !user?.id) throw new Error('Missing entry or user');
      if (!voidReason.trim()) throw new Error(isAr ? 'سبب الإلغاء مطلوب إجبارياً' : 'Void reason is required');

      const { data, error } = await supabase
        .from('point_entries')
        .update({
          voided_at: new Date().toISOString(),
          voided_by: user.id,
          void_reason: voidReason.trim(),
        })
        .eq('id', entry.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.show(
        isAr ? 'تم إلغاء النقطة وإعادة احتساب رصيد العضو بنجاح' : 'Point entry voided and score recalculated successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_point_entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'all_point_entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_scores'] });
      setVoidReason('');
      onClose();
    },
    onError: (err) => {
      console.error('[VoidPointDialog error]:', err);
      toast.show(err.message || (isAr ? 'فشل إلغاء النقطة' : 'Failed to void point entry'), 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      toast.show(isAr ? 'يرجى كتابة سبب الإلغاء' : 'Please provide void reason', 'error');
      return;
    }
    voidMutation.mutate();
  };

  if (!isOpen || !entry) return null;

  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
    border: isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #ef4444',
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
          maxWidth: '480px',
          width: '100%',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.85)' : '0 20px 50px rgba(239, 68, 68, 0.15)',
          background: isDark
            ? 'linear-gradient(150deg, rgba(28, 16, 16, 0.98), rgba(18, 12, 12, 0.98))'
            : 'rgba(255, 255, 255, 0.98)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
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
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.2rem', fontWeight: 800 }}>
              {isAr ? 'إلغاء قيد النقطة (Void)' : 'Void Point Entry'}
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

        {/* Snapshot */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: isDark ? '#aaa' : '#666' }}>{isAr ? 'القيمة المسجلة:' : 'Value:'}</span>
            <span style={{ fontWeight: 700, color: entry.type === 'bonus' ? '#22c55e' : '#ef4444' }}>
              {entry.type === 'bonus' ? `+${entry.value}` : `-${entry.value}`} {isAr ? 'نقطة' : 'pts'}
            </span>
          </div>
          <div style={{ color: isDark ? '#ddd' : '#222', fontWeight: 600 }}>{entry.reason}</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label={isAr ? 'سبب إلغاء النقطة (إلزامي)' : 'Reason for Voiding (Required)'} required>
            <textarea
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={isAr ? 'اكتب سبب الإلغاء المعتمد (مثال: إلغاء الخصم بعد قبول العذر)...' : 'State reason for voiding this record...'}
              style={{ ...inputStyle, resize: 'vertical' }}
              required
            />
          </FormField>

          <p style={{ margin: 0, fontSize: '0.8rem', color: isDark ? '#aaa' : '#666', lineHeight: 1.5 }}>
            {isAr
              ? 'ملاحظة: سجل النقاط غير قابل للحذف الفعلي. يتم إبطال النقطة وتحديث رصيد العضو تلقائياً مع الاحتفاظ ببيانات الإلغاء للأمان والشفافية.'
              : 'Note: Points are append-only. The entry is marked voided and scores recalculate automatically.'}
          </p>

          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={voidMutation.isPending}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}
            >
              {isAr ? 'تراجع' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={voidMutation.isPending || !voidReason.trim()}
              style={{
                flex: 2,
                padding: '0.75rem',
                borderRadius: '10px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                cursor: voidMutation.isPending || !voidReason.trim() ? 'not-allowed' : 'pointer',
                opacity: voidMutation.isPending || !voidReason.trim() ? 0.7 : 1,
              }}
            >
              {voidMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isAr ? 'جاري الإلغاء...' : 'Voiding...'}</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>{isAr ? 'تأكيد الإلغاء' : 'Confirm Void'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

