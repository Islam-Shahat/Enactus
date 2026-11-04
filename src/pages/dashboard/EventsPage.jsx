// src/pages/dashboard/EventsPage.jsx
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar as CalendarIcon, MapPin, Users, Ticket, Plus, 
  Search, Filter, ExternalLink, QrCode, Edit3, Sparkles, 
  Clock, CheckCircle2, AlertCircle, ChevronRight, BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import StatCard from '../../components/dashboard/StatCard';
import StatusBadge from '../../components/dashboard/StatusBadge';
import Skeleton from '../../components/dashboard/Skeleton';
import EmptyState from '../../components/dashboard/EmptyState';
import EventEditorDrawer from '../../components/dashboard/events/EventEditorDrawer';
import EventDetailDrawer from '../../components/dashboard/events/EventDetailDrawer';
import { EVENT_STATUSES, formatEventDateTime } from '../../lib/eventHelpers';

export default function EventsPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();

  const canManage = isSuperAdmin || hasRole(['oc_admin', 'president', 'vice_president', 'coordinator', 'committee_head']);

  // Filters
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [committeeFilter, setCommitteeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Drawers
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 1. Fetch seasons
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    onSuccess: (data) => {
      if (!selectedSeasonId && data.length > 0) {
        const active = data.find((s) => s.is_active) || data[0];
        setSelectedSeasonId(active.id);
      }
    },
  });

  const activeSeason = seasons.find((s) => s.id === selectedSeasonId) || seasons.find((s) => s.is_active) || seasons[0];
  const effectiveSeasonId = selectedSeasonId || activeSeason?.id;

  // 2. Fetch committees
  const { data: committees = [] } = useQuery({
    queryKey: ['committees-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('committees').select('*').order('name_ar');
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Fetch companies (sponsors)
  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('id, name, logo_url').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // 4. Fetch events
  const {
    data: events = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-events', effectiveSeasonId],
    enabled: Boolean(effectiveSeasonId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, organizing_committee:committees(name_ar, name_en, color), registrations:event_registrations(id, status)')
        .eq('season_id', effectiveSeasonId)
        .order('starts_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Computed metrics
  const totalEvents = events.length;
  const activeOrUpcoming = events.filter((e) => ['published', 'ongoing'].includes(e.status)).length;
  const totalRegistrations = events.reduce((sum, e) => sum + (e.registrations?.length || 0), 0);
  const totalAttended = events.reduce(
    (sum, e) => sum + (e.registrations?.filter((r) => r.status === 'attended').length || 0),
    0
  );

  // Filtered events
  const filteredEvents = events.filter((ev) => {
    if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
    if (committeeFilter !== 'all' && ev.organizing_committee_id !== committeeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (ev.title_ar && ev.title_ar.toLowerCase().includes(q)) ||
                         (ev.title_en && ev.title_en.toLowerCase().includes(q)) ||
                         (ev.slug && ev.slug.toLowerCase().includes(q));
      if (!matchTitle) return false;
    }
    return true;
  });

  function handleCreateEvent() {
    setSelectedEvent(null);
    setIsEditorOpen(true);
  }

  function handleEditEvent(ev) {
    setSelectedEvent(ev);
    setIsEditorOpen(true);
  }

  function handleOpenDetails(ev) {
    setSelectedEvent(ev);
    setIsDetailOpen(true);
  }

  function handleEventSaved() {
    queryClient.invalidateQueries(['dashboard-events']);
    refetch();
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', marginBottom: '0.35rem' }}>
            الفعاليات والمؤتمرات (Events & Summits)
          </h1>
          <p style={{ color: '#a0a0b2', fontSize: '0.92rem', margin: 0 }}>
            إدارة المؤتمرات، ورش العمل، السعة والتذاكر، ولجان التنظيم ومحطات الحضور.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Season Selector */}
          <select
            value={effectiveSeasonId || ''}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              background: 'rgba(255, 184, 0, 0.08)',
              border: '1px solid rgba(255, 184, 0, 0.3)',
              color: '#ffd54f',
              fontWeight: 700,
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id} style={{ background: '#141620', color: '#fff' }}>
                الموسم: {s.name} {s.is_active ? '★ (نشط)' : ''}
              </option>
            ))}
          </select>

          {/* New Event Button */}
          {canManage && (
            <button
              type="button"
              onClick={handleCreateEvent}
              className="btn-primary"
              style={{
                padding: '0.65rem 1.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.92rem',
                fontWeight: 800,
              }}
            >
              <Plus size={18} />
              <span>فعالية جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <StatCard
          icon={CalendarIcon}
          title="إجمالي الفعاليات"
          value={totalEvents}
          subtitle={`في موسم ${activeSeason?.name || ''}`}
        />
        <StatCard
          icon={Clock}
          title="فعاليات معلنة وجارية"
          value={activeOrUpcoming}
          subtitle="مؤتمرات وورش نشطة"
        />
        <StatCard
          icon={Ticket}
          title="إجمالي حجوزات التذاكر"
          value={totalRegistrations}
          subtitle="تسجيل عام عبر المنصة"
        />
        <StatCard
          icon={CheckCircle2}
          title="الحضور الفعلي المؤكد"
          value={totalAttended}
          subtitle={totalRegistrations > 0 ? `${Math.round((totalAttended / totalRegistrations) * 100)}% نسبة الحضور` : 'بانتظار انطلاق الفعاليات'}
        />
      </div>

      {/* Filters Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بعنوان الفعالية أو الرابط..."
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.4rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <Search
              size={16}
              color="#888"
              style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 184, 0, 0.2)',
              color: '#fff',
              fontSize: '0.88rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all" style={{ background: '#141620' }}>كل الحالات</option>
            {EVENT_STATUSES.map((st) => (
              <option key={st.key} value={st.key} style={{ background: '#141620' }}>
                {isAr ? st.label_ar : st.label_en}
              </option>
            ))}
          </select>

          {/* Committee Filter */}
          <select
            value={committeeFilter}
            onChange={(e) => setCommitteeFilter(e.target.value)}
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 184, 0, 0.2)',
              color: '#fff',
              fontSize: '0.88rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all" style={{ background: '#141620' }}>كل لجان التنظيم</option>
            {committees.map((c) => (
              <option key={c.id} value={c.id} style={{ background: '#141620' }}>
                {c.name_ar || c.name_en}
              </option>
            ))}
          </select>
        </div>

        <div style={{ color: '#888', fontSize: '0.85rem' }}>
          معروض: <strong style={{ color: '#ffd54f' }}>{filteredEvents.length}</strong> فعالية
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} height="280px" borderRadius="16px" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="لا توجد فعاليات مطابقة"
          description="لم يتم العثور على أي فعاليات في هذا الموسم أو وفق خيارات الفرز المحددة."
          actionText={canManage ? 'إنشاء فعالية جديدة' : undefined}
          onAction={canManage ? handleCreateEvent : undefined}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.5rem' }}>
          {filteredEvents.map((ev) => {
            const regs = ev.registrations || [];
            const attendedCount = regs.filter((r) => r.status === 'attended').length;
            const regCount = regs.filter((r) => r.status === 'registered' || r.status === 'attended').length;
            const capacityPercent = ev.capacity ? Math.min(Math.round((regCount / ev.capacity) * 100), 100) : 0;

            return (
              <div
                key={ev.id}
                className="glass-panel"
                style={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 184, 0, 0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, border-color 0.2s',
                  background: 'linear-gradient(160deg, rgba(22, 24, 34, 0.85), rgba(12, 13, 18, 0.95))',
                }}
              >
                {/* Cover or Header Graphic */}
                <div style={{ position: 'relative', height: '150px', background: 'rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                  {ev.cover_url ? (
                    <img
                      src={ev.cover_url}
                      alt={ev.title_ar}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'radial-gradient(circle at center, rgba(255, 184, 0, 0.15), rgba(12, 13, 20, 0.9))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Sparkles size={40} color="#ffb800" style={{ opacity: 0.6 }} />
                    </div>
                  )}

                  {/* Badges on Cover */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '0.4rem' }}>
                    <StatusBadge status={ev.status} />
                  </div>

                  {ev.organizing_committee && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(4px)',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#ffd54f',
                        border: '1px solid rgba(255,184,0,0.3)',
                      }}
                    >
                      {ev.organizing_committee.name_ar}
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.4 }}>
                      {ev.title_ar}
                    </h3>
                  </div>

                  {ev.title_en && (
                    <div style={{ fontSize: '0.85rem', color: '#ffb800', fontWeight: 600, marginBottom: '0.75rem' }}>
                      {ev.title_en}
                    </div>
                  )}

                  {/* Metadata */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', color: '#a0a0b2', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CalendarIcon size={14} color="#ffd54f" />
                      <span>{formatEventDateTime(ev.starts_at)}</span>
                    </div>
                    {ev.venue_ar && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={14} color="#ffd54f" />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{ev.venue_ar}</span>
                      </div>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div style={{ marginBottom: '1.25rem', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#888', marginBottom: '0.35rem' }}>
                      <span>المسجلين: <strong style={{ color: '#fff' }}>{regCount}</strong> {ev.capacity ? `/ ${ev.capacity}` : ''}</span>
                      <span>الحضور: <strong style={{ color: '#4ade80' }}>{attendedCount}</strong></span>
                    </div>
                    {ev.capacity ? (
                      <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${capacityPercent}%`, height: '100%', background: capacityPercent >= 100 ? '#ef4444' : '#ffb800' }} />
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.72rem', color: '#666', fontStyle: 'italic' }}>سعة الحضور مفتوحة</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.85rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(ev)}
                      className="btn-primary"
                      style={{
                        flex: 1,
                        padding: '0.55rem',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <QrCode size={15} />
                      <span>الإدارة والحضور</span>
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleEditEvent(ev)}
                        className="btn-secondary"
                        style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                        title="تعديل الفعالية"
                      >
                        <Edit3 size={15} />
                      </button>
                    )}

                    <a
                      href={`/events/${ev.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}
                      title="عرض الرابط العام"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Drawer */}
      <EventEditorDrawer
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        event={selectedEvent}
        activeSeasonId={effectiveSeasonId}
        committees={committees}
        companies={companies}
        onSaved={handleEventSaved}
      />

      {/* Detail / Check-in Drawer */}
      <EventDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        event={selectedEvent}
        onEdit={(ev) => {
          setIsDetailOpen(false);
          handleEditEvent(ev);
        }}
        onRefresh={() => {
          queryClient.invalidateQueries(['dashboard-events']);
          refetch();
        }}
      />
    </div>
  );
}

