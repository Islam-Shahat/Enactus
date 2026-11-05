// src/pages/dashboard/NotificationsPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Filter,
  Inbox,
  ExternalLink,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { getNotificationMeta, NOTIFICATION_TYPES } from '../../lib/notificationHelpers';
import { formatDateTime, formatRelativeTime } from '../../lib/formatters';
import Skeleton from '../../components/dashboard/Skeleton';
import EmptyState from '../../components/dashboard/EmptyState';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filterTab, setFilterTab] = useState('all'); // all | unread | read
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Query notifications with server-side pagination & filters
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard', 'notifications_page', user?.id, filterTab, typeFilter, page],
    queryFn: async () => {
      if (!user?.id) return { list: [], total: 0 };

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      if (filterTab === 'unread') {
        query = query.is('read_at', null);
      } else if (filterTab === 'read') {
        query = query.not('read_at', 'is', null);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data: rows, error, count } = await query;
      if (error) throw error;

      return {
        list: rows || [],
        total: count || 0,
      };
    },
    enabled: Boolean(user?.id),
    keepPreviousData: true,
  });

  const notifications = data?.list || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user?.id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications_page'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications_unread_count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications_page'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications_unread_count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications'] });
    },
  });

  const handleNotificationClick = (notif) => {
    if (!notif.read_at) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(184, 120, 0, 0.12)',
                color: isDark ? '#ffd54f' : '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} />
            </div>
            <h1
              className="gold-gradient-text"
              style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}
            >
              {isAr ? 'مركز الإشعارات والتنبيهات' : 'Notifications Center'}
            </h1>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: isDark ? '#a3a3b2' : '#6b7280', fontSize: '0.88rem' }}>
            {isAr
              ? 'متابعة أحدث التنبيهات والمهام المسندة وحركات النقاط والإعلانات التشغيلية.'
              : 'Track operational alerts, assigned tasks, point ledger events, and announcements.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || totalCount === 0}
          className="btn-secondary"
          style={{
            padding: '0.65rem 1.15rem',
            borderRadius: '12px',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          {markAllReadMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCheck size={16} />
          )}
          <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark All Read'}</span>
        </button>
      </div>

      {/* Filter Tabs & Type Selector */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {[
            { id: 'all', label: isAr ? 'كافة الإشعارات' : 'All' },
            { id: 'unread', label: isAr ? 'غير المقروءة' : 'Unread' },
            { id: 'read', label: isAr ? 'المقروءة' : 'Read' },
          ].map((tab) => {
            const active = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterTab(tab.id);
                  setPage(1);
                }}
                style={{
                  background: active
                    ? isDark
                      ? 'linear-gradient(135deg, rgba(255, 184, 0, 0.25), rgba(212, 136, 0, 0.15))'
                      : 'rgba(184, 120, 0, 0.15)'
                    : 'transparent',
                  color: active ? (isDark ? '#ffd54f' : '#b45309') : isDark ? '#a3a3b2' : '#6b7280',
                  border: active
                    ? isDark
                      ? '1px solid rgba(255, 184, 0, 0.4)'
                      : '1px solid #d97706'
                    : '1px solid transparent',
                  padding: '0.45rem 1rem',
                  borderRadius: '10px',
                  fontWeight: active ? 800 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: '#a3a3b2' }} />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '10px',
              border: isDark ? '1px solid rgba(255, 184, 0, 0.25)' : '1px solid rgba(184, 120, 0, 0.35)',
              background: isDark ? '#141620' : '#ffffff',
              color: isDark ? '#ffffff' : '#0f111a',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">{isAr ? '-- تصفية بالنوع --' : '-- Filter by Type --'}</option>
            {Object.entries(NOTIFICATION_TYPES).map(([typeKey, meta]) => (
              <option key={typeKey} value={typeKey}>
                {meta.label[lang] || meta.label.ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Skeleton height="70px" borderRadius="14px" />
          <Skeleton height="70px" borderRadius="14px" />
          <Skeleton height="70px" borderRadius="14px" />
          <Skeleton height="70px" borderRadius="14px" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={isAr ? 'لا توجد إشعارات تطابق التصفية' : 'No notifications found'}
          description={
            isAr
              ? 'لم يتم العثور على أي تنبيهات في هذا القسم حالياً.'
              : 'No operational alerts recorded in this filter view.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {notifications.map((notif) => {
            const isUnread = !notif.read_at;
            const meta = getNotificationMeta(notif.type);

            return (
              <div
                key={notif.id}
                className="glass-panel"
                onClick={() => handleNotificationClick(notif)}
                style={{
                  padding: '1.1rem 1.25rem',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  background: isUnread
                    ? isDark
                      ? 'linear-gradient(135deg, rgba(255, 184, 0, 0.08), rgba(22, 24, 34, 0.95))'
                      : 'rgba(255, 184, 0, 0.1)'
                    : isDark
                    ? 'rgba(18, 19, 26, 0.78)'
                    : '#ffffff',
                  borderInlineStart: isUnread
                    ? '4px solid #ffb800'
                    : isDark
                    ? '4px solid rgba(255, 255, 255, 0.1)'
                    : '4px solid #e5e7eb',
                  cursor: notif.link ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: meta.bgColor,
                      color: meta.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Sparkles size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontWeight: isUnread ? 800 : 700,
                          fontSize: '0.98rem',
                          color: isDark ? '#ffffff' : '#111827',
                        }}
                      >
                        {notif.title}
                      </span>
                      {meta.label && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: meta.bgColor,
                            color: meta.color,
                          }}
                        >
                          {meta.label[lang] || meta.label.ar}
                        </span>
                      )}
                      {isUnread && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: '#ef4444',
                            color: '#ffffff',
                          }}
                        >
                          {isAr ? 'جديد' : 'NEW'}
                        </span>
                      )}
                    </div>

                    {notif.body && (
                      <p
                        style={{
                          margin: '0.35rem 0 0 0',
                          fontSize: '0.88rem',
                          color: isDark ? '#d1d5db' : '#4b5563',
                          lineHeight: 1.45,
                        }}
                      >
                        {notif.body}
                      </p>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        marginTop: '0.5rem',
                        fontSize: '0.75rem',
                        color: isDark ? '#888899' : '#9ca3af',
                      }}
                    >
                      <Clock size={12} />
                      <span>{formatDateTime(notif.created_at, lang)}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(notif.created_at, lang)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  {isUnread && (
                    <button
                      type="button"
                      title={isAr ? 'تحديد كمقروء' : 'Mark as read'}
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(notif.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ffb800',
                        cursor: 'pointer',
                        padding: '0.35rem',
                        borderRadius: '6px',
                      }}
                    >
                      <Check size={16} />
                    </button>
                  )}
                  {notif.link && (
                    <ExternalLink size={16} className="rtl-flip" style={{ color: '#a3a3b2' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '1rem',
          }}
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-secondary"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {isAr ? 'السابق' : 'Previous'}
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffd54f', margin: '0 0.5rem' }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {isAr ? 'التالي' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}

