// src/components/dashboard/media/ContentCalendar.jsx
import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import {
  getMonthCalendarMatrix,
  getPostsForDay,
  POST_PLATFORMS,
  POST_STATUSES,
} from '../../../lib/mediaHelpers';

export default function ContentCalendar({
  posts = [],
  onSelectPost,
  onCreateOnDate,
}) {
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysMatrix = useMemo(() => {
    return getMonthCalendarMatrix(year, month);
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthLabel = currentDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const weekDayLabels = isAr
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: '16px',
        border: '1px solid rgba(255, 184, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Calendar Header Controls */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CalendarIcon size={20} color="#ffb800" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
            {monthLabel}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleToday}
            className="btn-secondary"
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isAr ? 'اليوم' : 'Today'}
          </button>

          <button
            type="button"
            onClick={dir === 'rtl' ? handleNextMonth : handlePrevMonth}
            className="btn-secondary"
            style={{ padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
            title={isAr ? 'الشهر السابق' : 'Previous Month'}
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={dir === 'rtl' ? handlePrevMonth : handleNextMonth}
            className="btn-secondary"
            style={{ padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
            title={isAr ? 'الشهر التالي' : 'Next Month'}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.2)',
          textAlign: 'center',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#ffd54f',
        }}
      >
        {weekDayLabels.map((lbl) => (
          <div key={lbl} style={{ padding: '0.75rem 0.25rem' }}>
            {lbl}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        {daysMatrix.map((dayItem, idx) => {
          const isToday = dayItem.dateString === todayStr;
          const dayPosts = getPostsForDay(posts, dayItem.dateString);

          return (
            <div
              key={`${dayItem.dateString}-${idx}`}
              style={{
                minHeight: '120px',
                borderInlineEnd: (idx + 1) % 7 === 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '0.5rem',
                background: isToday
                  ? 'rgba(255, 184, 0, 0.04)'
                  : dayItem.isCurrentMonth
                  ? 'transparent'
                  : 'rgba(0, 0, 0, 0.25)',
                opacity: dayItem.isCurrentMonth ? 1 : 0.45,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                position: 'relative',
              }}
            >
              {/* Day Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: isToday ? 900 : 700,
                    color: isToday ? '#000' : '#c5c5d6',
                    background: isToday ? '#ffb800' : 'transparent',
                    width: isToday ? '22px' : 'auto',
                    height: isToday ? '22px' : 'auto',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {dayItem.dayOfMonth}
                </span>

                {dayItem.isCurrentMonth && onCreateOnDate && (
                  <button
                    type="button"
                    onClick={() => onCreateOnDate(dayItem.dateString)}
                    title={isAr ? 'إنشاء منشور في هذا اليوم' : 'Add post on this day'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#88889a',
                      cursor: 'pointer',
                      padding: '0.15rem',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ffb800')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#88889a')}
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>

              {/* Post Pills for this day */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
                {dayPosts.map((post) => {
                  const plat = POST_PLATFORMS.find((p) => p.key === post.platform);
                  const st = POST_STATUSES.find((s) => s.key === post.status);

                  return (
                    <div
                      key={post.id}
                      onClick={() => onSelectPost(post.id)}
                      style={{
                        padding: '0.25rem 0.45rem',
                        borderRadius: '6px',
                        background: 'rgba(18, 20, 30, 0.95)',
                        border: `1px solid ${plat?.color || 'rgba(255, 184, 0, 0.4)'}50`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.72rem',
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: st?.text || '#ffb800',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {post.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

