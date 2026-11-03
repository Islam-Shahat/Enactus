import React from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import AboutHeritage from '../components/AboutHeritage';
import CommitteesSection from '../components/CommitteesSection';
import ProjectsImpact from '../components/ProjectsImpact';
import Partnerships from '../components/Partnerships';
import VisualGallery from '../components/VisualGallery';
import SEO from '../components/SEO';
import { Sparkles, Calendar, ArrowLeft, ArrowRight, Award } from 'lucide-react';
import { eventsData, newsArticles } from '../data/enactusData';
import { useEvents, useNews } from '../hooks/usePublicContent';
import { useLanguage } from '../context/LanguageContext';
import { localizeEventsMock, localizeNewsMock } from '../services/mockLocalization';

export default function HomePage({ onOpenJoinModal }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const fallbackEvents = localizeEventsMock(eventsData, lang);
  const fallbackNews = localizeNewsMock(newsArticles, lang);
  const { data: events = fallbackEvents } = useEvents(fallbackEvents);
  const { data: news = fallbackNews } = useNews(fallbackNews);
  const upcomingEvents = events.slice(0, 2);
  const latestNews = news.slice(0, 2);

  return (
    <div>
      <SEO
        title={isAr ? "الرئيسية" : "Home"}
        description={
          isAr
            ? "الموقع الرسمي لكتيبة إيناكوس قنا - جامعة جنوب الوادي. مشاريع ريادة أعمال مجتمعية، لجان فرعونية، وأثر حقيقي في صعيد مصر."
            : "Official website of Enactus Qena - South Valley University. Social entrepreneurship ventures, Pharaonic committees, and sustainable impact in Upper Egypt."
        }
      />
      {/* Cinematic Hero */}
      <Hero onOpenJoinModal={onOpenJoinModal} />

      {/* Story & Heritage */}
      <AboutHeritage onOpenJoinModal={onOpenJoinModal} />

      {/* Pharaonic Committees Showcase */}
      <CommitteesSection onOpenJoinModal={onOpenJoinModal} />

      {/* Events Quick Preview Section on Homepage */}
      <section style={{ padding: '80px 0', position: 'relative' }}>
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge-gold font-cinzel" style={{ marginBottom: '0.5rem' }}>
                EVENTS & GATHERINGS
              </span>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', fontWeight: 900, color: '#fff', margin: 0 }}>
                {isAr ? (
                  <>
                    أحدث فعاليات <span className="gold-gradient-text">إيناكوس قنا</span>
                  </>
                ) : (
                  <>
                    Latest <span className="gold-gradient-text">Enactus Qena</span> Events
                  </>
                )}
              </h2>
            </div>

            <Link to="/events" className="btn-secondary" style={{ fontSize: '0.9rem', padding: '0.65rem 1.4rem' }}>
              <span>{isAr ? 'استعرض كل الفعاليات' : 'View All Events'}</span>
              <ArrowIcon size={16} />
            </Link>
          </div>

          <div className="grid-2">
            {upcomingEvents.map((evt) => (
              <div
                key={evt.slug}
                className="glass-panel gold-glow-hover card-shine"
                style={{
                  borderRadius: '20px',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: isAr ? 'right' : 'left',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span className="badge-gold">{evt.category}</span>
                    <span style={{ fontSize: '0.82rem', color: '#ffd54f', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} />
                      {evt.date}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                    {evt.title}
                  </h3>
                  <p style={{ color: '#b5b5c6', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    {evt.brief}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#a0a0b2' }}>{evt.location}</span>
                  <Link
                    to={`/events/${evt.slug}`}
                    style={{
                      color: '#ffb800',
                      textDecoration: 'none',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <span>{isAr ? 'التفاصيل والجدول' : 'Details & Schedule'}</span>
                    <ArrowIcon size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flagship Projects & Impact */}
      <ProjectsImpact onOpenJoinModal={onOpenJoinModal} />

      {/* Strategic Partnerships & Sponsors */}
      <Partnerships />

      {/* Latest News & Announcements preview */}
      <section style={{ padding: '80px 0', position: 'relative' }}>
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge-gold font-cinzel" style={{ marginBottom: '0.5rem' }}>
                LATEST UPDATES
              </span>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', fontWeight: 900, color: '#fff', margin: 0 }}>
                {isAr ? (
                  <>
                    أخبار الكتيبة <span className="gold-gradient-text">والمستجدات</span>
                  </>
                ) : (
                  <>
                    Battalion <span className="gold-gradient-text">News & Press</span>
                  </>
                )}
              </h2>
            </div>

            <Link to="/news" className="btn-secondary" style={{ fontSize: '0.9rem', padding: '0.65rem 1.4rem' }}>
              <span>{isAr ? 'جميع الأخبار والبيانات' : 'All News & Updates'}</span>
              <ArrowIcon size={16} />
            </Link>
          </div>

          <div className="grid-2">
            {latestNews.map((news) => (
              <div
                key={news.slug}
                className="glass-panel gold-glow-hover card-shine news-card-row"
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.3fr',
                  textAlign: isAr ? 'right' : 'left',
                }}
              >
                <div style={{ height: '100%', minHeight: '180px', overflow: 'hidden' }}>
                  <img
                    src={news.image}
                    alt={news.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span className="badge-gold" style={{ fontSize: '0.72rem', marginBottom: '0.5rem' }}>
                      {news.category}
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                      {news.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                      {news.excerpt}
                    </p>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="news-date-tag" style={{ fontSize: '0.75rem' }}>{news.date}</span>
                    <Link to="/news" style={{ color: '#ffb800', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>{isAr ? 'اقرأ المزيد' : 'Read More'}</span>
                      <ArrowIcon size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Identity Gallery */}
      <VisualGallery />

      {/* Big Golden Call To Action */}
      <section style={{ padding: '90px 0 120px 0', position: 'relative' }}>
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div
            className="glass-panel gold-border-glow card-shine animate-pulse-glow responsive-panel-p"
            style={{
              borderRadius: '28px',
              padding: '4rem 2rem',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
              LEAVE YOUR MARK • 2026
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.6rem)', fontWeight: 900, color: '#fff', marginBottom: '1.25rem' }}>
              {isAr ? 'هل أنت مستعد لتكون أحد قادة المستقبل؟' : 'Ready to Become a Future Leader?'}
            </h2>
            <p style={{ fontSize: '1.15rem', color: '#c5c5d6', maxWidth: '700px', margin: '0 auto 2.5rem auto', lineHeight: 1.8 }}>
              {isAr
                ? 'انضم إلى كتيبة إيناكوس قنا بجامعة جنوب الوادي، واصنع قصة نجاح تخلد اسمك في كبرى المحافل الوطنية والدولية.'
                : 'Join the Enactus Qena battalion at South Valley University, and create an inspiring success story on premier national and international stages.'}
            </p>
            <div className="hero-cta-buttons" style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <Link to="/join" className="btn-primary" style={{ fontSize: '1.1rem', padding: '0.95rem 2.4rem' }}>
                <Sparkles size={20} />
                <span>{isAr ? 'قدّم الآن (انضم للكتيبة)' : 'Apply Now (Join Battalion)'}</span>
              </Link>
              <Link to="/sponsor" className="btn-secondary" style={{ fontSize: '1.1rem', padding: '0.95rem 2.2rem' }}>
                <Award size={20} />
                <span>{isAr ? 'كن راعياً للكتيبة' : 'Become a Sponsor'}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .news-card-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
