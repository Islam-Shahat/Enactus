import React, { Suspense, useState } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import GoldenParticles from './components/GoldenParticles';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import RecruitmentModal from './components/RecruitmentModal';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleGuard from './routes/RoleGuard';
import { DASHBOARD_NAV } from './lib/roles';

// Public Pages (eager or standard imports)
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import CommitteesPage from './pages/CommitteesPage';
import CommitteeDetailsPage from './pages/CommitteeDetailsPage';
import TeamPage from './pages/TeamPage';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import JoinUsPage from './pages/JoinUsPage';
import PartnersPage from './pages/PartnersPage';
import BecomeSponsorPage from './pages/BecomeSponsorPage';
import ContactPage from './pages/ContactPage';
import GalleryPage from './pages/GalleryPage';
import NewsPage from './pages/NewsPage';
import FAQPage from './pages/FAQPage';
import ImpactPage from './pages/ImpactPage';
import AlumniPage from './pages/AlumniPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';

// Lazy-loaded Auth Pages (isolates zod and react-hook-form from public bundle)
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));

// Dashboard Shell (Lazy-loaded for code splitting)
const DashboardLayout = React.lazy(() => import('./pages/dashboard/DashboardLayout'));
const DashboardHome = React.lazy(() => import('./pages/dashboard/DashboardHome'));
const TicketPage = React.lazy(() => import('./pages/TicketPage'));
const DashboardEventsPage = React.lazy(() => import('./pages/dashboard/EventsPage'));
const SiteCmsPage = React.lazy(() => import('./pages/dashboard/SiteCmsPage'));
const TasksPage = React.lazy(() => import('./pages/dashboard/TasksPage'));
const AttendancePage = React.lazy(() => import('./pages/dashboard/AttendancePage'));
const PointsPage = React.lazy(() => import('./pages/dashboard/PointsPage'));
const LeaderboardPage = React.lazy(() => import('./pages/dashboard/LeaderboardPage'));
const ApplicationsPage = React.lazy(() => import('./pages/dashboard/ApplicationsPage'));
const CompaniesPage = React.lazy(() => import('./pages/dashboard/CompaniesPage'));
const AgreementsPage = React.lazy(() => import('./pages/dashboard/AgreementsPage'));
const PaymentsPage = React.lazy(() => import('./pages/dashboard/PaymentsPage'));
const FinancePage = React.lazy(() => import('./pages/dashboard/FinancePage'));
const PostsPage = React.lazy(() => import('./pages/dashboard/PostsPage'));
const MembersPage = React.lazy(() => import('./pages/dashboard/MembersPage'));
const RolesPage = React.lazy(() => import('./pages/dashboard/RolesPage'));
const ProfilePage = React.lazy(() => import('./pages/dashboard/ProfilePage'));
const SettingsPage = React.lazy(() => import('./pages/dashboard/SettingsPage'));
const NotificationsPage = React.lazy(() => import('./pages/dashboard/NotificationsPage'));
const AnnouncementsPage = React.lazy(() => import('./pages/dashboard/AnnouncementsPage'));
const AuditPage = React.lazy(() => import('./pages/dashboard/AuditPage'));
const SeasonPage = React.lazy(() => import('./pages/dashboard/SeasonPage'));
const DashboardPlaceholder = React.lazy(() => import('./pages/dashboard/DashboardPlaceholder'));
const DashboardNotFound = React.lazy(() => import('./pages/dashboard/DashboardNotFound'));

