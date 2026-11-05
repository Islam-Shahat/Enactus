// src/components/dashboard/NotificationsBell.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Inbox,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { getNotificationMeta } from '../../lib/notificationHelpers';
import { formatRelativeTime } from '../../lib/formatters';

export default function NotificationsBell() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['dashboard', 'notifications_unread_count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) return 0;
      return count || 0;
    },
    enabled: Boolean(user?.id),
    refetchInterval: 30000,
  });

  // 2. Fetch latest 20 notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'notifications', 'recent', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, link, data, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(user?.id),
  });

  // 3. Realtime subscription to live notifications for this user
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications_unread_count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // 4. Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 5. Mark single as read mutation
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
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications_unread_count', user?.id] });
    },
  });

  // 6. Mark all as read mutation
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
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications_unread_count', user?.id] });
    },
  });

  const handleItemClick = (notif) => {
    if (!notif.read_at) {
      markReadMutation.mutate(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="dashboard-topbar-pill"
        title={isAr ? 'الإشعارات' : 'Notifications'}
        aria-label="Notifications"
        style={{
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
          border: isDark ? '1px solid rgba(255, 184, 0, 0.25)' : '1px solid rgba(184, 120, 0, 0.35)',
          borderRadius: '10px',
          padding: '0.45rem',
          color: unreadCount > 0 ? '#ffb800' : isDark ? '#a3a3b2' : '#4b5563',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.2s ease',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              insetInlineEnd: '-4px',
              background: '#ef4444',
              color: '#ffffff',
              borderRadius: '9999px',
              fontSize: '0.65rem',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div
          dir={dir}
          className="glass-panel gold-border-glow"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            insetInlineEnd: 0,
            width: '360px',
            maxWidth: '92vw',
            borderRadius: '18px',
            background: isDark
              ? 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))'
              : '#ffffff',
            boxShadow: isDark
              ? '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 184, 0, 0.15)'
              : '0 15px 40px rgba(0, 0, 0, 0.12), 0 0 20px rgba(184, 120, 0, 0.1)',
            border: isDark ? '1px solid rgba(255, 184, 0, 0.25)' : '1px solid rgba(184, 120, 0, 0.3)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: isDark ? '#ffd54f' : '#b45309' }}>
                {isAr ? 'الإشعارات' : 'Notifications'}
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'rgba(255, 184, 0, 0.15)',
                    color: '#ffb800',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {unreadCount} {isAr ? 'جديد' : 'new'}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isDark ? '#a3a3b2' : '#6b7280',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCheck size={14} />
                )}
                <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              padding: '0.4rem',
            }}
          >
            {isLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ffd54f' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                <span style={{ fontSize: '0.85rem' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                <Inbox size={32} style={{ color: '#a3a3b2', margin: '0 auto 0.5rem auto', opacity: 0.6 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: isDark ? '#fff' : '#111' }}>
                  {isAr ? 'لا توجد إشعارات حالياً' : 'No notifications'}
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#a3a3b2' }}>
                  {isAr ? 'ستصلك التنبيهات الجديدة هنا فور حدوثها.' : 'New alerts will appear here.'}
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.read_at;
                const meta = getNotificationMeta(notif.type);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '12px',
                      background: isUnread
                        ? isDark
                          ? 'rgba(255, 184, 0, 0.08)'
                          : 'rgba(255, 184, 0, 0.1)'
                        : 'transparent',
                      cursor: 'pointer',
                      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid #f3f4f6',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Category Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: meta.bgColor,
                        color: meta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <Sparkles size={16} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: isUnread ? 800 : 600,
                            color: isDark ? '#ffffff' : '#111827',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {notif.title}
                        </span>
                        {isUnread && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#ffb800',
                              flexShrink: 0,
                              boxShadow: '0 0 6px #ffb800',
                            }}
                          />
                        )}
                      </div>

                      {notif.body && (
                        <p
                          style={{
                            margin: '0.2rem 0 0.35rem 0',
                            fontSize: '0.78rem',
                            color: isDark ? '#a3a3b2' : '#6b7280',
                            lineHeight: 1.35,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {notif.body}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: '#9ca3af' }}>
                        <Clock size={11} />
                        <span>{formatRelativeTime(notif.created_at, lang)}</span>
                        {meta.label && (
                          <>
                            <span>·</span>
                            <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label[lang] || meta.label.ar}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer View All Link */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #f3f4f6',
              background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb',
              textAlign: 'center',
            }}
          >
            <Link
              to="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: isDark ? '#ffd54f' : '#b45309',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>{isAr ? 'عرض كافة الإشعارات' : 'View all notifications'}</span>
              <ExternalLink size={13} className="rtl-flip" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

