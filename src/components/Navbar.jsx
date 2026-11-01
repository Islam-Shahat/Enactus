import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sparkles, Compass, Shield, Rocket, Image, Award, Users, Calendar, LogIn, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);


  const mainLinks = [
    { label: 'الرئيسية', to: '/' },
    { label: 'من نحن', to: '/about' },
    { label: 'اللجان', to: '/committees' },
    { label: 'الكتيبة والـ Board', to: '/team' },
    { label: 'الفعاليات', to: '/events' },
    { label: 'الشركاء والرعاة', to: '/partners' },
  ];

  const moreLinks = [
    { label: 'كن راعياً (Sponsorship)', to: '/sponsor' },
    { label: 'الأثر والتنمية (Impact)', to: '/impact' },
    { label: 'معرض الهوية والميديا', to: '/gallery' },
    { label: 'الأخبار والبيانات', to: '/news' },
    { label: 'الأسئلة الشائعة (FAQ)', to: '/faq' },
    { label: 'شبكة الخريجين (Alumni)', to: '/alumni' },
    { label: 'اتصل بنا', to: '/contact' },
    { label: 'سياسة الخصوصية والشروط', to: '/terms' },
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
      <div className="container navbar-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
        {/* Brand Logo & Title */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            color: isDark ? '#fff' : '#141722',
            minWidth: 0,
          }}
        >
          <div
            className="navbar-brand-logo"
            style={{
              position: 'relative',
              width: '46px',
              height: '46px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span className="font-cinzel navbar-title-text" style={{ fontWeight: 800, fontSize: '1.2rem', color: isDark ? '#ffb800' : '#c98500' }}>
                ENACTUS
              </span>
              <span className="badge-gold" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                QENA
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: isDark ? '#a3a3b2' : '#6b7280', margin: 0, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              South Valley University
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '1.35rem',
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
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 800 : 600,
                  transition: 'all 0.25s ease',
                  borderBottom: isActive ? (isDark ? '2px solid #ffb800' : '2px solid #c98500') : '2px solid transparent',
                  paddingBottom: '4px',
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
                fontSize: '0.92rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <span>المزيد</span>
              <ChevronDown size={14} />
            </button>

            {moreDropdownOpen && (
              <div
                className="glass-panel gold-border-glow"
                style={{
                  position: 'absolute',
                  top: '40px',
                  right: '0',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Light / Dark Mode Toggle Button */}
          <ThemeToggle variant="compact" />

          {/* Member Login Link */}
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.4rem',
              color: isDark ? '#d4d4dc' : '#2b2e3e',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '0.55rem 0.9rem',
              borderRadius: '9999px',
              background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(255, 184, 0, 0.25)',
            }}
            className="login-btn-desktop"
          >
            <LogIn size={15} color={isDark ? '#ffb800' : '#c98500'} />
            <span>{isAuthenticated ? 'لوحة التحكم' : 'دخول الأعضاء'}</span>
          </Link>

          {/* Join CTA */}
          <Link
            to="/join"
            className="btn-primary animate-pulse-glow"
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.88rem',
              display: 'none',
            }}
            id="nav-join-btn"
          >
            <Sparkles size={15} />
            <span>اترك أثرك (سجّل)</span>
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
              padding: '0.5rem',
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
          {/* Mobile Theme Toggle Card */}
          <div style={{ marginBottom: '0.4rem' }}>
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
              <span>{isAuthenticated ? 'لوحة التحكم' : 'دخول الأعضاء'}</span>
            </Link>

            <Link
              to="/join"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-primary"
              style={{ justifyContent: 'center', fontSize: '0.88rem', padding: '0.65rem 0.75rem' }}
            >
              <Sparkles size={15} />
              <span>انضم الآن</span>
            </Link>
          </div>
        </div>
      )}

      {/* Media query styling */}
      <style>{`
        @media (max-width: 768px) {
          .navbar-container { height: 72px !important; }
          .navbar-brand-logo { width: 38px !important; height: 38px !important; border-radius: 10px !important; }
          .navbar-title-text { font-size: 1.05rem !important; }
          .mobile-nav-drawer { top: 72px !important; maxHeight: calc(100vh - 72px) !important; }
        }
        @media (max-width: 400px) {
          .mobile-drawer-actions { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 1080px) {
          .desktop-nav { display: flex !important; }
          #nav-join-btn { display: inline-flex !important; }
          .login-btn-desktop { display: inline-flex !important; }
          .mobile-toggle-btn { display: none !important; }
        }
      `}</style>
    </header>
  );
}
