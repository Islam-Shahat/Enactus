import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Sparkles, MapPin, Globe, Lock } from 'lucide-react';
import { FacebookIcon } from './Icons';
import { useLanguage } from '../context/LanguageContext';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer({ onOpenJoinModal: _onOpenJoinModal }) {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      className="footer-section-responsive"
      style={{
        borderTop: '1px solid rgba(255, 184, 0, 0.25)',
        background: 'linear-gradient(to bottom, #08080a 0%, #040406 100%)',
        position: 'relative',
        padding: '80px 0 35px 0',
        overflow: 'hidden',
      }}
    >
      {/* Background Glyphs */}
      <div
        className="footer-bg-glyphs"
        style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(2.5rem, 8vw, 6rem)',
          color: 'rgba(255, 184, 0, 0.02)',
          pointerEvents: 'none',
          userSelect: 'none',
          maxWidth: '100%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        𓂀 ☥ 𓁹 𓊹
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Top Grid */}
        <div className="footer-grid">
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1.5px solid rgba(255, 184, 0, 0.5)',
                  background: '#0d0d12',
                }}
              >
                <img src="/assets/E2.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <span className="font-cinzel" style={{ fontWeight: 800, fontSize: '1.3rem', color: '#ffb800' }}>
                  ENACTUS QENA
                </span>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#a3a3b2' }}>
                  South Valley University
                </p>
              </div>
            </div>

            <p style={{ color: '#b5b5c6', fontSize: '0.92rem', lineHeight: 1.8, marginBottom: '1.5rem', maxWidth: '360px' }}>
              {t('footerDesc')}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <a
                href="https://www.facebook.com/Enactus.svu"
                target="_blank"
                rel="noreferrer"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 184, 0, 0.12)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffb800',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1877f2';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = '#1877f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 184, 0, 0.12)';
                  e.currentTarget.style.color = '#ffb800';
                  e.currentTarget.style.borderColor = 'rgba(255, 184, 0, 0.3)';
                }}
                title={isAr ? 'صفحة إيناكوس قنا على فيسبوك' : 'Enactus Qena Facebook Page'}
              >
                <FacebookIcon size={20} />
              </a>

              <a
                href="https://www.svu.edu.eg"
                target="_blank"
                rel="noreferrer"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 184, 0, 0.12)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffb800',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                }}
                title={isAr ? 'موقع جامعة جنوب الوادي' : 'South Valley University Website'}
              >
                <Globe size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem' }}>
              {t('footerQuickLinks')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <Link to="/about" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navAbout')}</Link>
              <Link to="/committees" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navCommittees')}</Link>
              <Link to="/team" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navTeam')}</Link>
              <Link to="/events" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navEvents')}</Link>
              <Link to="/partners" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navPartners')}</Link>
              <Link to="/sponsor" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navSponsor')}</Link>
            </div>
          </div>

          {/* Resources & Additional Pages */}
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem' }}>
              {isAr ? 'المحتوى والتواصل' : 'Content & Reach'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <Link to="/impact" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navImpact')}</Link>
              <Link to="/gallery" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navGallery')}</Link>
              <Link to="/news" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navNews')}</Link>
              <Link to="/faq" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navFaq')}</Link>
              <Link to="/alumni" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navAlumni')}</Link>
              <Link to="/contact" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navContact')}</Link>
              <Link to="/terms" style={{ color: '#a0a0b2', textDecoration: 'none', fontSize: '0.9rem' }}>{t('navTerms')}</Link>
            </div>
          </div>

          {/* Location & Action */}
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem' }}>
              {t('footerContact')}
            </h4>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: '#a0a0b2', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              <MapPin size={18} color="#ffb800" style={{ flexShrink: 0, marginTop: '3px' }} />
              <span>{t('footerAddress')}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                to="/join"
                className="btn-primary"
                style={{ padding: '0.75rem 1.4rem', fontSize: '0.92rem', justifyContent: 'center' }}
              >
                <Sparkles size={16} />
                <span>{t('navJoin')}</span>
              </Link>
              <Link
                to="/login"
                className="btn-secondary"
                style={{ padding: '0.65rem 1.4rem', fontSize: '0.88rem', justifyContent: 'center' }}
              >
                <Lock size={15} />
                <span>{t('navLogin')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="footer-bottom-bar"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.88rem', color: '#88889a' }}>
            © {CURRENT_YEAR} Enactus Qena University • {isAr ? 'صُنعت بروح الفراعنة وشغف شباب الصعيد.' : 'Crafted with Pharaonic heritage & passion.'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link to="/terms" style={{ color: '#888', fontSize: '0.82rem', textDecoration: 'none' }}>
              {t('navTerms')}
            </Link>
            <button
              onClick={scrollToTop}
              style={{
                background: 'rgba(255, 184, 0, 0.1)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#ffd54f',
                borderRadius: '9999px',
                padding: '0.45rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              <span>{isAr ? 'للأعلى' : 'Top'}</span>
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 2rem !important;
          }
        }
        @media (max-width: 576px) {
          .footer-section-responsive {
            padding: 50px 0 25px 0 !important;
          }
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          .footer-bottom-bar {
            flex-direction: column !important;
            text-align: center !important;
            gap: 1rem !important;
          }
        }
      `}</style>
    </footer>
  );
}
