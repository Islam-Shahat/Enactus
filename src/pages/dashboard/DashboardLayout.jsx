import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Globe,
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DASHBOARD_NAV, ROLE_LABELS } from '../../lib/roles';
import ThemeToggle from '../../components/ThemeToggle';
import { t } from '../../lib/strings';

const NAV_ICONS = {
  home: Home,
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
  const visibleNav = DASHBOARD_NAV.filter((item) => {
    if (item.allow === null) return true;
    if (Array.isArray(item.allow) && item.allow.length === 0) return isSuperAdmin;
    return hasRole(item.allow);
  });

  const displayName =
    profile?.full_name_ar || profile?.full_name_en || user?.email?.split('@')[0] || 'عضو';

  const primaryRole = roles[0]?.role || 'member';
  const roleLabel = ROLE_LABELS[primaryRole]?.ar || primaryRole;

  return (
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
                <span>{item.label.ar}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card at bottom of sidebar */}
        <div
          style={{
            padding: '1.25rem',
            borderTop: '1px solid rgba(255, 184, 0, 0.15)',
            background: 'rgba(8, 8, 12, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#fff',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffd54f' }}>
              لوحة التحكم
            </span>
          </div>

          {/* Right Topbar Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Language Switch Placeholder */}
            <button
              disabled
              title={t('languagePlaceholder')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                borderRadius: '8px',
                padding: '0.4rem 0.65rem',
                color: '#a3a3b2',
                fontSize: '0.8rem',
                cursor: 'default',
              }}
            >
              <Globe size={15} color="#ffd54f" />
              <span>AR</span>
            </button>

            {/* Notifications Bell Placeholder */}
            <button
              disabled
              title={t('notificationsPlaceholder')}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                borderRadius: '8px',
                padding: '0.45rem',
                color: '#a3a3b2',
                cursor: 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={16} />
            </button>

            {/* Existing Theme Toggle */}
            <ThemeToggle variant="compact" />

            {/* User display badge on desktop */}
            <div
              className="dashboard-topbar-user"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                borderInlineStart: '1px solid rgba(255, 184, 0, 0.2)',
                paddingInlineStart: '0.85rem',
              }}
            >
              <div style={{ textAlign: 'end' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', color: '#fff' }}>
                  {displayName}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#ffd54f' }}>
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Direct Sign Out on Topbar */}
            <button
              onClick={handleSignOut}
              className="btn-secondary"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.82rem',
                gap: '0.4rem',
              }}
            >
              <LogOut size={14} />
              <span>{t('signOutButton')}</span>
            </button>
          </div>
        </header>

        {/* Page Inner Container */}
        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          <Outlet />
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
              <button
                onClick={() => setMobileDrawerOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffb800', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
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
                    <span>{item.label.ar}</span>
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
        @media (max-width: 768px) {
          .dashboard-sidebar-desktop { display: none !important; }
          .dashboard-mobile-toggle { display: flex !important; }
          .dashboard-topbar-user { display: none !important; }
        }
      `}</style>
    </div>
  );
}

