import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle = null,
  children,
  footer = null,
  width = '520px',
}) {
  const { dir } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: dir === 'rtl' ? 'flex-start' : 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          height: '100%',
          background: 'linear-gradient(170deg, rgba(20, 22, 32, 0.99), rgba(12, 13, 18, 0.99))',
          borderInlineStart: '1px solid rgba(255, 184, 0, 0.3)',
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'drawer-slide 0.25s ease-out',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 184, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(10, 11, 16, 0.6)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ fontSize: '0.8rem', color: '#a0a0b2', margin: '0.2rem 0 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close Drawer"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {children}
        </div>

        {/* Drawer Footer */}
        {footer && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255, 184, 0, 0.2)',
              background: 'rgba(10, 11, 16, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

