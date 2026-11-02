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

// Lazy-loaded Auth Pages (isolates zod and react-hook-form from public bundle)
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));

// Dashboard Shell (Lazy-loaded for code splitting)
const DashboardLayout = React.lazy(() => import('./pages/dashboard/DashboardLayout'));
const DashboardHome = React.lazy(() => import('./pages/dashboard/DashboardHome'));
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
    <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>
      <GoldenParticles />
      <Navbar onOpenJoinModal={onOpenJoinModal} />
      <main style={{ position: 'relative', zIndex: 1 }}>
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
          <Route path="/login" element={<Suspense fallback={<PageFallback />}><LoginPage /></Suspense>} />
          <Route path="/forgot-password" element={<Suspense fallback={<PageFallback />}><ForgotPasswordPage /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<PageFallback />}><ResetPasswordPage /></Suspense>} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/impact" element={<ImpactPage />} />
          <Route path="/alumni" element={<AlumniPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<HomePage onOpenJoinModal={handleOpenJoinModal} />} />
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
          {DASHBOARD_NAV.filter((item) => item.path !== '/dashboard').map((item) => {
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
