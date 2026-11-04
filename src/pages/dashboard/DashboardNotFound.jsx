import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/strings';

export default function DashboardNotFound() {
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '55vh',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="glass-panel gold-border-glow"
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '3rem 2rem',
          borderRadius: '24px',
          background: 'rgba(15, 16, 22, 0.95)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255, 184, 0, 0.15)',
            border: '2px solid #ffb800',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffd54f',
            margin: '0 auto 1.25rem auto',
          }}
        >
          <FileQuestion size={32} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '0.4rem' }}>
          {t('notFoundTitle')}
        </h2>

        <p style={{ color: '#a0a0b2', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {t('notFoundDesc')}
        </p>

        <Link to="/dashboard" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
          <span>{t('backToDashboard')}</span>
          <ArrowIcon size={16} />
        </Link>
      </div>
    </div>
  );
}

