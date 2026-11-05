import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsData } from '../data/enactusData';
import { useEvents } from '../hooks/usePublicContent';
import SEO from '../components/SEO';
import { Calendar, MapPin, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { localizeEventsMock } from '../services/mockLocalization';

export default function EventsPage() {
  const [filter, setFilter] = useState('all');
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const fallback = localizeEventsMock(eventsData, lang);
  const { data: events = fallback, isLoading } = useEvents(fallback);

  const isUpcoming = (e) =>
    e.status === 'upcoming' ||
    e.status === 'published' ||
    e.status === 'ongoing' ||
    (e.status !== 'past' && e.status !== 'completed' && e.status !== 'cancelled');

  const filteredEvents = events.filter((evt) => {
    if (filter === 'upcoming') return isUpcoming(evt);
    if (filter === 'past') return !isUpcoming(evt);
    return true;
  });

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={isAr ? "الفعاليات والمؤتمرات" : "Events & Conferences"}
        description={
          isAr
            ? "ملتقيات وفعاليات إيناكوس قنا في رحاب جامعة جنوب الوادي. تابع الفعاليات القادمة وشارك معنا."
            : "Enactus Qena summits and gatherings at South Valley University. Discover upcoming events and join us."
        }
      />
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3.5rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            EVENTS & CONFERENCES
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            {isAr ? (
              <>
                فعاليات ومؤتمرات <span className="gold-gradient-text">إيناكوس قنا</span>
              </>
            ) : (
              <>
                Enactus Qena <span className="gold-gradient-text">Events & Summits</span>
              </>
            )}
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            {isAr
              ? 'ملتقياتنا هي مساحتنا لتبادل الأفكار، إطلاق المشاريع، واستضافة الخبراء والشركاء في رحاب جامعة جنوب الوادي. تابع الفعاليات القادمة وشارك معنا:'
              : 'Our gatherings provide the space to pitch sustainable solutions, network with industry mentors, and launch ventures at South Valley University:'}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="events-filter-group" style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '3.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}
          >
            {isAr ? `جميع الفعاليات (${events.length})` : `All Events (${events.length})`}
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={filter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}
          >
            {isAr ? 'الفعاليات القادمة' : 'Upcoming Events'}
          </button>
          <button
            onClick={() => setFilter('past')}
            className={filter === 'past' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}
          >
            {isAr ? 'الفعاليات السابقة' : 'Past Events'}
          </button>
        </div>

        {/* Loading skeleton when empty & loading */}
        {isLoading && events.length === 0 && (
          <div className="grid-2" style={{ marginBottom: '4.5rem' }}>
            {[1, 2].map((n) => (
              <div
                key={n}
                className="glass-panel"
                style={{
                  height: '420px',
                  borderRadius: '24px',
                  background: 'rgba(255, 184, 0, 0.04)',
                  border: '1px dashed rgba(255, 184, 0, 0.25)',
                }}
              />
            ))}
          </div>
        )}

        {/* Events Grid */}
        <div className="grid-2" style={{ marginBottom: '4.5rem' }}>
          {filteredEvents.map((evt) => (
            <div
              key={evt.slug}
              className="glass-panel gold-glow-hover card-shine"
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                textAlign: isAr ? 'right' : 'left',
              }}
            >
              <div>
                <div style={{ height: '240px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={evt.image}
                    alt={evt.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: isAr ? '16px' : 'auto',
                      left: isAr ? 'auto' : '16px',
                      display: 'flex',
                      gap: '0.5rem',
                    }}
                  >
                    <span className="badge-gold">{evt.category}</span>
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: evt.status === 'upcoming' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(100, 100, 110, 0.85)',
                        color: '#fff',
                      }}
                    >
                      {evt.status === 'upcoming' ? (isAr ? 'قريباً' : 'Upcoming') : (isAr ? 'منتهية' : 'Completed')}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', color: '#ffd54f', fontSize: '0.85rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={15} />
                      {evt.date}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={15} />
                      {evt.time}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.85rem', lineHeight: 1.3 }}>
                    {evt.title}
                  </h3>

                  <p style={{ color: '#b5b5c6', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                    {evt.brief}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a0a0b2', fontSize: '0.85rem' }}>
                    <MapPin size={16} color="#ffb800" style={{ flexShrink: 0 }} />
                    <span>{evt.location}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem 2rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#ffb800', fontWeight: 600 }}>
                  {evt.registrationOpen ? (isAr ? 'التسجيل متاح' : 'Registration Open') : (isAr ? 'اكتمل العدد' : 'Registration Closed')}
                </span>

                <Link
                  to={`/events/${evt.slug}`}
                  style={{
                    color: '#ffd54f',
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>{isAr ? 'التفاصيل الكاملة والجدول' : 'Full Details & Schedule'}</span>
                  <ArrowIcon size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
