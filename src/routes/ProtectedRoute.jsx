import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Clock, LogOut, ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/strings';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, profile, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true, state: { loggedOut: true } });
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          color: '#ffd54f',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 184, 0, 0.2)',
            borderTopColor: '#ffb800',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#a3a3b2' }}>{t('loading')}</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Edge case: account suspended
  if (profile?.status === 'suspended') {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
            background: 'rgba(15, 16, 21, 0.98)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              margin: '0 auto 1.5rem auto',
            }}
          >
            <ShieldX size={34} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>
            {t('accountSuspendedTitle')}
          </h2>
          <p style={{ color: '#c5c5d6', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            {t('accountSuspendedDesc')}
          </p>
          <button
            onClick={handleSignOut}
            className="btn-primary"
            style={{ margin: '0 auto', justifyContent: 'center' }}
          >
            <LogOut size={16} />
            <span>{t('signOutButton')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Edge case: signed in but profile is null or no user_roles rows assigned yet
  if (!profile || !roles || roles.length === 0) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}
      >
        <div
          className="glass-panel gold-border-glow"
          style={{
            maxWidth: '540px',
            width: '100%',
            padding: '3rem 2rem',
            borderRadius: '24px',
            background: 'rgba(15, 16, 21, 0.98)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(255, 184, 0, 0.15)',
              border: '2px solid #ffb800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffd54f',
              margin: '0 auto 1.5rem auto',
            }}
          >
            <Clock size={34} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>
            {t('accountInactiveTitle')}
          </h2>
          <p style={{ color: '#c5c5d6', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            {t('accountInactiveDesc')}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleSignOut}
              className="btn-primary"
              style={{ justifyContent: 'center' }}
            >
              <LogOut size={16} />
              <span>{t('signOutButton')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children ?? <Outlet />;
}
