import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { committeesData } from '../data/enactusData';
import { useCommittees } from '../hooks/usePublicContent';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';

export default function CommitteesPage() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const { data: committees = committeesData, isLoading } = useCommittees(committeesData);

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={isAr ? "لجان الفريق" : "Committees"}
        description={
          isAr
            ? "لجان كتيبة إيناكوس قنا السبع المتكاملة في جامعة جنوب الوادي: إدارة المشاريع، العلاقات العامة، الميديا، والمزيد."
            : "The seven integrated committees of Enactus Qena at South Valley University: PM, PR, MultiMedia, HR, and more."
        }
      />
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            ONE TEAM • ONE GOAL
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            {isAr ? (
              <>
                لجان كتيبة <span className="gold-gradient-text">إيناكوس قنا</span>
              </>
            ) : (
              <>
                Enactus Qena <span className="gold-gradient-text">Committees</span>
              </>
            )}
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            {isAr
              ? 'سبع لجان متكاملة تمثل صلب العمل المؤسسي لإيناكوس جامعة جنوب الوادي. لكل لجنة دور محوري في رحلة التغيير من قنا إلى العالمية. اختر اللجنة التي تلبي طموحك واكتشف تفاصيلها:'
              : 'Seven integrated committees form the organizational backbone of Enactus South Valley University. Explore each committee and discover your true potential:'}
          </p>
        </div>

        {/* Loading skeleton when empty & loading */}
        {isLoading && committees.length === 0 && (
          <div
            className="responsive-auto-grid-360"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
              gap: '1.5rem',
              marginBottom: '4.5rem',
            }}
          >
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

        {/* Committees Grid */}
        <div
          className="responsive-auto-grid-360"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: '1.5rem',
            marginBottom: '4.5rem',
          }}
        >
          {committees.map((comm) => {
            const primaryTitle = isAr ? comm.arabicName : comm.name;
            const secondaryTitle = isAr ? comm.name : comm.arabicName;

            return (
              <div
                key={comm.slug}
                className="glass-panel gold-glow-hover card-shine responsive-card-p"
                style={{
                  borderRadius: '24px',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255, 184, 0, 0.25)',
                  position: 'relative',
                  textAlign: isAr ? 'right' : 'left',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span className="badge-gold font-cinzel" style={{ fontSize: '0.78rem' }}>
                      {comm.code}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#ffb800', fontStyle: 'italic' }}>
                      {comm.mascotDesc}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', marginBottom: '0.35rem' }}>
                    {primaryTitle}
                  </h3>

                  <div style={{ fontSize: '0.85rem', color: '#ffd54f', fontWeight: 700, marginBottom: '1.1rem' }}>
                    {secondaryTitle}
                  </div>

                  <p style={{ color: '#b5b5c6', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                    {comm.brief}
                  </p>
                </div>

                <div>
                  {comm.headName && (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 184, 0, 0.4)',
                          background: '#0a0a0e',
                          flexShrink: 0,
                        }}
                      >
                        <img src={comm.headAvatar || '/assets/E6.jpg'} alt={comm.headName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{comm.headName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#ffb800' }}>{comm.headRole}</div>
                      </div>
                    </div>
                  )}

                  <Link
                    to={`/committees/${comm.slug}`}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      padding: '0.75rem',
                      display: 'flex',
                    }}
                  >
                    <span>{isAr ? 'التفاصيل والشروط والمهام' : 'Details, Skills & Duties'}</span>
                    <ArrowIcon size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
