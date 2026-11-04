import React from 'react';
import { useParams, Link, Navigate, useLocation } from 'react-router-dom';
import { eventsData } from '../data/enactusData';
import { useEvent } from '../hooks/usePublicContent';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, MapPin, Clock, Handshake, CheckCircle2, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import EventRegistrationSection from '../components/events/EventRegistrationSection';
import EventFeedbackSection from '../components/events/EventFeedbackSection';

export default function EventDetailsPage() {
  const { slug } = useParams();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const fallbackEvent = eventsData.find((e) => e.slug === slug);
  const { data: event = fallbackEvent, isLoading } = useEvent(slug, eventsData);

  if (!event && !isLoading) {
    return <Navigate to="/events" replace />;
  }

  if (!event && isLoading) {
    return (
      <div className="page-container-padding" style={{ paddingTop: '140px', minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255, 184, 0, 0.2)', borderTopColor: '#ffb800', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={event.title}
        description={event.brief || event.description}
        image={event.image}
      />
      <div className="container">
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontSize: '0.9rem', flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: '#a0a0b2', textDecoration: 'none' }}>
            {isAr ? 'الرئيسية' : 'Home'}
          </Link>
          <span style={{ color: '#666' }}>/</span>
          <Link to="/events" style={{ color: '#a0a0b2', textDecoration: 'none' }}>
            {isAr ? 'الفعاليات' : 'Events'}
          </Link>
          <span style={{ color: '#666' }}>/</span>
          <span style={{ color: '#ffd54f', fontWeight: 700 }}>{event.title}</span>
        </div>

        {/* Event Hero Card */}
        <div
          className="glass-panel gold-border-glow card-shine event-hero-grid responsive-panel-p"
          style={{
            borderRadius: '24px',
            overflow: 'hidden',
            marginBottom: '3.5rem',
            background: 'linear-gradient(135deg, rgba(22, 24, 34, 0.95), rgba(10, 11, 16, 0.98))',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '2.5rem',
            alignItems: 'center',
            padding: '2.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span className="badge-gold font-cinzel">{event.category}</span>
              <span
                style={{
                  background: event.status === 'upcoming' ? 'rgba(255, 184, 0, 0.95)' : 'rgba(20, 20, 28, 0.85)',
                  color: event.status === 'upcoming' ? '#08080a' : '#ffd54f',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '9999px',
                }}
              >
                {event.status === 'upcoming' ? (isAr ? 'فعالية قادمة' : 'Upcoming Event') : (isAr ? 'فعالية مكتملة' : 'Completed Event')}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', marginBottom: '0.5rem', lineHeight: 1.3 }}>
              {event.title}
            </h1>
            {event.englishTitle && (
              <div style={{ fontSize: '1.1rem', color: '#ffb800', fontWeight: 700, marginBottom: '1.5rem' }}>
                {event.englishTitle}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.4)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,184,0,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e0e0ec' }}>
                <Calendar size={18} color="#ffb800" />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>{isAr ? 'التاريخ' : 'Date'}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{event.date}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e0e0ec' }}>
                <Clock size={18} color="#ffb800" />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>{isAr ? 'التوقيت' : 'Time'}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{event.time}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e0e0ec' }}>
                <MapPin size={18} color="#ffb800" />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>{isAr ? 'المكان' : 'Location'}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{event.location}</div>
                </div>
              </div>
            </div>

            <p style={{ color: '#d0d0df', fontSize: '1.05rem', lineHeight: 1.8, margin: 0 }}>
              {event.description}
            </p>
          </div>

          <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 15px 40px rgba(0,0,0,0.8)', maxHeight: '380px' }}>
            <img src={event.image} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* Schedule & Agenda */}
        <div className="grid-2" style={{ marginBottom: '4rem' }}>
          {/* Agenda */}
          <div className="glass-panel responsive-panel-p" style={{ borderRadius: '20px', padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={22} color="#ffb800" />
              <span>{isAr ? 'جدول أعمال الفعالية (Agenda)' : 'Event Schedule & Agenda'}</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {event.schedule.map((item, idx) => (
                <div
                  key={idx}
                  className="agenda-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 184, 0, 0.05)',
                    border: '1px solid rgba(255, 184, 0, 0.15)',
                    alignItems: 'center',
                  }}
                >
                  <span className="font-cinzel" style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffd54f' }}>
                    {item.time}
                  </span>
                  <span style={{ fontSize: '0.95rem', color: '#e0e0ec', fontWeight: 600 }}>
                    {item.activity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Partners Involved & Quick Join */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ borderRadius: '20px', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Handshake size={20} color="#ffb800" />
                <span>{isAr ? 'الرعاة والشركاء المشاركون' : 'Partners & Sponsors'}</span>
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {event.partnersInvolved.map((p, idx) => (
                  <span key={idx} className="badge-gold" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                    ✓ {p}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="glass-panel gold-border-glow"
              style={{
                borderRadius: '20px',
                padding: '2rem',
                background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.1), rgba(12, 13, 20, 0.95))',
                textAlign: 'center',
              }}
            >
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                {isAr ? 'هل تريد حضور وتغطية الفعاليات القادمة؟' : 'Interested in Future Events?'}
              </h3>
              <p style={{ color: '#b5b5c6', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                {isAr
                  ? 'انضم إلى كتيبة إيناكوس قنا لتشارك في تنظيم هذه الفعاليات أو احصل على مقعدك المميز.'
                  : 'Join Enactus Qena to participate in organizing these events or secure your priority reservation.'}
              </p>
              <div className="event-detail-actions" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/join" className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}>
                  <Sparkles size={16} />
                  <span>{isAr ? 'انضم كعضو في التنظيم (OC)' : 'Join Organizing Committee'}</span>
                </Link>
                <Link to="/events" className="btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
                  <span>{isAr ? 'كل الفعاليات' : 'All Events'}</span>
                  <ArrowIcon size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Public Registration Section */}
        {event.status !== 'cancelled' && event.status !== 'draft' && (
          <EventRegistrationSection event={event} />
        )}

        {/* Post-event Feedback Section */}
        {event.status === 'completed' && (
          <EventFeedbackSection event={event} />
        )}
      </div>

      <style>{`
        @media (max-width: 992px) {
          .event-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
        }
        @media (max-width: 500px) {
          .event-detail-actions > * {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
}
