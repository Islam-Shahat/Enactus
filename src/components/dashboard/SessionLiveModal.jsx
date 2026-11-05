import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import {
  Camera,
  CameraOff,
  Keyboard,
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
  Calendar,
  MapPin,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  Search,
  Check,
  AlertCircle,
  SwitchCamera,
} from 'lucide-react';

// Audio feedback chime on scan success
function playSuccessBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

function playNoticeTone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

// Resolver for QR / manual input to member profile
async function resolveMemberFromCode(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const clean = rawInput.trim();

  // 1. ENACTUS-MEMBER format: ENACTUS-MEMBER:<userId>:<memberCode>:<sessionId>
  if (clean.startsWith('ENACTUS-MEMBER:')) {
    const parts = clean.split(':');
    const uId = parts[1];
    const mCode = parts[2];
    if (uId && uId.length === 36) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en, member_code, avatar_url')
        .eq('id', uId)
        .maybeSingle();
      if (data) return data;
    }
    if (mCode) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en, member_code, avatar_url')
        .eq('member_code', mCode)
        .maybeSingle();
      if (data) return data;
    }
  }

  // 2. Exact UUID match
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (UUID_REGEX.test(clean)) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name_ar, full_name_en, member_code, avatar_url')
      .eq('id', clean)
      .maybeSingle();
    if (data) return data;
  }

  // 3. Match member_code (e.g. 2026001 or any profile member_code)
  const { data: byMemberCode } = await supabase
    .from('profiles')
    .select('id, full_name_ar, full_name_en, member_code, avatar_url')
    .eq('member_code', clean)
    .maybeSingle();
  if (byMemberCode) return byMemberCode;

  // 4. Match 14-digit national ID in profile_private
  if (/^\d{14}$/.test(clean)) {
    const { data: priv } = await supabase
      .from('profile_private')
      .select('user_id')
      .eq('national_id', clean)
      .maybeSingle();
    if (priv?.user_id) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en, member_code, avatar_url')
        .eq('id', priv.user_id)
        .maybeSingle();
      if (data) return data;
    }
  }

  // 5. Match email in profile_private
  if (clean.includes('@')) {
    const { data: priv } = await supabase
      .from('profile_private')
      .select('user_id')
      .eq('email', clean.toLowerCase())
      .maybeSingle();
    if (priv?.user_id) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en, member_code, avatar_url')
        .eq('id', priv.user_id)
        .maybeSingle();
      if (data) return data;
    }
  }

  return null;
}

