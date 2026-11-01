import React from 'react';
import { Link } from 'react-router-dom';
import { boardMembers } from '../data/enactusData';
import { Sparkles, Shield, Award, Users, ArrowLeft } from 'lucide-react';
import { FacebookIcon, LinkedinIcon } from '../components/Icons';

export default function TeamPage() {
  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            LEADERSHIP & BOARD 2026
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            مجلس الإدارة وقادة <span className="gold-gradient-text">الكتيبة</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            نخبة من طلاب جامعة جنوب الوادي يقودون رحلة التغيير والأثر بروح القيادة والمسؤولية لتمثيل صعيد مصر على الساحة العالمية.
          </p>
        </div>

        {/* Master Team Photo Banner */}
        <div
          className="glass-panel gold-border-glow card-shine team-banner-grid responsive-panel-p"
          style={{
            borderRadius: '24px',
            overflow: 'hidden',
            padding: '2.5rem',
            marginBottom: '4.5rem',
            background: 'linear-gradient(135deg, rgba(20, 22, 32, 0.95), rgba(10, 11, 16, 0.98))',
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '2.5rem',
            alignItems: 'center',
          }}
        >
          <div style={{ borderRadius: '18px', overflow: 'hidden', boxShadow: '0 15px 40px rgba(0,0,0,0.8)' }}>
            <img
              src="/assets/E6.jpg"
              alt="Enactus Qena Pharaohs Team"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div>
            <span className="badge-gold font-cinzel" style={{ marginBottom: '0.85rem' }}>
              ONE TEAM • ONE LEGACY
            </span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>
              قيادة ملهمة تصنع مجداً حقيقياً
            </h2>
            <p style={{ color: '#c5c5d6', fontSize: '1.02rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
              يجتمع في مجلس إدارة إيناكوس قنا التنوع الأكاديمي والمهاري؛ من كليات الهندسة، التجارة، الزراعة، الحاسبات، والآداب، متكاتفين معاً لإدارة المشاريع والفعاليات وتمثيل قنا في كبرى المحافل.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="badge-gold">✓ تمكين الشباب</span>
              <span className="badge-gold">✓ فكر ريادي</span>
              <span className="badge-gold">✓ استدامة مجتمعية</span>
            </div>
          </div>
        </div>

        {/* Board Members Grid */}
        <div
          className="responsive-auto-grid-320"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '1.5rem',
            marginBottom: '4.5rem',
          }}
        >
          {boardMembers.map((member, idx) => (
            <div
              key={idx}
              className="glass-panel gold-glow-hover card-shine responsive-card-p"
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1.5px solid rgba(255, 184, 0, 0.22)',
                background: 'rgba(18, 19, 28, 0.85)',
              }}
            >
              <div style={{ padding: '2rem 1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid #ffb800',
                      boxShadow: '0 0 15px rgba(255, 184, 0, 0.3)',
                    }}
                  >
                    <img
                      src={member.image}
                      alt={member.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', marginBottom: '0.2rem' }}>
                      {member.name}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#ffb800', fontWeight: 700 }}>
                      {member.role}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#a0a0b2' }}>
                      {member.faculty}
                    </div>
                  </div>
                </div>

                <p style={{ color: '#b5b5c6', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  {member.bio}
                </p>
              </div>

              {/* Social links */}
              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1rem 1.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(10, 11, 16, 0.5)',
                }}
              >
                <span className="font-cinzel" style={{ fontSize: '0.75rem', color: '#ffd54f' }}>
                  {member.englishRole}
                </span>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <a
                    href="https://www.facebook.com/Enactus.svu"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(255, 184, 0, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffb800',
                      textDecoration: 'none',
                    }}
                  >
                    <FacebookIcon size={16} />
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(255, 184, 0, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffb800',
                      textDecoration: 'none',
                    }}
                  >
                    <LinkedinIcon size={16} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
            تريد أن تصبح أحد قادة الغد في إيناكوس قنا؟
          </h3>
          <Link to="/join" className="btn-primary" style={{ padding: '0.85rem 2.2rem', fontSize: '1.05rem' }}>
            <span>قدّم الآن وابدأ رحلتك القيادية</span>
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .team-banner-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
