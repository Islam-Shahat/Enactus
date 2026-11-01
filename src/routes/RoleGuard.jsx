import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/strings';

export function ForbiddenView() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem 1rem',
        textAlign: 'center',
      }}
    >
      <div
        className="glass-panel gold-border-glow"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '2.5rem 2rem',
          borderRadius: '24px',
          background: 'rgba(15, 16, 21, 0.95)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            margin: '0 auto 1.25rem auto',
          }}
        >
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
          {t('forbiddenTitle')}
        </h2>
        <p style={{ color: '#a3a3b2', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
          {t('forbiddenDesc')}
        </p>
        <Link to="/dashboard" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
          <span>{t('backToDashboard')}</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

/**
 * Route usage:  <Route element={<RoleGuard allow={['hr_admin','president']} />}> ... </Route>
 * Inline usage: <RoleGuard allow={['finance_admin']}>...</RoleGuard>
 * UI convenience only. RLS is what truly secures database tables.
 */
export default function RoleGuard({ allow = null, children }) {
  const { hasRole, loading } = useAuth();
  if (loading) return null;
  if (allow !== null && !hasRole(allow)) {
    return <ForbiddenView />;
  }
  return children ?? <Outlet />;
}
