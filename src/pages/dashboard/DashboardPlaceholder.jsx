import React from 'react';
import { Construction, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { t } from '../../lib/strings';

export default function DashboardPlaceholder({ title = '' }) {
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
          maxWidth: '520px',
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
          <Construction size={32} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '0.4rem' }}>
          {title}
        </h2>

        <span className="badge-gold" style={{ fontSize: '0.78rem', marginBottom: '1rem', display: 'inline-block' }}>
          {t('comingSoon')}
        </span>

        <p style={{ color: '#a0a0b2', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {t('comingSoonDesc')}
        </p>

        <Link to="/dashboard" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
          <span>{t('backToDashboard')}</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
