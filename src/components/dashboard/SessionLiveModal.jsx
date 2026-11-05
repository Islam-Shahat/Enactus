import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import {
  QrCode,
  ToggleLeft,
  ToggleRight,
  Users,
  Clock,
  Sparkles,
  Lock,
  RefreshCw,
  X,
  UserCheck,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export default function SessionLiveModal({
  isOpen,
  onClose,
  session,
  onSessionUpdated,
}) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  // Active view: 'qr' | 'live_list' | 'manual_sheet'
  const [activeTab, setActiveTab] = useState('qr');

  // Rotating Token state
  const [qrToken, setQrToken] = useState(null);
  const [manualCode, setManualCode] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(20);

  // Close session confirm dialog
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  const sessionId = session?.id;
  const isCheckInOpen = Boolean(session?.check_in_open);

  // Fetch token from Edge Function
  const fetchQrToken = useCallback(async () => {
    if (!sessionId || !isCheckInOpen) return;
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qr-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate token');
      }

      setQrToken(data.token);
      setManualCode(data.code);
      setSecondsRemaining(20);
    } catch (err) {
      console.error('[fetchQrToken error]:', err);
    }
  }, [sessionId, isCheckInOpen]);

  // Rotate token every 20 seconds while modal is open and check_in_open is true
  useEffect(() => {
    if (!isOpen || !sessionId || !isCheckInOpen) return;

    fetchQrToken();
    const interval = setInterval(fetchQrToken, 20000);

    const countdown = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 20));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, [isOpen, sessionId, isCheckInOpen, fetchQrToken]);

  // Toggle check_in_open mutation
  const toggleCheckinMutation = useMutation({
    mutationFn: async (nextVal) => {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ check_in_open: nextVal, updated_at: new Date().toISOString() })
        .eq('id', session.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (updated) => {
      toast.show(
        updated.check_in_open
          ? isAr
            ? 'تم فتح التسجيل للجلسة'
            : 'Check-in opened'
          : isAr
          ? 'تم إغلاق التسجيل للجلسة'
          : 'Check-in closed',
        'success'
      );
      if (onSessionUpdated) onSessionUpdated(updated);
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_sessions'] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل تعديل حالة التسجيل' : 'Failed to toggle check-in'), 'error');
    },
  });

  // Query Live Attendees with 10s polling fallback
  const { data: attendees = [], isLoading: loadingAttendees } = useQuery({
    queryKey: ['dashboard', 'session_attendees', session?.id],
    queryFn: async () => {
      if (!session?.id) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          user_id,
          status,
          method,
          checked_in_at,
          notes,
          profiles!inner(
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          )
        `)
        .eq('session_id', session.id)
        .order('checked_in_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(isOpen && session?.id),
    refetchInterval: 10000, // 10s polling fallback
  });

  // Realtime subscription on attendance table
  useEffect(() => {
    if (!isOpen || !session?.id) return;

    const channel = supabase
      .channel(`realtime-attendance-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'session_attendees', session.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, session?.id, queryClient]);

  // Query eligible members for manual attendance sheet
  const { data: eligibleMembers = [], isLoading: loadingEligible } = useQuery({
    queryKey: ['dashboard', 'session_eligible_members', session?.committee_id, session?.season_id],
    queryFn: async () => {
      if (!session?.season_id) return [];
      let q = supabase
        .from('memberships')
        .select(`
          user_id,
          position,
          status,
          profiles!inner(
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          )
        `)
        .eq('season_id', session.season_id)
        .eq('status', 'active');

      if (session.committee_id) {
        q = q.eq('committee_id', session.committee_id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(isOpen && activeTab === 'manual_sheet'),
  });

  // Manual Attendance Upsert Mutation
  const updateManualAttendanceMutation = useMutation({
    mutationFn: async ({ userId, status, notes }) => {
      const { error } = await supabase.from('attendance').upsert(
        {
          session_id: session.id,
          user_id: userId,
          status,
          method: 'manual',
          recorded_by: user.id,
          checked_in_at: new Date().toISOString(),
          notes: notes || null,
        },
        { onConflict: 'session_id,user_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم حفظ الحضور يدوياً' : 'Attendance updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'session_attendees', session.id] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل التحديث' : 'Failed to update'), 'error');
    },
  });

  // Close Session Mutation (calls Edge Function close-session)
  const closeSessionMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession) throw new Error('Unauthorized');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/close-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({ session_id: session.id }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to close session');
      }
      return data;
    },
    onSuccess: (data) => {
      toast.show(
        isAr
          ? `تم إغلاق الجلسة بنجاح (تسجيل ${data.newlyAbsent} غياب، ${data.newlyExcused} عذر)`
          : `Session closed (${data.newlyAbsent} absent, ${data.newlyExcused} excused)`,
        'success'
      );
      setIsCloseConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'session_attendees', session.id] });
      if (onSessionUpdated) onSessionUpdated({ ...session, check_in_open: false });
    },
    onError: (err) => {
      toast.show(err.message, 'error');
    },
  });

  if (!isOpen || !session) return null;

  // Stats calculation
  const presentCount = attendees.filter((a) => a.status === 'present').length;
  const lateCount = attendees.filter((a) => a.status === 'late').length;
  const excusedCount = attendees.filter((a) => a.status === 'excused').length;
  const absentCount = attendees.filter((a) => a.status === 'absent').length;

  const titleColor = isDark ? '#ffd54f' : '#b45309';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel gold-border-glow"
        dir={dir}
        style={{
          borderRadius: '20px',
          maxWidth: '850px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDark ? '0 30px 60px rgba(0,0,0,0.85)' : '0 25px 60px rgba(184, 120, 0, 0.15)',
          background: isDark
            ? 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))'
            : 'rgba(255, 255, 255, 0.98)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: isDark ? '1px solid rgba(255, 184, 0, 0.15)' : '1px solid rgba(217, 119, 6, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <StatusBadge status={session.type} />
              <h2 className="modal-header-title" style={{ margin: 0, color: titleColor, fontSize: '1.25rem', fontWeight: 800 }}>
                {session.title}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', color: isDark ? '#aaa' : '#6b7280', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={13} />
                <span>{new Date(session.starts_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
              </span>
              {session.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={13} />
                  <span>{session.location}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Open / Close check-in toggle */}
            <button
              type="button"
              onClick={() => toggleCheckinMutation.mutate(!session.check_in_open)}
              disabled={toggleCheckinMutation.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.9rem',
                borderRadius: '20px',
                border: `1px solid ${
                  session.check_in_open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
                }`,
                background: session.check_in_open ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: session.check_in_open ? '#4ade80' : '#f87171',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {session.check_in_open ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              <span>
                {session.check_in_open
                  ? isAr
                    ? 'التسجيل مفتوح'
                    : 'Check-in Open'
                  : isAr
                  ? 'التسجيل مغلق'
                  : 'Check-in Closed'}
              </span>
            </button>

            {/* Close Session Final Button */}
            <button
              type="button"
              onClick={() => setIsCloseConfirmOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Lock size={14} />
              <span>{isAr ? 'إغلاق واعتماد الغياب' : 'Close Session'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            padding: '0 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            style={{
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'qr' ? '2px solid #ffb800' : '2px solid transparent',
              color: activeTab === 'qr' ? '#ffd54f' : '#888',
              fontWeight: activeTab === 'qr' ? 700 : 500,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
          >
            <QrCode size={16} />
            <span>{isAr ? 'الكود الدوار (QR)' : 'Rotating QR'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live_list')}
            style={{
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'live_list' ? '2px solid #ffb800' : '2px solid transparent',
              color: activeTab === 'live_list' ? '#ffd54f' : '#888',
              fontWeight: activeTab === 'live_list' ? 700 : 500,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
          >
            <Users size={16} />
            <span>{isAr ? 'سجل الحضور المباشر' : 'Live Attendees'}</span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px',
                background: 'rgba(255,184,0,0.15)',
                color: '#ffd54f',
              }}
            >
              {attendees.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual_sheet')}
            style={{
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'manual_sheet' ? '2px solid #ffb800' : '2px solid transparent',
              color: activeTab === 'manual_sheet' ? '#ffd54f' : '#888',
              fontWeight: activeTab === 'manual_sheet' ? 700 : 500,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={16} />
            <span>{isAr ? 'كشف التحضير اليدوي' : 'Manual Sheet'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* TAB 1: Large Rotating QR Screen */}
          {activeTab === 'qr' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              {!session.check_in_open ? (
                <div
                  style={{
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px dashed rgba(239, 68, 68, 0.3)',
                    borderRadius: '16px',
                    maxWidth: '480px',
                    width: '100%',
                  }}
                >
                  <Lock size={44} color="#f87171" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ margin: 0, color: '#f87171', fontSize: '1.15rem' }}>
                    {isAr ? 'باب تسجيل الحضور مغلق' : 'Check-in is Currently Closed'}
                  </h3>
                  <p style={{ color: '#aaa', fontSize: '0.86rem', marginTop: '0.4rem' }}>
                    {isAr
                      ? 'اضغط على زر "فتح التسجيل" بالأعلى لتوليد الكود الدوار والسماح للأعضاء بالتسجيل.'
                      : 'Click "Open Check-in" above to generate rotating QR tokens.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Rotating QR Box */}
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '1.5rem',
                      borderRadius: '16px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {qrToken ? (
                      <QRCodeSVG
                        value={qrToken}
                        size={260}
                        level="H"
                        includeMargin={false}
                        fgColor="#111218"
                        bgColor="#ffffff"
                      />
                    ) : (
                      <div
                        style={{
                          width: 260,
                          height: 260,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#333',
                        }}
                      >
                        <RefreshCw size={36} className="animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Manual 8-Character Code Box */}
                  <div
                    style={{
                      background: 'rgba(255, 184, 0, 0.08)',
                      border: '1px solid rgba(255, 184, 0, 0.35)',
                      borderRadius: '12px',
                      padding: '0.75rem 1.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05rem' }}>
                      {isAr ? 'كود الإدخال اليدوي' : 'Manual Entry Code'}
                    </div>
                    <div
                      style={{
                        fontSize: '1.8rem',
                        fontWeight: 900,
                        color: '#ffd54f',
                        letterSpacing: '0.3rem',
                        fontFamily: 'monospace',
                        marginTop: '0.2rem',
                      }}
                    >
                      {manualCode || '••••••••'}
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#aaa', fontSize: '0.8rem' }}>
                    <Clock size={14} color="#ffd54f" />
                    <span>
                      {isAr ? 'يتجدد الكود تلقائياً كل 20 ثانية' : 'Rotates automatically every 20s'}{' '}
                      ({secondsRemaining}s)
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: Live Attendee Stream */}
          {activeTab === 'live_list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Stat Counters Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#4ade80' }}>{isAr ? 'حاضر (في الموعد)' : 'Present'}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80' }}>{presentCount}</div>
                </div>
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#facc15' }}>{isAr ? 'متأخر' : 'Late'}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#facc15' }}>{lateCount}</div>
                </div>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#7dd3fc' }}>{isAr ? 'معذور' : 'Excused'}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7dd3fc' }}>{excusedCount}</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#f87171' }}>{isAr ? 'غائب' : 'Absent'}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171' }}>{absentCount}</div>
                </div>
              </div>

              {/* Realtime Stream List */}
              {loadingAttendees ? (
                <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                  {isAr ? 'تحميل قائمة الحضور...' : 'Loading attendees...'}
                </div>
              ) : attendees.length === 0 ? (
                <div style={{ color: '#777', textAlign: 'center', padding: '3rem', fontStyle: 'italic' }}>
                  {isAr ? 'لم يقم أي عضو بتسجيل الحضور بعد.' : 'No attendees registered yet.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {attendees.map((att) => {
                    const name = isAr
                      ? att.profiles?.full_name_ar || att.profiles?.full_name_en
                      : att.profiles?.full_name_en || att.profiles?.full_name_ar;
                    return (
                      <div
                        key={att.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 1rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 184, 0, 0.15)',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'rgba(255, 184, 0, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            {att.profiles?.avatar_url ? (
                              <img src={att.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Users size={14} color="#ffb800" />
                            )}
                          </div>
                          <div>
                            <div style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 600 }}>{name}</div>
                            <div style={{ color: '#777', fontSize: '0.72rem' }}>
                              {att.checked_in_at
                                ? new Date(att.checked_in_at).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')
                                : '—'}{' '}
                              • {att.method.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        <StatusBadge status={att.status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Manual Attendance Sheet */}
          {activeTab === 'manual_sheet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ color: '#aaa', fontSize: '0.84rem' }}>
                {isAr
                  ? 'كشف الحضور لجميع الأعضاء المستهدفين في الجلسة. يمكنك تغيير حالة الحضور وحفظها يدوياً.'
                  : 'Eligible members roster. Update status and notes manually.'}
              </div>

              {loadingEligible ? (
                <div style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>
                  {isAr ? 'تحميل كشف الأعضاء...' : 'Loading roster...'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {eligibleMembers.map((m) => {
                    const mName = isAr
                      ? m.profiles?.full_name_ar || m.profiles?.full_name_en
                      : m.profiles?.full_name_en || m.profiles?.full_name_ar;

                    // Match existing attendance record
                    const existing = attendees.find((a) => a.user_id === m.user_id);
                    const currentStatus = existing?.status || 'none';

                    return (
                      <div
                        key={m.user_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 184, 0, 0.15)',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>{mName}</div>
                          <StatusBadge status={m.position} />
                        </div>

                        {/* Status Select Buttons */}
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          {['present', 'late', 'absent', 'excused'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                updateManualAttendanceMutation.mutate({
                                  userId: m.user_id,
                                  status: st,
                                  notes: 'Manual sheet update',
                                })
                              }
                              disabled={updateManualAttendanceMutation.isPending}
                              style={{
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                background:
                                  currentStatus === st
                                    ? 'rgba(255, 184, 0, 0.25)'
                                    : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${
                                  currentStatus === st
                                    ? 'rgba(255, 184, 0, 0.6)'
                                    : 'rgba(255, 255, 255, 0.1)'
                                }`,
                                color: currentStatus === st ? '#ffd54f' : '#888',
                              }}
                            >
                              <StatusBadge status={st} />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Close Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCloseConfirmOpen}
        onClose={() => setIsCloseConfirmOpen(false)}
        onConfirm={() => closeSessionMutation.mutate()}
        title={isAr ? 'تأكيد إغلاق الجلسة واعتماد الحضور' : 'Confirm Close Session'}
        description={
          isAr
            ? `سيتم إغلاق باب التسجيل نهائياً، وتسجيل "غائب" لجميع الأعضاء الذين لم يحضروا (أو "معذور" لمن لديه عذر مقبول مسبقاً). هل أنت متأكد من الإغلاق؟`
            : `This will close check-in permanently and mark all missing members as absent (or excused if an approved excuse is on record).`
        }
        confirmText={isAr ? 'نعم، أغلق الجلسة' : 'Yes, Close Session'}
        variant="danger"
        isLoading={closeSessionMutation.isPending}
      />
    </div>
  );
}
