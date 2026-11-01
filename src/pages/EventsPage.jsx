import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsData } from '../data/enactusData';
import { Calendar, MapPin, Clock, ArrowLeft, Sparkles, Filter } from 'lucide-react';

export default function EventsPage() {
  const [filter, setFilter] = useState('all');

  const filteredEvents = eventsData.filter((evt) => {
    if (filter === 'upcoming') return evt.status === 'upcoming';
    if (filter === 'past') return evt.status === 'past';
    return true;
  });

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3.5rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            EVENTS & CONFERENCES
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            فعاليات ومؤتمرات <span className="gold-gradient-text">إيناكوس قنا</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            ملتقياتنا هي مساحتنا لتبادل الأفكار، إطلاق المشاريع، واستضافة الخبراء والشركاء في رحاب جامعة جنوب الوادي. تابع الفعاليات القادمة وشارك معنا:
          </p>
        </div>

        {/* Filter Controls */}
        <div className="events-filter-group" style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '3.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}
          >
            جميع الفعاليات ({eventsData.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={filter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}
          >
            الفعاليات القادمة (Upcoming)
          </button>
          <button
            onClick={() => setFilter('past')}
            className={filter === 'past' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}
          >
            الفعاليات السابقة (Past)
          </button>
        </div>

        {/* Events Grid */}
        <div className="grid-2" style={{ marginBottom: '4rem' }}>
          {filteredEvents.map((evt) => (
            <div
              key={evt.slug}
              className="glass-panel gold-glow-hover card-shine responsive-card-p"
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1.5px solid rgba(255, 184, 0, 0.22)',
                background: 'rgba(18, 19, 28, 0.85)',
              }}
            >
              <div>
                <div className="event-card-img" style={{ height: '240px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={evt.image}
                    alt={evt.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                    <span
                      style={{
                        background: evt.status === 'upcoming' ? 'rgba(255, 184, 0, 0.95)' : 'rgba(20, 20, 28, 0.85)',
                        color: evt.status === 'upcoming' ? '#08080a' : '#ffd54f',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '9999px',
                        border: '1px solid rgba(255, 184, 0, 0.4)',
                      }}
                    >
                      {evt.status === 'upcoming' ? 'قادمة قريباً' : 'مكتملة'}
                    </span>
                  </div>
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
                    <span className="badge-gold font-cinzel" style={{ fontSize: '0.7rem' }}>
                      {evt.category}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '1.75rem 1.5rem' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem', lineHeight: 1.4 }}>
                    {evt.title}
                  </h2>
                  <div style={{ fontSize: '0.82rem', color: '#ffb800', fontWeight: 600, marginBottom: '1.25rem' }}>
                    {evt.englishTitle}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.88rem', color: '#c5c5d6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={16} color="#ffb800" />
                      <span>{evt.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={16} color="#ffb800" />
                      <span>{evt.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={16} color="#ffb800" />
                      <span>{evt.location}</span>
                    </div>
                  </div>

                  <p style={{ color: '#a5a5b8', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                    {evt.brief}
                  </p>
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1.15rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  background: 'rgba(10, 11, 16, 0.5)',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#a0a0b2' }}>
                  الشركاء: {evt.partnersInvolved.slice(0, 2).join(' • ')}
                </div>

                <Link
                  to={`/events/${evt.slug}`}
                  className="btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
                >
                  <span>التفاصيل والجدول</span>
                  <ArrowLeft size={15} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .event-card-img {
            height: 190px !important;
          }
          .events-filter-group > button {
            flex: 1 1 auto;
          }
        }
      `}</style>
    </div>
  );
}