function PageFallback() {
  return (
    <div
      role="status"
      style={{
        minHeight: '60vh',
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DashboardFallback() {
  return (
    <div
      role="status"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#08080a',
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PublicLayout({ onOpenJoinModal }) {
  return (
    <div
      className="public-layout-root"
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <GoldenParticles />
      <Navbar onOpenJoinModal={onOpenJoinModal} />
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <Outlet />
      </main>
      <Footer onOpenJoinModal={onOpenJoinModal} />
    </div>
  );
}

export default function App() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState('');

  const handleOpenJoinModal = (committeeName = '') => {
    setSelectedCommittee(committeeName);
    setIsJoinModalOpen(true);
  };

  return (
    <>
      <Routes>
        {/* Public Website Layout */}
        <Route element={<PublicLayout onOpenJoinModal={handleOpenJoinModal} />}>
          <Route path="/" element={<HomePage onOpenJoinModal={handleOpenJoinModal} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/committees" element={<CommitteesPage />} />
          <Route path="/committees/:slug" element={<CommitteeDetailsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:slug" element={<EventDetailsPage />} />
          <Route path="/join" element={<JoinUsPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/sponsor" element={<BecomeSponsorPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/ticket/:code" element={<Suspense fallback={<PageFallback />}><TicketPage /></Suspense>} />
          <Route path="/login" element={<Suspense fallback={<PageFallback />}><LoginPage /></Suspense>} />
          <Route path="/forgot-password" element={<Suspense fallback={<PageFallback />}><ForgotPasswordPage /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<PageFallback />}><ResetPasswordPage /></Suspense>} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:slug" element={<NewsPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/impact" element={<ImpactPage />} />
          <Route path="/alumni" element={<AlumniPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Internal Dashboard (Lazy Loaded + Protected) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardFallback />}>
                <DashboardLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />

          {/* Phase 6, 7 & 8 wired pages */}
          <Route
            path="tasks"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'tasks')?.allow}>
                <TasksPage />
              </RoleGuard>
            }
          />
          <Route
            path="attendance"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'attendance')?.allow}>
                <AttendancePage />
              </RoleGuard>
            }
          />
          <Route
            path="points"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'points')?.allow}>
                <PointsPage />
              </RoleGuard>
            }
          />
          <Route
            path="leaderboard"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'leaderboard')?.allow}>
                <LeaderboardPage />
              </RoleGuard>
            }
          />
          <Route
            path="applications"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'applications')?.allow}>
                <ApplicationsPage />
              </RoleGuard>
            }
          />
          <Route
            path="companies"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'companies')?.allow}>
                <CompaniesPage />
              </RoleGuard>
            }
          />
          <Route
            path="agreements"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'agreements')?.allow}>
                <AgreementsPage />
              </RoleGuard>
            }
          />
          <Route
            path="payments"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'payments')?.allow}>
                <PaymentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="finance"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'finance')?.allow}>
                <FinancePage />
              </RoleGuard>
            }
          />
          <Route
            path="posts"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'posts')?.allow}>
                <PostsPage />
              </RoleGuard>
            }
          />
          <Route
            path="posts/partners"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'posts')?.allow}>
                <PostsPage />
              </RoleGuard>
            }
          />
          <Route
            path="events"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'events')?.allow}>
                <DashboardEventsPage />
              </RoleGuard>
            }
          />
          <Route
            path="members"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'members')?.allow}>
                <MembersPage />
              </RoleGuard>
            }
          />
          <Route
            path="roles"
            element={
              <RoleGuard allow={[]}>
                <RolesPage />
              </RoleGuard>
            }
          />
          <Route
            path="profile"
            element={<ProfilePage />}
          />
          <Route
            path="site"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'site')?.allow}>
                <SiteCmsPage />
              </RoleGuard>
            }
          />
          <Route
            path="settings"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'settings')?.allow}>
                <SettingsPage />
              </RoleGuard>
            }
          />
          <Route
            path="notifications"
            element={<NotificationsPage />}
          />
          <Route
            path="announcements"
            element={<AnnouncementsPage />}
          />
          <Route
            path="audit"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'audit')?.allow}>
                <AuditPage />
              </RoleGuard>
            }
          />
          <Route
            path="season"
            element={
              <RoleGuard allow={DASHBOARD_NAV.find((n) => n.key === 'season')?.allow}>
                <SeasonPage />
              </RoleGuard>
            }
          />

          {/* Placeholders for upcoming phases */}
          {DASHBOARD_NAV.filter(
            (item) =>
              item.path !== '/dashboard' &&
              ![
                'tasks',
                'attendance',
                'points',
                'leaderboard',
                'applications',
                'companies',
                'agreements',
                'payments',
                'finance',
                'posts',
                'events',
                'site',
                'members',
                'roles',
                'settings',
                'notifications',
                'announcements',
                'audit',
                'season',
              ].includes(item.key)
          ).map((item) => {
            const subPath = item.path.replace('/dashboard/', '');
            return (
              <Route
                key={item.key}
                path={subPath}
                element={
                  <RoleGuard allow={item.allow}>
                    <DashboardPlaceholder title={item.label.ar} />
                  </RoleGuard>
                }
              />
            );
          })}
          <Route path="*" element={<DashboardNotFound />} />
        </Route>
      </Routes>

      {/* Quick Pop-up Application Modal */}
      <RecruitmentModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        defaultCommittee={selectedCommittee}
      />
    </>
  );
}
