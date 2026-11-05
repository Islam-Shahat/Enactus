import React, { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider } from '../../components/dashboard/Toast';
import {
  Bell,
  LogOut,
  Menu,
  X,
  Home,
  CheckSquare,
  CalendarCheck,
  Award,
  Trophy,
  Users,
  FileText,
  Building2,
  Handshake,
  DollarSign,
  Share2,
  Calendar,
  Layout,
  Settings,
  ShieldAlert,
  Key,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DASHBOARD_NAV, ROLE_LABELS, filterNavItems } from '../../lib/roles';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageToggle from '../../components/LanguageToggle';
import NotificationsBell from '../../components/dashboard/NotificationsBell';

const NAV_ICONS = {
  home: Home,
  announcements: Megaphone,
  notifications: Bell,
  tasks: CheckSquare,
  attendance: CalendarCheck,
  points: Award,
  leaderboard: Trophy,
  members: Users,
  applications: FileText,
  companies: Building2,
  agreements: Handshake,
  payments: DollarSign,
  posts: Share2,
  events: Calendar,
  site: Layout,
  settings: Settings,
  audit: ShieldAlert,
  roles: Key,
};

export default function DashboardLayout() {
  const { profile, roles, isSuperAdmin, hasRole, signOut, user } = useAuth();
  const { lang, t } = useLanguage();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true, state: { loggedOut: true } });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Filter nav items by permissions
  const visibleNav = filterNavItems(DASHBOARD_NAV, roles, isSuperAdmin);

  const displayName =
    (lang === 'ar' ? (profile?.full_name_ar || profile?.full_name_en) : (profile?.full_name_en || profile?.full_name_ar)) ||
    user?.email?.split('@')[0] || (lang === 'ar' ? 'عضو' : 'Member');

  const primaryRole = roles[0]?.role || 'member';
  const roleLabel = ROLE_LABELS[primaryRole]?.[lang] ?? ROLE_LABELS[primaryRole]?.ar ?? primaryRole;

  return (
    <ToastProvider>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: 'var(--bg-dark)',
          color: 'var(--text-main)',
        }}
      >
      {/* Sidebar - Desktop */}
      <aside
        className="dashboard-sidebar-desktop"
        style={{
          width: '260px',
          flexShrink: 0,
          background: 'rgba(12, 13, 18, 0.98)',
          borderInlineEnd: '1px solid rgba(255, 184, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid rgba(255, 184, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <img
            src="/assets/E2.jpg"
            alt="Enactus Logo"
            style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(255, 184, 0, 0.4)' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="font-cinzel" style={{ fontWeight: 900, color: '#ffd54f', fontSize: '1rem' }}>
                ENACTUS
              </span>
              <span className="badge-gold" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                PORTAL
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#a3a3b2', margin: 0 }}>Internal Operations</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
          }}
        >
          {visibleNav.map((item) => {
            const IconComponent = NAV_ICONS[item.key] || Home;
            const isHome = item.path === '/dashboard';
            const isActive = isHome
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.key}
                to={item.path}
                end={isHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 1rem',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#ffd54f' : '#a3a3b2',
                  background: isActive ? 'rgba(255, 184, 0, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(255, 184, 0, 0.3)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <IconComponent size={18} color={isActive ? '#ffb800' : '#888899'} />
                <span>{item.label[lang] || item.label.ar}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card at bottom of sidebar */}
        <div
          className="dashboard-sidebar-user-card"
          style={{
            padding: '1.25rem',
            borderTop: '1px solid rgba(255, 184, 0, 0.15)',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          <Link
            to="/dashboard/profile"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={displayName}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid rgba(255, 184, 0, 0.4)',
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                className="dashboard-sidebar-user-name"
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--text-main, #fff)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {displayName}
              </p>
              <span className="badge-gold" style={{ fontSize: '0.68rem', marginTop: '0.2rem', display: 'inline-block' }}>
                {roleLabel}
              </span>
            </div>
          </Link>

          <button
            onClick={handleSignOut}
            className="btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.55rem',
              fontSize: '0.85rem',
              color: '#ff8888',
              borderColor: 'rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.08)',
              cursor: 'pointer',
            }}
          >
            <LogOut size={15} />
            <span>{t('signOutButton')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header
          className="dashboard-topbar"
          style={{
            height: '70px',
            background: 'rgba(12, 13, 18, 0.95)',
            borderBottom: '1px solid rgba(255, 184, 0, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backdropFilter: 'blur(10px)',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="dashboard-mobile-toggle"
              onClick={() => setMobileDrawerOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffb800',
                cursor: 'pointer',
                padding: '0.4rem',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Open Navigation Drawer"
            >
              <Menu size={24} />
            </button>
            <span className="dashboard-topbar-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffd54f' }}>
              {t('dashboardTitle')}
            </span>
          </div>

          {/* Right Topbar Controls */}
          <div className="dashboard-topbar-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Language Switch */}
            <LanguageToggle className="dashboard-topbar-pill" />

            {/* Live Notifications Bell with Unread Badge & Dropdown */}
            <NotificationsBell />

            {/* Existing Theme Toggle */}
            <ThemeToggle variant="compact" />

            {/* User display badge on desktop & mobile */}
            <Link
              to="/dashboard/profile"
              className="dashboard-topbar-user"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                borderInlineStart: '1px solid rgba(255, 184, 0, 0.2)',
                paddingInlineStart: '0.75rem',
                textDecoration: 'none',
              }}
            >
              {profile?.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid rgba(255, 184, 0, 0.4)',
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ textAlign: 'end', lineHeight: 1.25 }}>
                <span
                  className="dashboard-topbar-name"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'block',
                    color: '#fff',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </span>
                <span
                  className="dashboard-topbar-role"
                  style={{
                    fontSize: '0.72rem',
                    color: '#ffd54f',
                    display: 'block',
                    fontWeight: 600,
                  }}
                >
                  {roleLabel}
                </span>
              </div>
            </Link>

            {/* Direct Sign Out on Topbar (rendered once) */}
            <button
              onClick={handleSignOut}
              className="btn-secondary dashboard-topbar-signout"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.82rem',
                gap: '0.4rem',
                display: 'inline-flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              <LogOut size={14} />
              <span>{t('signOutButton')}</span>
            </button>
          </div>
        </header>

        {/* Page Inner Container */}
        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          <React.Suspense
            fallback={
              <div
                role="status"
                style={{
                  minHeight: '40vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffd54f',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '3px solid rgba(255, 184, 0, 0.2)',
                    borderTopColor: '#ffb800',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              </div>
            }
          >
            <Outlet />
          </React.Suspense>
        </main>
      </div>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
          }}
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            style={{
              width: '280px',
              maxWidth: '80%',
              background: 'rgba(12, 13, 18, 0.98)',
              borderInlineEnd: '1px solid rgba(255, 184, 0, 0.3)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 0 40px rgba(0,0,0,0.9)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '1.25rem',
                borderBottom: '1px solid rgba(255, 184, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <img src="/assets/E2.jpg" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                <span className="font-cinzel" style={{ fontWeight: 900, color: '#ffd54f' }}>ENACTUS</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LanguageToggle style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }} />
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#ffb800', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {visibleNav.map((item) => {
                const IconComponent = NAV_ICONS[item.key] || Home;
                const isHome = item.path === '/dashboard';
                const isActive = isHome
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.key}
                    to={item.path}
                    end={isHome}
                    onClick={() => setMobileDrawerOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontSize: '0.92rem',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#ffd54f' : '#a3a3b2',
                      background: isActive ? 'rgba(255, 184, 0, 0.12)' : 'transparent',
                    }}
                  >
                    <IconComponent size={18} color={isActive ? '#ffb800' : '#888899'} />
                    <span>{item.label[lang] || item.label.ar}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255, 184, 0, 0.2)' }}>
              <button
                onClick={handleSignOut}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <LogOut size={16} />
                <span>{t('signOutButton')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        /* Breakpoint: At >= 1024px desktop sidebar is visible; below 1024px drawer is used */
        @media (max-width: 1023.98px) {
          .dashboard-sidebar-desktop { display: none !important; }
          .dashboard-mobile-toggle { display: inline-flex !important; }
        }
        @media (max-width: 768px) {
          .dashboard-topbar { padding: 0 1rem !important; }
        }
        @media (max-width: 480px) {
          .dashboard-topbar-title { display: none !important; }
          .dashboard-topbar { padding: 0 0.65rem !important; gap: 0.35rem !important; }
          .dashboard-topbar-controls { gap: 0.4rem !important; }
          .dashboard-topbar-pill { padding: 0.35rem 0.5rem !important; }
          .dashboard-topbar-name { max-width: 75px !important; font-size: 0.78rem !important; }
          .dashboard-topbar-role { font-size: 0.68rem !important; }
          .dashboard-topbar-signout { padding: 0.35rem 0.55rem !important; font-size: 0.76rem !important; }
        }
        @media (max-width: 360px) {
          .dashboard-topbar-name { max-width: 55px !important; }
        }

        /* Light mode support */
        [data-theme="light"] .dashboard-sidebar-desktop,
        [data-theme="light"] .dashboard-topbar {
          background: rgba(255, 255, 255, 0.96) !important;
          border-color: rgba(212, 136, 0, 0.22) !important;
          color: #14171f !important;
        }
        [data-theme="light"] .dashboard-topbar-name,
        [data-theme="light"] .dashboard-sidebar-user-name {
          color: #14171f !important;
        }
        [data-theme="light"] .dashboard-sidebar-user-card {
          background: transparent !important;
          border-top-color: rgba(212, 136, 0, 0.15) !important;
        }
      `}</style>
      </div>
    </ToastProvider>
  );
}

