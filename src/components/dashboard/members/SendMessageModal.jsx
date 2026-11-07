// src/components/dashboard/members/SendMessageModal.jsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../Toast';
import {
  MessageSquare,
  Send,
  X,
  Loader2,
  User,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function SendMessageModal({ isOpen, onClose, member }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { isDark } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [validationError, setValidationError] = useState('');

  // Reset form when opened with a new member
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setBody('');
      setValidationError('');
    }
  }, [isOpen, member?.userId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Mutation to send member direct message via RPC
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!member?.userId) {
        throw new Error(isAr ? 'لم يتم تحديد العضو المستلم' : 'Recipient member is missing');
      }
      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();

      if (!trimmedTitle) {
        throw new Error(isAr ? 'يرجى إدخال عنوان للرسالة' : 'Please enter a message title');
      }
      if (!trimmedBody) {
        throw new Error(isAr ? 'يرجى كتابة نص الرسالة' : 'Please enter message content');
      }

      const { data, error } = await supabase.rpc('send_member_message', {
        p_recipient_id: member.userId,
        p_title: trimmedTitle,
        p_body: trimmedBody,
      });

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success(
        isAr
          ? `تم إرسال الرسالة إلى (${member?.name || 'العضو'}) بنجاح`
          : `Message sent to (${member?.name || 'Member'}) successfully`
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications'] });
      onClose();
    },
    onError: (err) => {
      const msg = err.message || (isAr ? 'فشل إرسال الرسالة' : 'Failed to send message');
      setValidationError(msg);
      toast.error(msg);
    },
  });

  if (!isOpen || !member) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');
    if (!title.trim()) {
      setValidationError(isAr ? 'يرجى إدخال عنوان للرسالة' : 'Please enter a message title');
      return;
    }
    if (!body.trim()) {
      setValidationError(isAr ? 'يرجى كتابة نص الرسالة' : 'Please enter message content');
      return;
    }
    sendMessageMutation.mutate();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-message-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(5, 7, 15, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !sendMessageMutation.isPending) {
          onClose();
        }
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '20px',
          padding: '1.75rem',
          background: isDark
            ? 'linear-gradient(145deg, rgba(20, 22, 33, 0.98), rgba(13, 14, 22, 0.98))'
            : '#ffffff',
          border: isDark
            ? '1px solid rgba(6, 182, 212, 0.35)'
            : '1px solid rgba(6, 182, 212, 0.45)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(6, 182, 212, 0.15)',
          direction: isAr ? 'rtl' : 'ltr',
          color: isDark ? '#ffffff' : '#0f172a',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingBottom: '1.15rem',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={22} />
            </div>
            <div>
              <h3
                id="send-message-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.18rem',
                  fontWeight: 800,
                  color: isDark ? '#ffffff' : '#0f172a',
                }}
              >
                {isAr ? 'إرسال رسالة خاصة للعضو' : 'Send Direct Message to Member'}
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                {isAr
                  ? 'تصل الرسالة فوراً في إشعارات العضو المختار فقط'
                  : 'Message will appear in this member’s notifications only'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={sendMessageMutation.isPending}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Member Recipient Info Banner */}
        <div
          style={{
            background: isDark ? 'rgba(255, 184, 0, 0.05)' : 'rgba(255, 184, 0, 0.08)',
            border: '1px solid rgba(255, 184, 0, 0.25)',
            borderRadius: '14px',
            padding: '0.9rem 1.1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 184, 0, 0.15)',
                color: '#ffd54f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              <User size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.96rem', color: isDark ? '#fff' : '#111827' }}>
                {member.name || (isAr ? 'عضو بدون اسم' : 'Unnamed Member')}
              </div>
              {member.committee && (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {member.committee}
                </div>
              )}
            </div>
          </div>

          {member.code && (
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 800,
                fontSize: '0.88rem',
                color: '#ffb800',
                background: 'rgba(255, 184, 0, 0.12)',
                padding: '0.3rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 184, 0, 0.3)',
              }}
            >
              {member.code}
            </span>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {validationError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <ShieldAlert size={16} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: isDark ? '#e2e8f0' : '#334155',
                marginBottom: '0.45rem',
              }}
            >
              {isAr ? 'عنوان الرسالة / الموضوع *' : 'Message Subject / Title *'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: تنبيه بخصوص موعد الاجتماع القادم'
                  : 'e.g. Notice regarding the upcoming meeting'
              }
              maxLength={120}
              required
              disabled={sendMessageMutation.isPending}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                background: isDark ? 'rgba(15, 17, 26, 0.8)' : '#f8fafc',
                color: isDark ? '#ffffff' : '#0f172a',
                fontSize: '0.92rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#06b6d4';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1';
              }}
            />
          </div>

          {/* Body */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.45rem',
              }}
            >
              <label
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: isDark ? '#e2e8f0' : '#334155',
                }}
              >
                {isAr ? 'نص الرسالة *' : 'Message Content *'}
              </label>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {body.length} / 1000
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder={
                isAr
                  ? 'اكتب هنا الرسالة أو التوجيهات التي ترغب بإيصالها إلى هذا العضو بشكل خاص...'
                  : 'Write your message or private instructions to this member here...'
              }
              required
              disabled={sendMessageMutation.isPending}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                background: isDark ? 'rgba(15, 17, 26, 0.8)' : '#f8fafc',
                color: isDark ? '#ffffff' : '#0f172a',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#06b6d4';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1';
              }}
            />
          </div>

          {/* Privacy Note */}
          <div
            style={{
              fontSize: '0.78rem',
              color: '#94a3b8',
              lineHeight: 1.5,
              background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: isDark ? '1px dashed rgba(255, 255, 255, 0.1)' : '1px dashed #e2e8f0',
            }}
          >
            {isAr
              ? '💡 ملاحظة: تظهر هذه الرسالة في قسم إشعارات هذا العضو فقط، مع إظهار اسمك وصفتك الإدارية كراسل.'
              : '💡 Note: This message will appear strictly in this member’s notifications with your name and role.'}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={sendMessageMutation.isPending}
              className="btn-secondary"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={sendMessageMutation.isPending || !title.trim() || !body.trim()}
              className="btn-primary"
              style={{
                padding: '0.65rem 1.4rem',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                color: '#ffffff',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: sendMessageMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: sendMessageMutation.isPending || !title.trim() || !body.trim() ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
              }}
            >
              {sendMessageMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isAr ? 'جارِ الإرسال...' : 'Sending...'}</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>{isAr ? 'إرسال الرسالة' : 'Send Message'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

