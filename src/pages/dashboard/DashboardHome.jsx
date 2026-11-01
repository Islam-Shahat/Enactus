import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Award, Calendar, Users, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../lib/roles';
import { t } from '../../lib/strings';

export default function DashboardHome() {
  const { profile, roles, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true, state: { loggedOut: true } });
  };

  const displayName =
    profile?.full_name_ar || profile?.full_name_en || user?.email?.split('@')[0] || 'عضو';

  const roleBadges = roles.map((r) => ({
    key: r.role,
    label: ROLE_LABELS[r.role]?.ar || r.role,
  }));

  const statCards = [
    { title: 'المهام المعينة', icon: CheckSquare, value: '—', hint: 'لا توجد مهام نشطة حالياً' },
    { title: 'رصيد النقاط', icon: Award, value: '—', hint: 'سجل النقاط قيد التجهيز' },
    { title: 'سجل الحضور', icon: Calendar, value: '—', hint: 'لا توجد جلسات مسجلة' },
    { title: 'اللجنة التابع لها', icon: Users, value: '—', hint: 'تحديثات الموسم الجديد' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Card */}
      <div
        className="glass-panel gold-border-glow"
        style={{
          borderRadius: '24px',
          padding: '2.5rem',
          background: 'linear-gradient(135deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.95))',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span className="badge-gold font-cinzel" style={{ fontSize: '0.75rem' }}>
              ENACTUS QENA • PORTAL
            </span>
            <button
              onClick={handleSignOut}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#ff8888',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.12)',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
              <span>{t('signOutButton')}</span>
            </button>
          </div>

          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
            {t('dashboardWelcome')}{' '}
            <span className="gold-gradient-text">{displayName}</span>
          </h1>

          <p style={{ color: '#a0a0b2', fontSize: '0.95rem', maxWidth: '650px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {t('dashboardWelcomeDesc')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#c5c5d6', fontWeight: 600 }}>الأدوار المصرحة:</span>
            {roleBadges.length > 0 ? (
              roleBadges.map((rb) => (
                <span
                  key={rb.key}
                  className="badge-gold"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Shield size={12} />
                  <span>{rb.label}</span>
                </span>
              ))
            ) : (
              <span className="badge-gold" style={{ fontSize: '0.75rem' }}>عضو</span>
            )}
          </div>
        </div>

        {/* Ambient background decoration */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(255, 184, 0, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Empty Stat Cards (no fake numbers) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="glass-panel gold-border-glow"
              style={{
                borderRadius: '18px',
                padding: '1.5rem',
                background: 'rgba(15, 16, 22, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#a0a0b2', fontSize: '0.88rem', fontWeight: 600 }}>{card.title}</span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 184, 0, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffd54f',
                  }}
                >
                  <Icon size={18} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                {card.value}
              </div>
              <span style={{ fontSize: '0.78rem', color: '#7a7a8c' }}>{card.hint}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
