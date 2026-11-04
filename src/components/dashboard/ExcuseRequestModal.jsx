import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import FormField from './FormField';
import { useToast } from './Toast';
import { FileQuestion, Send, X, Loader2 } from 'lucide-react';

export default function ExcuseRequestModal({
  isOpen,
  onClose,
  sessions = [],
  defaultSessionId = '',
}) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [sessionId, setSessionId] = useState(defaultSessionId);
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (defaultSessionId) setSessionId(defaultSessionId);
    else if (sessions.length > 0 && !sessionId) setSessionId(sessions[0].id);
  }, [defaultSessionId, sessions, sessionId]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('excuse_requests').insert([
        {
          session_id: sessionId,
          user_id: user.id,
          reason: reason.trim(),
          status: 'pending',
        },
      ]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم إرسال طلب العذر بنجاح' : 'Excuse request submitted', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_excuse_requests'] });
      setReason('');
      onClose();
    },
    onError: (err) => {
      toast.show(
        err.message?.includes('duplicate') || err.message?.includes('unique')
          ? isAr
            ? 'لقد قمت بتقديم طلب عذر لهذه الجلسة مسبقاً'
            : 'You already submitted an excuse for this session'
          : err.message || (isAr ? 'فشل إرسال الطلب' : 'Failed to submit excuse'),
        'error'
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sessionId) {
      toast.show(isAr ? 'يرجى اختيار الجلسة' : 'Please select a session', 'error');
      return;
    }
    if (!reason.trim()) {
      toast.show(isAr ? 'سبب العذر مطلوب' : 'Reason is required', 'error');
      return;
    }
    submitMutation.mutate();
  };

  if (!isOpen) return null;

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
          maxWidth: '500px',
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
              <FileQuestion size={20} />
            </div>
            <h3 className="modal-header-title" style={{ margin: 0, color: titleColor, fontSize: '1.2rem', fontWeight: 800 }}>
              {isAr ? 'تقديم طلب عذر عن جلسة' : 'Submit Absence Excuse'}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label={isAr ? 'الجلسة المراد الاعتذار عنها' : 'Session'} required>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="" style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#888' : '#6b7280' }}>
                {isAr ? '-- اختر الجلسة --' : '-- Choose Session --'}
              </option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id} style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#fff' : '#111' }}>
                  {s.title} ({new Date(s.starts_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={isAr ? 'سبب العذر والغياب' : 'Reason for Absence'} required>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isAr ? 'اشرح سبب تعذر الحضور بالتفصيل...' : 'Explain why you cannot attend...'}
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
              disabled={submitMutation.isPending || !reason.trim()}
              className="btn-primary"
              style={{
                flex: 2,
                padding: '0.75rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                opacity: submitMutation.isPending || !reason.trim() ? 0.7 : 1,
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
                  <span>{isAr ? 'إرسال طلب العذر' : 'Submit Excuse'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
