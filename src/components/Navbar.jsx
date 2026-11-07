import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sparkles, LogIn, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';

export default function Navbar() {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const mainLinks = [
    { label: isAr ? 'الرئيسية' : 'Home', to: '/' },
    { label: isAr ? 'من نحن' : 'About', to: '/about' },
    { label: isAr ? 'اللجان' : 'Committees', to: '/committees' },
    { label: isAr ? 'الكتيبة والـ Board' : 'Board & Team', to: '/team' },
    { label: isAr ? 'الفعاليات' : 'Events', to: '/events' },
    { label: isAr ? 'الشركاء والرعاة' : 'Partners', to: '/partners' },
  ];

  const moreLinks = [
    { label: isAr ? 'كن راعياً (Sponsorship)' : 'Become a Sponsor', to: '/sponsor' },
    { label: isAr ? 'الأثر والتنمية (Impact)' : 'Impact & SDGs', to: '/impact' },
    { label: isAr ? 'معرض الهوية والميديا' : 'Media & Gallery', to: '/gallery' },
    { label: isAr ? 'الأخبار والبيانات' : 'News & Press', to: '/news' },
    { label: isAr ? 'الأسئلة الشائعة (FAQ)' : 'FAQ', to: '/faq' },
    { label: isAr ? 'شبكة الخريجين (Alumni)' : 'Alumni Network', to: '/alumni' },
    { label: isAr ? 'اتصل بنا' : 'Contact Us', to: '/contact' },
    { label: isAr ? 'الشروط والخصوصية' : 'Terms & Privacy', to: '/terms' },
  ];

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: 'all 0.35s ease',
        background: isScrolled
          ? (isDark ? 'rgba(8, 8, 12, 0.94)' : 'rgba(255, 255, 255, 0.95)')
          : (isDark ? 'linear-gradient(to bottom, rgba(8, 8, 12, 0.98), rgba(8, 8, 12, 0))' : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0))'),
        backdropFilter: isScrolled ? 'blur(16px)' : 'blur(6px)',
        borderBottom: isScrolled
          ? (isDark ? '1px solid rgba(255, 184, 0, 0.25)' : '1px solid rgba(201, 133, 0, 0.25)')
          : '1px solid transparent',
        boxShadow: isScrolled
          ? (isDark ? '0 10px 30px rgba(0, 0, 0, 0.6)' : '0 10px 30px rgba(0, 0, 0, 0.08)')
          : 'none',
      }}
    >
      <div
        className="container navbar-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '80px',
          maxWidth: '1400px',
          padding: '0 1.25rem',
          gap: '1rem',
        }}
      >
        {/* Brand Logo & Title */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            textDecoration: 'none',
            color: isDark ? '#fff' : '#141722',
            flexShrink: 0,
          }}
        >
          <div
            className="navbar-brand-logo"
            style={{
              position: 'relative',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1.5px solid rgba(255, 184, 0, 0.5)',
              boxShadow: '0 0 15px rgba(255, 184, 0, 0.3)',
              background: '#0d0d12',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src="/assets/E2.jpg"
              alt="Enactus Qena Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="font-cinzel navbar-title-text" style={{ fontWeight: 800, fontSize: '1.18rem', color: isDark ? '#ffb800' : '#c98500', whiteSpace: 'nowrap' }}>
                ENACTUS
              </span>
              <span className="badge-gold" style={{ fontSize: '0.65rem', padding: '0.12rem 0.4rem', whiteSpace: 'nowrap' }}>
                QENA
              </span>
            </div>
            <p className="navbar-subtitle" style={{ fontSize: '0.68rem', color: isDark ? '#a3a3b2' : '#6b7280', margin: 0, fontWeight: 500, whiteSpace: 'nowrap' }}>
              South Valley University
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: 'clamp(0.6rem, 1vw, 1.2rem)',
            margin: '0 auto',
          }}
          className="desktop-nav"
        >
          {mainLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  color: isActive ? (isDark ? '#ffd54f' : '#c98500') : (isDark ? '#d4d4dc' : '#3d4052'),
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 800 : 600,
                  transition: 'all 0.25s ease',
                  borderBottom: isActive ? (isDark ? '2px solid #ffb800' : '2px solid #c98500') : '2px solid transparent',
                  paddingBottom: '3px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {link.label}
              </Link>
            );
          })}

          {/* More Links Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#d4d4dc' : '#3d4052',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                cursor: 'pointer',
                padding: '3px 0',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{isAr ? 'المزيد' : 'More'}</span>
              <ChevronDown size={14} />
            </button>

            {moreDropdownOpen && (
              <div
                className="glass-panel gold-border-glow"
                style={{
                  position: 'absolute',
                  top: '40px',
                  insetInlineEnd: '0',
                  width: '230px',
                  borderRadius: '16px',
                  padding: '0.75rem',
                  background: isDark ? 'rgba(14, 15, 22, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  boxShadow: isDark ? '0 15px 40px rgba(0,0,0,0.8)' : '0 15px 40px rgba(0,0,0,0.12)',
                  zIndex: 1000,
                }}
              >
                {moreLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMoreDropdownOpen(false)}
                    style={{
                      color: location.pathname === link.to ? (isDark ? '#ffd54f' : '#c98500') : (isDark ? '#e0e0ea' : '#2b2e3e'),
                      textDecoration: 'none',
                      fontSize: '0.88rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      fontWeight: 600,
                      background: location.pathname === link.to ? (isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(201, 133, 0, 0.1)') : 'transparent',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
          {/* Language Toggle Button */}
          <LanguageToggle />

          {/* Light / Dark Mode Toggle Button */}
          <ThemeToggle variant="compact" />

          {/* Member Login Link */}
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.35rem',
              color: isDark ? '#d4d4dc' : '#2b2e3e',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '0.45rem 0.8rem',
              borderRadius: '9999px',
              background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(255, 184, 0, 0.25)',
              whiteSpace: 'nowrap',
            }}
            className="login-btn-desktop"
          >
            <LogIn size={14} color={isDark ? '#ffb800' : '#c98500'} />
            <span>{isAuthenticated ? (isAr ? 'لوحة التحكم' : 'Dashboard') : (isAr ? 'دخول الأعضاء' : 'Member Login')}</span>
          </Link>

          {/* Join CTA */}
          <Link
            to="/join"
            className="btn-primary animate-pulse-glow"
            style={{
              padding: '0.48rem 1rem',
              fontSize: '0.84rem',
              display: 'none',
              whiteSpace: 'nowrap',
            }}
            id="nav-join-btn"
          >
            <Sparkles size={14} />
            <span>{isAr ? 'اترك أثرك (سجّل)' : 'Join Us'}</span>
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: isDark ? '#ffb800' : '#c98500',
              cursor: 'pointer',
              padding: '0.4rem',
            }}
            className="mobile-toggle-btn"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="glass-panel mobile-nav-drawer"
          style={{
            position: 'absolute',
            top: '80px',
            left: 0,
            right: 0,
            padding: '1.25rem 1rem',
            borderTop: isDark ? '1px solid rgba(255, 184, 0, 0.2)' : '1px solid rgba(201, 133, 0, 0.2)',
            background: isDark ? 'rgba(10, 11, 16, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.9)' : '0 20px 40px rgba(0,0,0,0.12)',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
          }}
        >
          {/* Mobile Controls: Language & Theme Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '0.6rem', width: '100%' }}>
            <LanguageToggle variant="mobile" />
            <ThemeToggle variant="mobile" />
          </div>

          {[...mainLinks, ...moreLinks].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: location.pathname === link.to ? (isDark ? '#ffd54f' : '#c98500') : (isDark ? '#fff' : '#141722'),
                textDecoration: 'none',
                fontSize: '0.98rem',
                fontWeight: 600,
                padding: '0.5rem 0.25rem',
                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.06)',
              }}
            >
              {link.label}
            </Link>
          ))}

          <div className="mobile-drawer-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              onClick={() => setMobileMenuOpen(false)}
              className="btn-secondary"
              style={{ justifyContent: 'center', fontSize: '0.88rem', padding: '0.65rem 0.75rem' }}
            >
              <LogIn size={15} />
              <span>{isAuthenticated ? (isAr ? 'لوحة التحكم' : 'Dashboard') : (isAr ? 'دخول الأعضاء' : 'Sign In')}</span>
            </Link>

            <Link
              to="/join"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-primary"
              style={{ justifyContent: 'center', fontSize: '0.88rem', padding: '0.65rem 0.75rem' }}
            >
              <Sparkles size={15} />
              <span>{isAr ? 'انضم الآن' : 'Join Us'}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Media query styling */}
      <style>{`
        @media (max-width: 768px) {
          .navbar-container { height: 68px !important; padding: 0 0.85rem !important; gap: 0.45rem !important; }
          .navbar-brand-logo { width: 36px !important; height: 36px !important; border-radius: 9px !important; }
          .navbar-title-text { font-size: 1.05rem !important; }
          .mobile-nav-drawer { top: 68px !important; maxHeight: calc(100vh - 68px) !important; }
        }
        @media (max-width: 480px) {
          .navbar-container { padding: 0 0.55rem !important; gap: 0.35rem !important; }
          .navbar-subtitle { display: none !important; }
        }
        @media (max-width: 400px) {
          .mobile-drawer-actions { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 1140px) {
          .desktop-nav { display: flex !important; }
          #nav-join-btn { display: inline-flex !important; }
          .login-btn-desktop { display: inline-flex !important; }
          .mobile-toggle-btn { display: none !important; }
        }
      `}</style>
    </header>
  );
}
