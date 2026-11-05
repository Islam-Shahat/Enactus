import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function ThemeToggle({ variant = 'compact', className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  if (variant === 'pill') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={isDark ? 'التبديل إلى الوضع النهاري (Light Mode)' : 'التبديل إلى الوضع الليلي (Dark Mode)'}
        aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
        className={`theme-toggle-pill ${className}`}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '64px',
          height: '32px',
          padding: '3px',
          borderRadius: '9999px',
          background: isDark ? 'rgba(18, 20, 30, 0.85)' : 'rgba(230, 235, 245, 0.95)',
          border: '1.5px solid rgba(255, 184, 0, 0.4)',
          boxShadow: isDark
            ? '0 0 12px rgba(255, 184, 0, 0.2), inset 0 2px 4px rgba(0,0,0,0.5)'
            : '0 2px 8px rgba(0,0,0,0.1), inset 0 2px 4px rgba(0,0,0,0.05)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: isDark ? '3px' : '33px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ffd752 0%, #ffaa00 50%, #c47c00 100%)',
            boxShadow: '0 2px 8px rgba(255, 184, 0, 0.5)',
            transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            zIndex: 1,
          }}
        />

        <div
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            color: isDark ? '#08080a' : '#888b9c',
            transition: 'color 0.25s ease',
          }}
        >
          <Moon size={14} strokeWidth={2.5} />
        </div>

        <div
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            color: isDark ? '#888b9c' : '#08080a',
            transition: 'color 0.25s ease',
          }}
        >
          <Sun size={15} strokeWidth={2.5} />
        </div>
      </button>
    );
  }

  if (variant === 'mobile') {
    return (
      <div
        onClick={toggleTheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 0.95rem',
          borderRadius: '14px',
          background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(255, 184, 0, 0.25)',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
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
              flexShrink: 0,
            }}
          >
            {isDark ? <Sun size={18} strokeWidth={2.4} /> : <Moon size={18} strokeWidth={2.4} />}
          </div>
          <div style={{ textAlign: isAr ? 'right' : 'left', minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#fff' : '#14171f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isDark ? (isAr ? 'الوضع النهاري' : 'Light Mode') : (isAr ? 'الوضع الليلي' : 'Dark Mode')}
            </div>
            <div style={{ fontSize: '0.74rem', color: isDark ? '#a3a3b2' : '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isAr ? `الوضع الحالي: ${isDark ? 'ليلي' : 'نهاري'}` : `Current: ${isDark ? 'Dark' : 'Light'}`}
            </div>
          </div>
        </div>

        {/* Small toggle indicator */}
        <div
          style={{
            position: 'relative',
            width: '46px',
            height: '24px',
            borderRadius: '9999px',
            background: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(212, 136, 0, 0.2)',
            border: '1.5px solid rgba(255, 184, 0, 0.4)',
            padding: '2px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '17px',
              height: '17px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ffd752 0%, #ffaa00 100%)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              transform: isDark ? 'translateX(0)' : 'translateX(-22px)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </div>
      </div>
    );
  }

  // Default compact button for Navbar
  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'التبديل إلى الوضع النهاري (Light Mode)' : 'التبديل إلى الوضع الليلي (Dark Mode)'}
      aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      className={`theme-toggle-compact ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(255, 184, 0, 0.35)',
        color: isDark ? '#ffd54f' : '#b37000',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: 0,
        boxShadow: isDark
          ? '0 0 10px rgba(255, 184, 0, 0.15)'
          : '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
        e.currentTarget.style.borderColor = 'rgba(255, 184, 0, 0.7)';
        e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 184, 0, 0.35)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.borderColor = 'rgba(255, 184, 0, 0.35)';
        e.currentTarget.style.boxShadow = isDark
          ? '0 0 10px rgba(255, 184, 0, 0.15)'
          : '0 2px 8px rgba(0, 0, 0, 0.08)';
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
          transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)',
        }}
      >
        {isDark ? (
          <Sun size={19} strokeWidth={2.3} />
        ) : (
          <Moon size={18} strokeWidth={2.3} />
        )}
      </div>
    </button>
  );
}
