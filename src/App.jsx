import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import GoldenParticles from './components/GoldenParticles';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import RecruitmentModal from './components/RecruitmentModal';

// Pages
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
import LoginPage from './pages/LoginPage';
import GalleryPage from './pages/GalleryPage';
import NewsPage from './pages/NewsPage';
import FAQPage from './pages/FAQPage';
import ImpactPage from './pages/ImpactPage';
import AlumniPage from './pages/AlumniPage';
import TermsPage from './pages/TermsPage';

export default function App() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState('');

  const handleOpenJoinModal = (committeeName = '') => {
    setSelectedCommittee(committeeName);
    setIsJoinModalOpen(true);
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>
        {/* Ambient Golden Particles */}
        <GoldenParticles />

        {/* Global Navbar */}
        <Navbar onOpenJoinModal={() => handleOpenJoinModal()} />

        {/* Dynamic Route Switching */}
        <main style={{ position: 'relative', zIndex: 1 }}>
          <Routes>
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/alumni" element={<AlumniPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="*" element={<HomePage onOpenJoinModal={handleOpenJoinModal} />} />
          </Routes>
        </main>

        {/* Global Footer */}
        <Footer onOpenJoinModal={() => handleOpenJoinModal()} />

        {/* Quick Pop-up Application Modal */}
        <RecruitmentModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          defaultCommittee={selectedCommittee}
        />
      </div>
    </BrowserRouter>
  </ThemeProvider>
  );
}
