import React from 'react';
import { Link } from 'react-router-dom';
import { boardMembers } from '../data/enactusData';
import { useBoard } from '../hooks/usePublicContent';
import SEO from '../components/SEO';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { FacebookIcon, LinkedinIcon } from '../components/Icons';
import { useLanguage } from '../context/LanguageContext';
import { localizeBoardMock } from '../services/mockLocalization';

export default function TeamPage() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const fallback = localizeBoardMock(boardMembers, lang);
  const { data: board = fallback, isLoading } = useBoard(fallback);

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={isAr ? "مجلس الإدارة وقادة الفريق" : "Board & Leadership"}
        description={
          isAr
            ? "مجلس إدارة وقادة كتيبة إيناكوس قنا - نخبة من طلاب جامعة جنوب الوادي يقودون رحلة التغيير والأثر."
            : "The executive board and leaders of Enactus Qena at South Valley University steering our mission."
        }
      />
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            LEADERSHIP & BOARD 2026
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            {isAr ? (
              <>
                مجلس الإدارة وقادة <span className="gold-gradient-text">الكتيبة</span>
              </>
            ) : (
              <>
                Board of Directors & <span className="gold-gradient-text">Leadership</span>
              </>
            )}
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            {isAr
              ? 'نخبة من طلاب جامعة جنوب الوادي يقودون رحلة التغيير والأثر بروح القيادة والمسؤولية لتمثيل صعيد مصر على الساحة العالمية.'
              : 'Student leaders at South Valley University steering our mission with passion and dedication to elevate Upper Egypt on the global stage.'}
          </p>
        </div>

        {/* Master Team Photo Banner */}
        <div
          className="glass-panel gold-border-glow card-shine team-banner-grid responsive-panel-p"
          style={{
            borderRadius: '24px',
            overflow: 'hidden',
            marginBottom: '4.5rem',
            background: 'linear-gradient(135deg, rgba(20, 22, 32, 0.95), rgba(10, 11, 16, 0.98))',
            textAlign: isAr ? 'right' : 'left',
          }}
        >
          <div className="team-banner-image-wrap" style={{ borderRadius: '18px', overflow: 'hidden', boxShadow: '0 15px 40px rgba(0,0,0,0.8)' }}>
            <img
              src="/assets/E6.jpg"
              alt="Enactus Qena Pharaohs Team"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div className="team-banner-content">
            <span className="badge-gold font-cinzel" style={{ marginBottom: '0.85rem' }}>
              ONE TEAM • ONE LEGACY
            </span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>
              {isAr ? 'قيادة ملهمة تصنع مجداً حقيقياً' : 'Inspiring Leadership Forging Real Impact'}
            </h2>
            <p style={{ color: '#b5b5c6', fontSize: '1rem', lineHeight: 1.8, marginBottom: '2rem' }}>
              {isAr
                ? 'يعمل مجلس إدارة إيناكوس قنا بروح التكامل المؤسسي والمسؤولية المجتمعية. رؤيتنا تجمع بين التخطيط الاستراتيجي الصارم، تمكين أعضاء اللجان، وضمان خروج مشاريعنا التنموية بأعلى معايير الجودة العالمية.'
                : 'The Enactus Qena Board operates with integrated strategic vision and social responsibility, connecting all committees into a unified force built for national and global triumph.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/committees" className="btn-primary" style={{ padding: '0.75rem 1.6rem', fontSize: '0.95rem' }}>
                <span>{isAr ? 'تصفح اللجان التخصصية' : 'Explore Committees'}</span>
                <ArrowIcon size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Loading skeleton when empty & loading */}
        {isLoading && board.length === 0 && (
          <div className="grid-3" style={{ marginBottom: '4rem' }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="glass-panel"
                style={{
                  height: '380px',
                  borderRadius: '24px',
                  background: 'rgba(255, 184, 0, 0.04)',
                  border: '1px dashed rgba(255, 184, 0, 0.25)',
                }}
              />
            ))}
          </div>
        )}

        {/* Board Cards Grid */}
        <div className="grid-3" style={{ marginBottom: '4rem' }}>
          {board.map((member, idx) => (
            <div
              key={idx}
              className="glass-panel gold-glow-hover card-shine responsive-card-p"
              style={{
                borderRadius: '24px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                textAlign: isAr ? 'right' : 'left',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div
                    style={{
                      width: '75px',
                      height: '75px',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      border: '2px solid rgba(255, 184, 0, 0.5)',
                      boxShadow: '0 0 20px rgba(255, 184, 0, 0.3)',
                      background: '#0d0d12',
                      flexShrink: 0,
                    }}
                  >
                    <img src={member.image} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', marginBottom: '0.3rem' }}>
                      {member.name}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#ffb800', fontWeight: 700, marginBottom: '0.2rem' }}>
                      {isAr ? member.role : (member.englishRole || member.role)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#a0a0b2' }}>
                      {member.faculty}
                    </div>
                  </div>
                </div>

                <p style={{ color: '#b5b5c6', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
                  {member.bio}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(255, 184, 0, 0.1)',
                      border: '1px solid rgba(255, 184, 0, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffd54f',
                      textDecoration: 'none',
                    }}
                  >
                    <LinkedinIcon size={16} />
                  </a>
                )}
                {member.facebook && (
                  <a
                    href={member.facebook}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(255, 184, 0, 0.1)',
                      border: '1px solid rgba(255, 184, 0, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffd54f',
                      textDecoration: 'none',
                    }}
                  >
                    <FacebookIcon size={16} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