export default function SessionLiveModal({
  isOpen,
  onClose,
  session,
  initialTab = 'scanner', // 'scanner' | 'live_list' | 'manual_sheet' | 'projector'
  onSessionUpdated,
}) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  // Active view: 'scanner' | 'live_list' | 'manual_sheet' | 'projector'
  const [activeTab, setActiveTab] = useState(initialTab || 'scanner');

  // Scanner sub-mode: 'camera' | 'manual'
  const [scannerSubMode, setScannerSubMode] = useState('camera');
  const [manualMemberCode, setManualMemberCode] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastScannedMember, setLastScannedMember] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'

  // Rotating Token state (for optional projector view)
  const [qrToken, setQrToken] = useState(null);
  const [projectorCode, setProjectorCode] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(20);

  // Confirm dialogs
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const sessionId = session?.id;
  const isCheckInOpen = Boolean(session?.check_in_open);

  const cameraScannerRef = useRef(null);
  const isScanningReadyRef = useRef(true);

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'scanner');
      setScannerSubMode('camera');
      setLastScannedMember(null);
      setCameraError(null);
      setManualMemberCode('');
      isScanningReadyRef.current = true;
    }
  }, [isOpen, initialTab]);


  // Query Live Attendees
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
            member_code,
            avatar_url
          )
        `)
        .eq('session_id', session.id)
        .order('checked_in_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(isOpen && session?.id),
    refetchInterval: 10000,
  });

  const attendeesRef = useRef(attendees);
  attendeesRef.current = attendees;

  // Safely stop camera media tracks and html5-qrcode instance
  const stopCamera = useCallback(async () => {
    try {
      const container = document.getElementById('session-qr-reader-region');
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((video) => {
          if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
            video.srcObject.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch {}
            });
            video.srcObject = null;
          }
        });
      }
    } catch (e) {
      console.warn('[SessionLiveModal] stop tracks error:', e);
    }

    const scanner = cameraScannerRef.current;
    if (scanner) {
      try {
        if (typeof scanner.getState === 'function') {
          const state = scanner.getState();
          if (state === 2 || state === 3) {
            await scanner.stop();
          }
        }
      } catch (err) {
        console.warn('[SessionLiveModal] stop scanner error:', err);
      }
      try {
        scanner.clear();
      } catch {}
      cameraScannerRef.current = null;
    }
  }, []);

  const handleModalClose = async () => {
    await stopCamera();
    onClose();
  };

  // Check in a member by code/UUID (calls atomic DB RPC with direct client fallback)
  const handleCheckinMember = async (rawInput, method = 'qr') => {
    if (!rawInput || !rawInput.trim() || !session?.id) return;
    try {
      setIsCheckingIn(true);

      // 1. Try atomic Database RPC first
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_session_attendance', {
          p_session_id: session.id,
          p_identifier: rawInput.trim(),
          p_status: 'present',
          p_method: method,
          p_notes: method === 'qr' ? 'تم المسح عبر الكاميرا' : 'تم الإدخال اليدوي لكود العضو',
        });

        if (!rpcErr && rpcRes) {
          if (!rpcRes.ok) {
            toast.show(rpcRes.message || (isAr ? 'لم يتم العثور على العضو' : 'Member not found'), 'error');
            return;
          }

          const memberData = rpcRes.member;
          if (rpcRes.already_recorded) {
            playNoticeTone();
            toast.show(
              isAr
                ? `العضو ${memberData.full_name_ar || memberData.full_name_en} مسجل حضوره بالفعل مسبقاً!`
                : `${memberData.full_name_en || memberData.full_name_ar} is already marked present!`,
              'info'
            );
            setLastScannedMember({ ...memberData, status: 'already_present' });
            return;
          }

          playSuccessBeep();
          setLastScannedMember({ ...memberData, status: 'present' });
          setManualMemberCode('');

          toast.show(
            isAr
              ? `تم تسجيل حضور: ${memberData.full_name_ar || memberData.full_name_en} (${memberData.member_code || ''}) بنجاح`
              : `Checked in: ${memberData.full_name_en || memberData.full_name_ar} (${memberData.member_code || ''})`,
            'success'
          );

          queryClient.invalidateQueries({ queryKey: ['dashboard', 'session_attendees', session.id] });
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_sessions'] });
          return;
        }
      } catch (rpcEx) {
        // Fall back to direct client operations
      }

      // 2. Direct client fallback via Supabase RLS
      const member = await resolveMemberFromCode(rawInput.trim());

      if (!member) {
        toast.show(
          isAr
            ? `لم يتم العثور على عضو بهذا الكود: "${rawInput.trim()}"`
            : `No member found with code: "${rawInput.trim()}"`,
          'error'
        );
        return;
      }

      // Check if already in attendees
      const existing = attendees.find((a) => a.user_id === member.id);
      if (existing && existing.status === 'present') {
        playNoticeTone();
        toast.show(
          isAr
            ? `العضو ${member.full_name_ar || member.full_name_en} مسجل حضوره بالفعل مسبقاً!`
            : `${member.full_name_en || member.full_name_ar} is already marked present!`,
          'info'
        );
        setLastScannedMember({ ...member, status: 'already_present' });
        return;
      }

      // Upsert attendance record
      const { error: attErr } = await supabase.from('attendance').upsert(
        {
          session_id: session.id,
          user_id: member.id,
          status: 'present',
          method,
          recorded_by: user?.id || null,
          checked_in_at: new Date().toISOString(),
          notes: method === 'qr' ? 'تم المسح عبر الكاميرا' : 'تم الإدخال اليدوي لكود العضو',
        },
        { onConflict: 'session_id,user_id' }
      );

      if (attErr) throw attErr;

      playSuccessBeep();
      setLastScannedMember({ ...member, status: 'present' });
      setManualMemberCode('');

      toast.show(
        isAr
          ? `تم تسجيل حضور: ${member.full_name_ar || member.full_name_en} (${member.member_code || ''}) بنجاح`
          : `Checked in: ${member.full_name_en || member.full_name_ar} (${member.member_code || ''})`,
        'success'
      );

      queryClient.invalidateQueries({ queryKey: ['dashboard', 'session_attendees', session.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_sessions'] });
    } catch (err) {
      toast.show(err.message || (isAr ? 'فشل تسجيل الحضور' : 'Failed to record attendance'), 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Continuous Camera Scanner Lifecycle
  useEffect(() => {
    if (!isOpen || activeTab !== 'scanner' || scannerSubMode !== 'camera') {
      stopCamera();
      return;
    }

    let isMounted = true;
    const qrRegionId = 'session-qr-reader-region';

    const timer = setTimeout(async () => {
      if (!isMounted) return;

      await stopCamera();
      if (!isMounted) return;

      const container = document.getElementById(qrRegionId);
      if (!container) return;

      try {
        const html5QrCode = new Html5Qrcode(qrRegionId);
        cameraScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: cameraFacing },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            if (!isScanningReadyRef.current) return;
            // Prevent duplicate triggers in rapid succession
            isScanningReadyRef.current = false;
            await handleCheckinMember(decodedText, 'qr');

            // Re-arm camera for next attendee after 1.5 seconds
            setTimeout(() => {
              isScanningReadyRef.current = true;
            }, 1500);
          },
          () => {}
        );
      } catch (err) {
        if (!isMounted) return;
        console.error('[Session Scanner Error]:', err);
        const errStr = String(err?.message || err || '');
        if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
          setCameraError(
            isAr
              ? 'تم رفض إذن الكاميرا في المتصفح. يمكنك استخدام الإدخال اليدوي للكود.'
              : 'Camera permission denied. Use manual code entry.'
          );
        } else if (errStr.includes('NotFoundError') || errStr.includes('device')) {
          setCameraError(
            isAr
              ? 'لم يتم العثور على كاميرا في هذا الجهاز.'
              : 'No camera found on this device.'
          );
        } else {
          setCameraError(
            isAr
              ? 'تعذر تشغيل الكاميرا. يمكنك استخدام الإدخال اليدوي للكود.'
              : 'Could not access camera. Switch to manual code entry.'
          );
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, activeTab, scannerSubMode, cameraFacing, isAr, stopCamera]);

  // Fetch token for optional projector view
  const fetchQrToken = useCallback(async () => {
    if (!sessionId || !isCheckInOpen || activeTab !== 'projector') return;
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
      if (!res.ok) throw new Error(data.error);

      setQrToken(data.token);
      setProjectorCode(data.code);
      setSecondsRemaining(20);
    } catch (err) {
      // Quiet fallback
    }
  }, [sessionId, isCheckInOpen, activeTab]);

  useEffect(() => {
    if (!isOpen || !sessionId || !isCheckInOpen || activeTab !== 'projector') return;
    fetchQrToken();
    const interval = setInterval(fetchQrToken, 20000);
    const countdown = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 20));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, [isOpen, sessionId, isCheckInOpen, activeTab, fetchQrToken]);

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
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_stats'] });
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
            member_code,
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

  // Delete Session Mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('attendance_sessions')
        .delete()
        .eq('id', session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم حذف الجلسة وسجلاتها بنجاح' : 'Session deleted successfully', 'success');
      setIsDeleteConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'upcoming_sessions'] });
      handleModalClose();
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل حذف الجلسة' : 'Failed to delete session'), 'error');
    },
  });

  // Close Session Mutation (calls Edge Function with direct client fallback)
  const closeSessionMutation = useMutation({
    mutationFn: async () => {
      // 1. Try invoking Edge Function if deployed
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        if (authSession?.access_token) {
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

          if (res.ok) {
            const data = await res.json();
            return data;
          }
        }
      } catch (edgeErr) {
        console.warn('Edge function close-session unavailable, falling back to direct DB update:', edgeErr);
      }

      // 2. Direct client fallback via Supabase RLS
      const { error: closeErr } = await supabase
        .from('attendance_sessions')
        .update({ check_in_open: false })
        .eq('id', session.id);

      if (closeErr) throw closeErr;

      // Fetch eligible members
      let membersQuery = supabase
        .from('memberships')
        .select('user_id')
        .eq('season_id', session.season_id)
        .eq('status', 'active');

      if (session.committee_id) {
        membersQuery = membersQuery.eq('committee_id', session.committee_id);
      }

      const { data: eligibleMembersData } = await membersQuery;
      const eligibleUserIds = Array.from(new Set((eligibleMembersData || []).map((m) => m.user_id)));

      // Fetch existing attendance records
      const { data: existingRecords } = await supabase
        .from('attendance')
        .select('user_id')
        .eq('session_id', session.id);

      const recordedUserIds = new Set((existingRecords || []).map((r) => r.user_id));

      // Fetch approved excuses
      const { data: approvedExcuses } = await supabase
        .from('excuse_requests')
        .select('user_id')
        .eq('session_id', session.id)
        .eq('status', 'approved');

      const approvedExcuseUserIds = new Set((approvedExcuses || []).map((e) => e.user_id));

      const missingUserIds = eligibleUserIds.filter((uid) => !recordedUserIds.has(uid));
      let newlyExcused = 0;
      let newlyAbsent = 0;
      const rowsToInsert = [];

      for (const uid of missingUserIds) {
        const isApprovedExcuse = approvedExcuseUserIds.has(uid);
        if (isApprovedExcuse) {
          newlyExcused++;
          rowsToInsert.push({
            session_id: session.id,
            user_id: uid,
            status: 'excused',
            method: 'manual',
            recorded_by: user?.id || null,
            notes: isAr ? 'عذر معتمد تلقائي عند إغلاق الجلسة' : 'Auto excused on close',
          });
        } else {
          newlyAbsent++;
          rowsToInsert.push({
            session_id: session.id,
            user_id: uid,
            status: 'absent',
            method: 'manual',
            recorded_by: user?.id || null,
            notes: isAr ? 'غياب مسجل تلقائياً عند إغلاق الجلسة' : 'Auto absent on close',
          });
        }
      }

      if (rowsToInsert.length > 0) {
        const { error: insertErr } = await supabase.from('attendance').insert(rowsToInsert);
        if (insertErr) {
          console.warn('Could not insert automatic absent/excused records:', insertErr);
        }
      }

      return { newlyAbsent, newlyExcused };
    },
    onSuccess: (data) => {
      toast.show(
        isAr
          ? `تم إغلاق الجلسة بنجاح (تسجيل ${data?.newlyAbsent ?? 0} غياب، ${data?.newlyExcused ?? 0} عذر)`
          : `Session closed (${data?.newlyAbsent ?? 0} absent, ${data?.newlyExcused ?? 0} excused)`,
        'success'
      );
      setIsCloseConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'session_attendees', session.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'upcoming_sessions'] });
      if (onSessionUpdated) onSessionUpdated({ ...session, check_in_open: false });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل إغلاق الجلسة' : 'Failed to close session'), 'error');
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
      onClick={handleModalClose}
    >
      <div
        className="glass-panel gold-border-glow"
        dir={dir}
        style={{
          borderRadius: '20px',
          maxWidth: '860px',
          width: '100%',
          maxHeight: '92vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
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
            {session.check_in_open && (
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
            )}

            {/* Delete Session Button */}
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              title={isAr ? 'حذف الجلسة نهائياً' : 'Delete Session Permanently'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
              <span>{isAr ? 'حذف الجلسة' : 'Delete Session'}</span>
            </button>

            <button
              type="button"
              onClick={handleModalClose}
              style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '0.2rem' }}
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
            overflowX: 'auto',
            gap: '0.25rem',
          }}
        >
          {/* TAB 1: Scan Attendance (Default & Main) */}
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            style={{
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'scanner' ? '2px solid #ffb800' : '2px solid transparent',
              color: activeTab === 'scanner' ? '#ffd54f' : '#888',
              fontWeight: activeTab === 'scanner' ? 700 : 500,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Camera size={16} />
            <span>{isAr ? 'مسح كود الحضور' : 'Scan Attendance'}</span>
          </button>

          {/* TAB 2: Live Attendees */}
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
              whiteSpace: 'nowrap',
            }}
          >
            <Users size={16} />
            <span>{isAr ? 'سجل الحاضرين' : 'Attendees'}</span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '9999px',
                background: 'rgba(255,184,0,0.15)',
                color: '#ffd54f',
                fontWeight: 700,
              }}
            >
              {attendees.length}
            </span>
          </button>

          {/* TAB 3: Manual Full Sheet */}
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
              whiteSpace: 'nowrap',
            }}
          >
            <FileSpreadsheet size={16} />
            <span>{isAr ? 'كشف التحضير اليدوي' : 'Manual Sheet'}</span>
          </button>

          {/* TAB 4: Projector Rotating QR */}
          <button
            type="button"
            onClick={() => setActiveTab('projector')}
            style={{
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'projector' ? '2px solid #ffb800' : '2px solid transparent',
              color: activeTab === 'projector' ? '#ffd54f' : '#888',
              fontWeight: activeTab === 'projector' ? 700 : 500,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <QrCode size={16} />
            <span>{isAr ? 'عرض البروجيكتور (QR)' : 'Projector QR'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* ============================================================== */}
          {/* TAB 1: SCAN ATTENDANCE (CAMERA & MANUAL CODE)                  */}
          {/* ============================================================== */}
          <div style={{ display: activeTab === 'scanner' ? 'flex' : 'none', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Toggle Switch: Camera vs Manual Code */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                padding: '0.3rem',
                gap: '0.3rem',
                maxWidth: '460px',
                margin: '0 auto',
                width: '100%',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setScannerSubMode('camera');
                }}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: scannerSubMode === 'camera' ? 'rgba(255, 184, 0, 0.22)' : 'transparent',
                  color: scannerSubMode === 'camera' ? '#ffd54f' : '#888',
                  fontWeight: scannerSubMode === 'camera' ? 800 : 500,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Camera size={17} />
                <span>{isAr ? 'مسح الكاميرا للـ QR' : 'Camera QR Scan'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await stopCamera();
                  setScannerSubMode('manual');
                }}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: scannerSubMode === 'manual' ? 'rgba(255, 184, 0, 0.22)' : 'transparent',
                  color: scannerSubMode === 'manual' ? '#ffd54f' : '#888',
                  fontWeight: scannerSubMode === 'manual' ? 800 : 500,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Keyboard size={17} />
                <span>{isAr ? 'إدخال الكود يدوياً' : 'Manual Code'}</span>
              </button>
            </div>

            {/* Mode A: Camera Scanner for Member QR Passes */}
            <div
              style={{
                display: scannerSubMode === 'camera' ? 'flex' : 'none',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              {cameraError ? (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    color: '#f87171',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    maxWidth: '420px',
                    width: '100%',
                  }}
                >
                  <CameraOff size={36} />
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setScannerSubMode('manual')}
                    className="btn-primary"
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                  >
                    {isAr ? 'الانتقال للإدخال اليدوي' : 'Switch to Manual Code'}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: '#000',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: '260px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: '2px solid rgba(255, 184, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div id="session-qr-reader-region" style={{ width: '100%' }} />

                  {isCheckingIn && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.75)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        color: '#ffd54f',
                        zIndex: 10,
                      }}
                    >
                      <RefreshCw size={36} className="animate-spin" />
                      <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                        {isAr ? 'جاري تسجيل حضور العضو...' : 'Recording check-in...'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!cameraError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      await stopCamera();
                      setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 184, 0, 0.35)',
                      background: 'rgba(255, 184, 0, 0.1)',
                      color: '#ffd54f',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <SwitchCamera size={14} />
                    <span>
                      {cameraFacing === 'environment'
                        ? isAr
                          ? 'تبديل للكاميرا الأمامية'
                          : 'Switch to Front Camera'
                        : isAr
                        ? 'تبديل للكاميرا الخلفية'
                        : 'Switch to Back Camera'}
                    </span>
                  </button>
                </div>
              )}

              <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0, textAlign: 'center', maxWidth: '420px' }}>
                {isAr
                  ? 'وجّه الكاميرا نحو الـ QR الخاص بالعضو (المعروض في هاتفه) لتسجيل حضوره فوراً في هذه الجلسة.'
                  : 'Point camera at member QR code to record their attendance immediately.'}
              </p>
            </div>

            {/* Mode B: Manual Code Entry Form */}
            <div
              style={{
                display: scannerSubMode === 'manual' ? 'flex' : 'none',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                maxWidth: '460px',
                margin: '0 auto',
                width: '100%',
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCheckinMember(manualMemberCode, 'manual');
                }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: titleColor,
                      marginBottom: '0.5rem',
                    }}
                  >
                    {isAr ? 'كود العضو أو الرقم القومي' : 'Member Code or National ID'}
                  </label>
                  <input
                    type="text"
                    value={manualMemberCode}
                    onChange={(e) => setManualMemberCode(e.target.value)}
                    placeholder={isAr ? 'مثال: 2026001 أو الرقم القومي' : 'e.g. 2026001'}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1.5px solid rgba(255, 184, 0, 0.4)',
                      color: '#ffd54f',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      letterSpacing: '1px',
                    }}
                  />
                  <p style={{ color: '#888', fontSize: '0.78rem', marginTop: '0.4rem', margin: '0.4rem 0 0' }}>
                    {isAr
                      ? 'يمكنك إدخال كود العضو المكون من 7 أرقام (الموجود في بطاقة العضو) أو الرقم القومي.'
                      : 'Enter 7-digit member code (from member pass) or national ID.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isCheckingIn || !manualMemberCode.trim()}
                  className="btn-primary"
                  style={{
                    padding: '0.8rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                  }}
                >
                  {isCheckingIn ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>{isAr ? 'جاري الرصد...' : 'Recording...'}</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={18} />
                      <span>{isAr ? 'تسجيل الحضور بالكود' : 'Record Check-in'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Instant Scanned Member Confirmation Card */}
            {lastScannedMember && (
              <div
                style={{
                  maxWidth: '460px',
                  margin: '0 auto',
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '12px',
                  background:
                    lastScannedMember.status === 'already_present'
                      ? 'rgba(234, 179, 8, 0.12)'
                      : 'rgba(34, 197, 94, 0.12)',
                  border: `1.5px solid ${
                    lastScannedMember.status === 'already_present'
                      ? 'rgba(234, 179, 8, 0.4)'
                      : 'rgba(34, 197, 94, 0.5)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background:
                      lastScannedMember.status === 'already_present'
                        ? 'rgba(234, 179, 8, 0.2)'
                        : 'rgba(34, 197, 94, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {lastScannedMember.avatar_url ? (
                    <img
                      src={lastScannedMember.avatar_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : lastScannedMember.status === 'already_present' ? (
                    <AlertCircle size={24} color="#facc15" />
                  ) : (
                    <CheckCircle2 size={24} color="#4ade80" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                    {isAr
                      ? lastScannedMember.full_name_ar || lastScannedMember.full_name_en
                      : lastScannedMember.full_name_en || lastScannedMember.full_name_ar}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: lastScannedMember.status === 'already_present' ? '#facc15' : '#4ade80',
                        fontWeight: 700,
                      }}
                    >
                      {lastScannedMember.status === 'already_present'
                        ? isAr
                          ? 'مسجل مسبقاً في هذه الجلسة'
                          : 'Already registered'
                        : isAr
                        ? 'تم تسجيل الحضور بنجاح (حاضر)'
                        : 'Attendance confirmed (Present)'}
                    </span>
                    {lastScannedMember.member_code && (
                      <span style={{ fontSize: '0.72rem', color: '#ffd54f', fontFamily: 'monospace' }}>
                        • {lastScannedMember.member_code}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Live Attendees Counter Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                background: 'rgba(255, 184, 0, 0.05)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                borderRadius: '10px',
                maxWidth: '600px',
                margin: '0 auto',
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} color="#ffd54f" />
                <span style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 600 }}>
                  {isAr ? 'إجمالي الحاضرين حتى الآن:' : 'Total attendees checked in:'}
                </span>
                <span style={{ color: '#ffd54f', fontSize: '1.1rem', fontWeight: 800 }}>
                  {presentCount}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('live_list')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffd54f',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {isAr ? 'عرض القائمة الكاملة ←' : 'View full roster →'}
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* TAB 2: LIVE ATTENDEE STREAM LIST                              */}
          {/* ============================================================== */}
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
                              {att.profiles?.member_code && ` • كود: ${att.profiles.member_code}`}
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

          {/* ============================================================== */}
          {/* TAB 3: MANUAL BULK ATTENDANCE SHEET                            */}
          {/* ============================================================== */}
          {activeTab === 'manual_sheet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ color: '#aaa', fontSize: '0.84rem' }}>
                {isAr
                  ? 'كشف الحضور لجميع الأعضاء المستهدفين في الجلسة. يمكنك تغيير حالة الحضور وحفظها يدوياً.'
                  : 'Eligible members roster. Update status and notes manually.'}
              </div>

              {loadingEligible ? (
                <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                  {isAr ? 'تحميل كشف الأعضاء...' : 'Loading members...'}
                </div>
              ) : eligibleMembers.length === 0 ? (
                <div style={{ color: '#777', textAlign: 'center', padding: '2rem', fontStyle: 'italic' }}>
                  {isAr ? 'لا يوجد أعضاء مؤهلين مسجلين في هذا النطاق.' : 'No eligible members found.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {eligibleMembers.map((m) => {
                    const existingAtt = attendees.find((a) => a.user_id === m.user_id);
                    const currentStatus = existingAtt ? existingAtt.status : 'absent';
                    const memberName = isAr
                      ? m.profiles?.full_name_ar || m.profiles?.full_name_en
                      : m.profiles?.full_name_en || m.profiles?.full_name_ar;

                    return (
                      <div
                        key={m.user_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          padding: '0.75rem 1rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 184, 0, 0.12)',
                          borderRadius: '8px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{memberName}</div>
                          <div style={{ fontSize: '0.74rem', color: '#888' }}>
                            {m.position || (isAr ? 'عضو' : 'Member')}
                            {m.profiles?.member_code && ` • كود: ${m.profiles.member_code}`}
                          </div>
                        </div>

                        {/* Status Radio Pills */}
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {['present', 'late', 'excused', 'absent'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                updateManualAttendanceMutation.mutate({
                                  userId: m.user_id,
                                  status: st,
                                })
                              }
                              style={{
                                padding: '0.25rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
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

          {/* ============================================================== */}
          {/* TAB 4: PROJECTOR ROTATING QR DISPLAY                           */}
          {/* ============================================================== */}
          {activeTab === 'projector' && (
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
                      {isAr ? 'كود البروجيكتور المؤقت' : 'Projector Temporary Code'}
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
                      {projectorCode || '••••••••'}
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

      {/* Delete Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => deleteSessionMutation.mutate()}
        title={isAr ? 'تأكيد حذف الجلسة' : 'Confirm Delete Session'}
        description={
          isAr
            ? `هل أنت متأكد من حذف هذه الجلسة نهائياً؟ سيتم حذف جميع سجلات الحضور والغياب والأعذار المرتبطة بها ولا يمكن التراجع عن هذا الإجراء.`
            : `Are you sure you want to permanently delete this session? All associated attendance, absence, and excuse records will be deleted. This cannot be undone.`
        }
        confirmText={isAr ? 'نعم، احذف الجلسة' : 'Yes, Delete Session'}
        variant="danger"
        isLoading={deleteSessionMutation.isPending}
      />
    </div>
  );
}
