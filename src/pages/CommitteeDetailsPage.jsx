import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { committeesData } from '../data/enactusData';
import { useCommittee } from '../hooks/usePublicContent';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, CheckCircle2, UserCheck, Briefcase, Award, ArrowLeft, ArrowRight } from 'lucide-react';

export default function CommitteeDetailsPage() {
  const { slug } = useParams();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const fallbackCommittee = committeesData.find((c) => c.slug === slug);
  const { data: committee = fallbackCommittee, isLoading } = useCommittee(slug, committeesData);

  if (!committee && !isLoading) {
    return <Navigate to="/committees" replace />;
  }

  if (!committee && isLoading) {
    return (
      <div className="page-container-padding" style={{ paddingTop: '140px', minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255, 184, 0, 0.2)', borderTopColor: '#ffb800', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const displayName = isAr ? committee.arabicName : (committee.name || committee.arabicName);
  const secondaryName = isAr ? committee.name : committee.arabicName;

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={`${displayName} (${committee.code})`}
        description={committee.brief || committee.description}
      />
      <div className="container">
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontSize: '0.9rem', flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: '#a0a0b2', textDecoration: 'none' }}>
            {isAr ? 'الرئيسية' : 'Home'}
          </Link>
          <span style={{ color: '#666' }}>/</span>
          <Link to="/committees" style={{ color: '#a0a0b2', textDecoration: 'none' }}>
            {isAr ? 'اللجان' : 'Committees'}
          </Link>
          <span style={{ color: '#666' }}>/</span>
          <span style={{ color: '#ffd54f', fontWeight: 700 }}>{displayName}</span>
        </div>

        {/* Committee Header Banner */}
        <div
          className="glass-panel gold-border-glow card-shine responsive-panel-p"
          style={{
            borderRadius: '24px',
            padding: '3rem 2.5rem',
            marginBottom: '3.5rem',
            background: 'linear-gradient(135deg, rgba(22, 24, 34, 0.95), rgba(10, 11, 16, 0.98))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span className="badge-gold font-cinzel">{committee.code}</span>
                {committee.mascotDesc && <span className="badge-gold">{committee.mascotDesc}</span>}
              </div>
              <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 3.4rem)', fontWeight: 900, color: '#fff', marginBottom: '0.4rem' }}>
                {displayName}
              </h1>
              {secondaryName && (
                <div className="font-outfit" style={{ fontSize: '1.15rem', color: '#ffb800', fontWeight: 700 }}>
                  {secondaryName}
                </div>
              )}
            </div>

            <Link
              to={`/join?committee=${encodeURIComponent(committee.arabicName)}`}
              className="btn-primary animate-pulse-glow comm-hero-btn"
              style={{ fontSize: '1.05rem', padding: '0.85rem 2rem' }}
            >
              <Sparkles size={18} />
              <span>{isAr ? 'قدّم لهذه اللجنة الآن' : 'Apply for this Committee'}</span>
            </Link>
          </div>

          <p style={{ color: '#d2d2e2', fontSize: '1.08rem', lineHeight: 1.8, maxWidth: '850px', margin: '0 0 1.5rem 0' }}>
            {committee.description}
          </p>

          {committee.quote && (
            <blockquote
              style={{
                background: 'rgba(255, 184, 0, 0.08)',
                borderInlineStart: '4px solid #ffb800',
                padding: '1rem 1.25rem',
                borderRadius: isAr ? '0 12px 12px 0' : '12px 0 0 12px',
                color: '#ffd54f',
                fontSize: '1rem',
                fontStyle: 'italic',
                margin: 0,
              }}
            >
              {committee.quote}
            </blockquote>
          )}
        </div>

        {/* Content Grid: Duties & Skills */}
        <div className="grid-2" style={{ marginBottom: '3.5rem' }}>
          {/* Duties */}
          <div className="glass-panel responsive-panel-p" style={{ borderRadius: '20px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
              <Briefcase size={22} color="#ffb800" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                {isAr ? 'المهام والمسؤوليات الأساسية' : 'Key Responsibilities & Duties'}
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(committee.duties || []).map((duty, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', color: '#c5c5d6', fontSize: '0.98rem', lineHeight: 1.6 }}>
                  <CheckCircle2 size={18} color="#ffb800" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>{duty}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Required & Gained */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Required */}
            <div className="glass-panel responsive-card-p" style={{ borderRadius: '20px', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                <UserCheck size={20} color="#ffd54f" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {isAr ? 'المهارات المطلوبة في المتقدم' : 'Required Candidate Skills'}
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {(committee.skillsRequired || []).map((skill, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b5b5c6', fontSize: '0.92rem' }}>
                    <span style={{ color: '#ffb800' }}>•</span>
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gained */}
            <div className="glass-panel responsive-card-p" style={{ borderRadius: '20px', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                <Award size={20} color="#ffb800" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {isAr ? 'ماذا ستكتسب وتتعلم معنا؟' : 'What Will You Gain & Learn?'}
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {(committee.skillsGained || []).map((skill, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 600 }}>
                    <span style={{ color: '#ffb800' }}>✓</span>
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Head of Committee Card & Actions */}
        <div
          className="glass-panel responsive-panel-p"
          style={{
            borderRadius: '20px',
            padding: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            background: 'rgba(255, 184, 0, 0.05)',
            border: '1px solid rgba(255, 184, 0, 0.25)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.85rem', color: '#a0a0b2' }}>
              {isAr ? 'رئيس اللجنة الحالي:' : 'Current Committee Head:'}
            </span>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0.2rem 0' }}>
              {committee.headName || (isAr ? 'فريق القيادة' : 'Leadership Team')}
            </h4>
            <span style={{ color: '#ffb800', fontSize: '0.9rem', fontWeight: 600 }}>
              {committee.headRole}
            </span>
          </div>

          <div className="comm-head-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/committees" className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
              <span>{isAr ? 'استكشف اللجان الأخرى' : 'Explore Other Committees'}</span>
              <ArrowIcon size={16} />
            </Link>
            <Link to={`/join?committee=${encodeURIComponent(committee.arabicName)}`} className="btn-primary" style={{ padding: '0.75rem 1.8rem' }}>
              <span>{isAr ? 'سجّل في هذه اللجنة' : 'Join this Committee'}</span>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .comm-hero-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .comm-head-actions {
            width: 100% !important;
          }
          .comm-head-actions > * {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
}
