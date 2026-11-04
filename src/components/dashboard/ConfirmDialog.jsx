import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'تأكيد الإجراء',
  message = 'هل أنت متأكد من المتابعة؟ لا يمكن التراجع عن هذا الإجراء.',
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'gold', // 'gold' | 'danger'
  isLoading = false,
  children = null,
}) {
  const { dir } = useLanguage();

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 5, 8, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="glass-panel gold-border-glow"
        dir={dir}
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: '20px',
          background: 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))',
          padding: '1.75rem',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          style={{
            position: 'absolute',
            top: '1.25rem',
            insetInlineEnd: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: '#a0a0b2',
            cursor: 'pointer',
            padding: '0.25rem',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 184, 0, 0.15)',
              border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 184, 0, 0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDanger ? '#ef4444' : '#ffb800',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            {title}
          </h3>
        </div>

        <p style={{ fontSize: '0.92rem', color: '#c5c5d6', lineHeight: 1.6, marginBottom: children ? '1rem' : '1.75rem' }}>
          {message}
        </p>

        {children && <div style={{ marginBottom: '1.5rem' }}>{children}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="btn-primary"
            style={{
              padding: '0.6rem 1.5rem',
              fontSize: '0.9rem',
              background: isDanger ? '#ef4444' : undefined,
              borderColor: isDanger ? '#dc2626' : undefined,
              color: isDanger ? '#fff' : undefined,
            }}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

