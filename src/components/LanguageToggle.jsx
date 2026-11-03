import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function LanguageToggle({ variant = 'compact', className = '', style = {} }) {
  const { lang, toggleLanguage } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const label = isAr ? 'AR' : 'EN';
  const switchPrompt = isAr ? 'Switch to English' : 'التحويل إلى العربية';

  if (variant === 'mobile') {
    return (
      <div
        onClick={toggleLanguage}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1rem',
          borderRadius: '14px',
          background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(255, 184, 0, 0.25)',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ffd752 0%, #ffaa00 100%)',
              color: '#08080a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(255, 184, 0, 0.35)',
            }}
          >
            <Globe size={18} strokeWidth={2.4} />
          </div>
          <div style={{ textAlign: isAr ? 'right' : 'left' }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isDark ? '#fff' : '#14171f' }}>
              {isAr ? 'English (الإنجليزية)' : 'العربية (Arabic)'}
            </div>
            <div style={{ fontSize: '0.75rem', color: isDark ? '#a3a3b2' : '#6b7280' }}>
              {isAr ? 'اللغة الحالية: العربية' : 'Current Language: English'}
            </div>
          </div>
        </div>

        <span
          className="badge-gold"
          style={{
            fontSize: '0.8rem',
            padding: '0.25rem 0.6rem',
            borderRadius: '9999px',
            fontWeight: 800,
          }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`language-toggle-pill ${className}`}
      title={switchPrompt}
      aria-label={`Language: ${label}. Click to ${switchPrompt}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        padding: '0.42rem 0.75rem',
        borderRadius: '9999px',
        border: '1.5px solid rgba(255, 184, 0, 0.4)',
        background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        color: isDark ? '#f5f5f7' : '#14171f',
        fontSize: '0.82rem',
        fontWeight: 800,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        userSelect: 'none',
        lineHeight: 1,
        boxShadow: isDark
          ? '0 0 10px rgba(255, 184, 0, 0.12)'
          : '0 2px 6px rgba(0, 0, 0, 0.06)',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#ffb800';
        e.currentTarget.style.boxShadow = '0 0 14px rgba(255, 184, 0, 0.35)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 184, 0, 0.4)';
        e.currentTarget.style.boxShadow = isDark
          ? '0 0 10px rgba(255, 184, 0, 0.12)'
          : '0 2px 6px rgba(0, 0, 0, 0.06)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <span style={{ letterSpacing: '0.04em' }}>{label}</span>
      <Globe size={15} color="#ffd54f" />
    </button>
  );
}
