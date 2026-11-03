import React from 'react';
import { CheckSquare, Award, Calendar, Users, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ROLE_LABELS } from '../../lib/roles';

export default function DashboardHome() {
  const { profile, roles, user } = useAuth();
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';

  const displayName =
    (isAr ? (profile?.full_name_ar || profile?.full_name_en) : (profile?.full_name_en || profile?.full_name_ar)) ||
    user?.email?.split('@')[0] || (isAr ? 'عضو' : 'Member');

  const roleBadges = roles.map((r) => ({
    key: r.role,
    label: ROLE_LABELS[r.role]?.[lang] ?? ROLE_LABELS[r.role]?.ar ?? r.role,
  }));

  const statCards = [
    {
      title: isAr ? 'المهام المعينة' : 'Assigned Tasks',
      icon: CheckSquare,
      value: '—',
      hint: isAr ? 'لا توجد مهام نشطة حالياً' : 'No active tasks currently',
    },
    {
      title: isAr ? 'رصيد النقاط' : 'Points Balance',
      icon: Award,
      value: '—',
      hint: isAr ? 'سجل النقاط قيد التجهيز' : 'Points ledger being set up',
    },
    {
      title: isAr ? 'سجل الحضور' : 'Attendance Record',
      icon: Calendar,
      value: '—',
      hint: isAr ? 'لا توجد جلسات مسجلة' : 'No recorded sessions',
    },
    {
      title: isAr ? 'اللجنة التابع لها' : 'Assigned Committee',
      icon: Users,
      value: '—',
      hint: isAr ? 'تحديثات الموسم الجديد' : 'New season updates',
    },
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
          </div>

          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
            {t('dashboardWelcome')}{' '}
            <span className="gold-gradient-text">{displayName}</span>
          </h1>

          <p style={{ color: '#a0a0b2', fontSize: '0.95rem', maxWidth: '650px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {t('dashboardWelcomeDesc')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#c5c5d6', fontWeight: 600 }}>
              {isAr ? 'الأدوار المصرحة:' : 'Authorized Roles:'}
            </span>
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
              <span className="badge-gold" style={{ fontSize: '0.75rem' }}>
                {isAr ? 'عضو' : 'Member'}
              </span>
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
              className="glass-panel gold-glow-hover card-shine"
              style={{
                borderRadius: '18px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '140px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e0e0ea' }}>
                  {card.title}
                </span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 184, 0, 0.1)',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffd54f',
                  }}
                >
                  <Icon size={18} />
                </div>
              </div>

              <div>
                <p style={{ fontSize: '0.8rem', color: '#888899', margin: 0 }}>
                  {card.hint}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
