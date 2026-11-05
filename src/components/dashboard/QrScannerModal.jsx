import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from './Toast';
import FormField from './FormField';
import {
  Camera,
  CameraOff,
  KeyRound,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  SwitchCamera,
  RefreshCw,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

// Audio feedback on successful check-in
function playSuccessBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

// Audio notice tone if already checked in
function playNoticeTone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function QrScannerModal({
  isOpen,
  onClose,
  sessions = [], // active/upcoming sessions for manual code select
  onCheckinSuccess,
}) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();

  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'manual'
  const [cameraError, setCameraError] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkinResult, setCheckinResult] = useState(null);

  // Available sessions and selected session
  const [localSessions, setLocalSessions] = useState(sessions || []);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [manualCode, setManualCode] = useState('');

  const scannerRef = useRef(null);

  // Fetch or sync sessions when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (sessions && sessions.length > 0) {
      setLocalSessions(sessions);
      setSelectedSessionId((prev) => {
        if (prev && sessions.some((s) => s.id === prev)) return prev;
        const open = sessions.find((s) => s.check_in_open) || sessions[0];
        return open.id;
      });
    } else {
      (async () => {
        try {
          const { data } = await supabase
            .from('attendance_sessions')
            .select('id, title, type, starts_at, check_in_open')
            .order('starts_at', { ascending: false })
            .limit(15);
          if (data && data.length > 0) {
            setLocalSessions(data);
            setSelectedSessionId((prev) => {
              if (prev && data.some((s) => s.id === prev)) return prev;
              const open = data.find((s) => s.check_in_open) || data[0];
              return open.id;
            });
          }
        } catch (e) {
          console.warn('[QrScannerModal] fetch sessions error:', e);
        }
      })();
    }
  }, [isOpen, sessions]);

  // Stop camera media tracks and safely stop scanner instance
  const stopCamera = useCallback(async () => {
    try {
      const container = document.getElementById('qr-reader-region');
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
      console.warn('[QrScannerModal] Error stopping media tracks:', e);
    }

    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (typeof scanner.getState === 'function') {
          const state = scanner.getState();
          if (state === 2 || state === 3) {
            await scanner.stop();
          }
        }
      } catch (err) {
        console.warn('[QrScannerModal] Error stopping scanner:', err);
      }
      try {
        scanner.clear();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  // Safe mode switchers
  const handleSwitchToManual = async () => {
    await stopCamera();
    setActiveMode('manual');
  };

  const handleSwitchToCamera = () => {
    setCameraError(null);
    setActiveMode('camera');
  };

  const handleClose = async () => {
    await stopCamera();
    onClose();
  };

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setCameraError(null);
      setCheckinResult(null);
      setIsProcessing(false);
      setManualCode('');
      setActiveMode('camera');
    } else {
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  // Helper to resolve member profile by QR / code / national id
  const resolveMemberFromCode = async (rawCode) => {
    if (!rawCode) return null;
    let cleanCode = String(rawCode).trim();

    if (cleanCode.startsWith('ENACTUS-MEMBER:')) {
      const parts = cleanCode.split(':');
      if (parts[1]) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name_ar, full_name_en, member_code, avatar_url, national_id, email')
          .eq('id', parts[1])
          .maybeSingle();
        if (data) return data;
      }
      if (parts[2]) {
        cleanCode = parts[2];
      }
    }

    const { data: byCode } = await supabase
      .from('profiles')
      .select('id, full_name_ar, full_name_en, member_code, avatar_url, national_id, email')
      .eq('member_code', cleanCode)
      .maybeSingle();
    if (byCode) return byCode;

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode)) {
      const { data: byId } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en, member_code, avatar_url, national_id, email')
        .eq('id', cleanCode)
        .maybeSingle();
      if (byId) return byId;
    }

    if (/^\d{14}$/.test(cleanCode)) {
      const { data: byNat } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en, member_code, avatar_url, national_id, email')
        .eq('national_id', cleanCode)
        .maybeSingle();
      if (byNat) return byNat;
    }

    return null;
  };

  // Execute check-in logic
  const executeCheckin = async (payload) => {
    try {
      setIsProcessing(true);
      const rawCode = String(payload?.token || payload?.code || '').trim();

      if (!rawCode) {
        toast.show(isAr ? 'لم يتم العثور على كود صالح' : 'No valid code provided', 'error');
        return;
      }

      const targetSessionId = payload.session_id || selectedSessionId || (localSessions[0] && localSessions[0].id);
      if (!targetSessionId) {
        toast.show(isAr ? 'يرجى اختيار الجلسة أولاً' : 'Please select a session first', 'error');
        return;
      }

      const currentSessionObj = localSessions.find((s) => s.id === targetSessionId);
      const method = payload.token ? 'qr' : 'manual';

      // 1. Try atomic RPC (security definer backend function)
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_session_attendance', {
          p_session_id: targetSessionId,
          p_identifier: rawCode,
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
            setCheckinResult({
              status: 'present',
              already_recorded: true,
              member: memberData,
              session_title: rpcRes.session?.title || currentSessionObj?.title,
            });
            return;
          }

          playSuccessBeep();
          setCheckinResult({
            status: 'present',
            already_recorded: false,
            member: memberData,
            session_title: rpcRes.session?.title || currentSessionObj?.title,
          });

          toast.show(
            isAr
              ? `تم تسجيل حضور: ${memberData.full_name_ar || memberData.full_name_en} بنجاح`
              : `Checked in: ${memberData.full_name_en || memberData.full_name_ar}`,
            'success'
          );

          if (onCheckinSuccess) onCheckinSuccess(rpcRes);
          return;
        }
      } catch (rpcEx) {
        // Fall back to direct client operations
      }

      // 2. Direct client fallback via Supabase RLS
      const member = await resolveMemberFromCode(rawCode);

      if (member) {
        const { error: attErr } = await supabase.from('attendance').upsert(
          {
            session_id: targetSessionId,
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
        setCheckinResult({
          status: 'present',
          already_recorded: false,
          member,
          session_title: currentSessionObj?.title,
        });

        toast.show(
          isAr
            ? `تم تسجيل حضور: ${member.full_name_ar || member.full_name_en} (${member.member_code || ''}) بنجاح`
            : `Checked in: ${member.full_name_en || member.full_name_ar}`,
          'success'
        );

        if (onCheckinSuccess) onCheckinSuccess({ member });
        return;
      }

      // 3. Fallback: Edge Function check-in (for rotating projector token)
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession) {
        throw new Error(isAr ? 'جلسة المستخدم منتهية. يرجى تسجيل الدخول مجدداً.' : 'User session expired.');
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qr-checkin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || (isAr ? 'تعذر التعرف على كود العضو أو الجلسة' : 'Check-in failed'));
      }

      playSuccessBeep();
      setCheckinResult(data);
      toast.show(
        isAr
          ? `تم تسجيل الحضور بنجاح (${data.status === 'late' ? 'متأخر' : 'حاضر'})`
          : `Check-in successful (${data.status})`,
        'success'
      );

      if (onCheckinSuccess) onCheckinSuccess(data);
    } catch (err) {
      toast.show(err.message || (isAr ? 'فشل تسجيل الحضور' : 'Failed to record attendance'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  const executeCheckinRef = useRef(executeCheckin);
  executeCheckinRef.current = executeCheckin;

  // Start / Stop Camera Scanner
  useEffect(() => {
    if (!isOpen || activeMode !== 'camera' || checkinResult) {
      stopCamera();
      return;
    }

    let isMounted = true;
    const qrRegionId = 'qr-reader-region';

    const timer = setTimeout(async () => {
      if (!isMounted) return;

      await stopCamera();
      if (!isMounted) return;

      const container = document.getElementById(qrRegionId);
      if (!container) return;

      try {
        const html5QrCode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: cameraFacing },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            if (isProcessingRef.current) return;
            await stopCamera();
            executeCheckinRef.current({ token: decodedText });
          },
          () => {}
        );
      } catch (err) {
        if (!isMounted) return;
        console.error('[Html5Qrcode Error]:', err);
        const errStr = String(err?.message || err || '');
        if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
          setCameraError(
            isAr
              ? 'تم رفض إذن الوصول إلى الكاميرا. يرجى تفعيل إذن الكاميرا من إعدادات المتصفح أو استخدام الرمز اليدوي.'
              : 'Camera permission denied. Please allow camera access in browser settings or use manual code.'
          );
        } else if (errStr.includes('NotFoundError') || errStr.includes('device')) {
          setCameraError(
            isAr
              ? 'لم يتم العثور على كاميرا في جهازك. يرجى استخدام الرمز اليدوي.'
              : 'No camera found. Please use the manual code fallback.'
          );
        } else {
          setCameraError(
            isAr
              ? 'تعذر تشغيل الكاميرا. يمكنك إدخال كود العضو يدوياً.'
              : 'Failed to access camera. You can enter member code manually.'
          );
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, activeMode, cameraFacing, checkinResult, isAr, stopCamera]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!selectedSessionId) {
      toast.show(isAr ? 'يرجى اختيار الجلسة أولاً' : 'Please select a session', 'error');
      return;
    }
    if (!manualCode.trim()) {
      toast.show(isAr ? 'يرجى إدخال كود العضو أو رقمه القومي' : 'Please enter code', 'error');
      return;
    }

    executeCheckin({
      session_id: selectedSessionId,
      code: manualCode.trim(),
    });
  };

  if (!isOpen) return null;

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
      onClick={handleClose}
    >
      <div
        className="glass-panel gold-border-glow"
        dir={dir}
        style={{
          borderRadius: '20px',
          padding: '1.75rem',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.85)' : '0 20px 50px rgba(184, 120, 0, 0.15)',
          background: isDark
            ? 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))'
            : 'rgba(255, 255, 255, 0.98)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(217, 119, 6, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: titleColor,
              }}
            >
              <Camera size={20} />
            </div>
            <h3 className="modal-header-title" style={{ margin: 0, color: titleColor, fontSize: '1.2rem', fontWeight: 800 }}>
              {isAr ? 'تسجيل الحضور السريع' : 'Attendance Check-in'}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#a0a0b2' : '#6b7280',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected Session Picker */}
        {localSessions.length > 0 && !checkinResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: titleColor }}>
              {isAr ? 'الجلسة المحددة لتسجيل الحضور:' : 'Selected Session:'}
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: isDark ? '1px solid rgba(255, 184, 0, 0.35)' : '1px solid rgba(217, 119, 6, 0.3)',
                color: isDark ? '#ffd54f' : '#b45309',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              {localSessions.map((s) => (
                <option key={s.id} value={s.id} style={{ background: '#181920', color: '#fff' }}>
                  {s.title} {s.check_in_open ? `(${isAr ? 'مفتوحة الآن' : 'Open'})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Success View */}
        {checkinResult ? (
          <div
            style={{
              textAlign: 'center',
              padding: '1.5rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: checkinResult.already_recorded
                  ? 'rgba(234, 179, 8, 0.15)'
                  : 'rgba(34, 197, 94, 0.15)',
                border: `2px solid ${
                  checkinResult.already_recorded ? 'rgba(234, 179, 8, 0.5)' : 'rgba(34, 197, 94, 0.5)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: checkinResult.already_recorded ? '#facc15' : '#4ade80',
              }}
            >
              {checkinResult.already_recorded ? <AlertCircle size={36} /> : <CheckCircle2 size={36} />}
            </div>

            <div>
              <h4 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 800 }}>
                {checkinResult.already_recorded
                  ? isAr
                    ? 'مسجل حضوره بالفعل مسبقاً!'
                    : 'Already Checked In!'
                  : isAr
                  ? 'تم تأكيد تسجيل الحضور بنجاح!'
                  : 'Attendance Confirmed!'}
              </h4>
              <p style={{ color: '#ffd54f', margin: '0.4rem 0 0', fontSize: '1rem', fontWeight: 700 }}>
                {checkinResult.member
                  ? (isAr
                      ? checkinResult.member.full_name_ar || checkinResult.member.full_name_en
                      : checkinResult.member.full_name_en || checkinResult.member.full_name_ar)
                  : checkinResult.member_name || checkinResult.session_title}
              </p>
              {checkinResult.member?.member_code && (
                <p style={{ color: '#aaa', margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                  {isAr ? 'كود العضو:' : 'Member Code:'} {checkinResult.member.member_code}
                </p>
              )}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 1rem',
                borderRadius: '9999px',
                background:
                  checkinResult.status === 'late'
                    ? 'rgba(234, 179, 8, 0.15)'
                    : 'rgba(34, 197, 94, 0.15)',
                color: checkinResult.status === 'late' ? '#facc15' : '#4ade80',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: `1px solid ${
                  checkinResult.status === 'late'
                    ? 'rgba(234, 179, 8, 0.3)'
                    : 'rgba(34, 197, 94, 0.3)'
                }`,
              }}
            >
              <Sparkles size={14} />
              <span>
                {checkinResult.status === 'late'
                  ? isAr
                    ? 'الحالة: متأخر'
                    : 'Status: Late'
                  : isAr
                  ? 'الحالة: حاضر في الموعد'
                  : 'Status: Present (On time)'}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.6rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setCheckinResult(null);
                  setActiveMode('camera');
                }}
                className="btn-primary"
                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
              >
                {isAr ? 'تسجيل حضور عضو آخر' : 'Scan Next Member'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
              >
                {isAr ? 'إغلاق النافذة' : 'Close'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Toggle Pills */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '8px',
                padding: '0.25rem',
                gap: '0.25rem',
              }}
            >
              <button
                type="button"
                onClick={handleSwitchToCamera}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeMode === 'camera' ? 'rgba(255, 184, 0, 0.2)' : 'transparent',
                  color: activeMode === 'camera' ? '#ffd54f' : '#888',
                  fontWeight: activeMode === 'camera' ? 700 : 500,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Camera size={16} />
                <span>{isAr ? 'مسح الكاميرا' : 'Camera Scan'}</span>
              </button>

              <button
                type="button"
                onClick={handleSwitchToManual}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeMode === 'manual' ? 'rgba(255, 184, 0, 0.2)' : 'transparent',
                  color: activeMode === 'manual' ? '#ffd54f' : '#888',
                  fontWeight: activeMode === 'manual' ? 700 : 500,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <KeyRound size={16} />
                <span>{isAr ? 'إدخال الكود يدوياً' : 'Manual Code'}</span>
              </button>
            </div>

            {/* Mode 1: Camera Scanner */}
            <div
              style={{
                display: activeMode === 'camera' ? 'flex' : 'none',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.85rem',
                width: '100%',
              }}
            >
              {cameraError ? (
                <div
                  style={{
                    width: '100%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    textAlign: 'center',
                    color: '#f87171',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <CameraOff size={32} />
                  <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.5 }}>{cameraError}</p>
                  <button
                    type="button"
                    onClick={handleSwitchToManual}
                    className="btn-primary"
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                  >
                    {isAr ? 'الانتقال للإدخال اليدوي' : 'Switch to Manual Code'}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    background: '#000',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: '260px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid rgba(255, 184, 0, 0.35)',
                  }}
                >
                  <div id="qr-reader-region" style={{ width: '100%' }} />

                  {isProcessing && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        color: '#ffd54f',
                        zIndex: 10,
                      }}
                    >
                      <Loader2 size={32} className="animate-spin" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        {isAr ? 'جاري تسجيل حضور العضو...' : 'Recording check-in...'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Flip camera button */}
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

              <p style={{ color: '#888', fontSize: '0.8rem', margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
                {isAr
                  ? 'وجّه الكاميرا نحو رمز QR الخاص بالعضو أو بطاقة العضوية لتسجيل الحضور فوراً'
                  : 'Point camera at member QR code to record attendance'}
              </p>
            </div>

            {/* Mode 2: Manual Code Fallback */}
            <div style={{ display: activeMode === 'manual' ? 'block' : 'none', width: '100%' }}>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <FormField
                  label={isAr ? 'كود العضو أو الرقم القومي' : 'Member Code or National ID'}
                  hint={isAr ? 'أدخل كود العضو (7 أرقام من بطاقته)، أو رقمه القومي' : 'Enter 7-digit member code or national ID'}
                  required
                >
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder={isAr ? 'مثال: 2026001 أو الرقم القومي' : 'e.g. 2026001'}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1.5px solid rgba(255, 184, 0, 0.4)',
                      color: '#ffd54f',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      letterSpacing: '0.1rem',
                      textAlign: 'center',
                    }}
                    required
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={isProcessing || !manualCode.trim() || !selectedSessionId}
                  className="btn-primary"
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{isAr ? 'جاري تسجيل الحضور...' : 'Checking in...'}</span>
                    </>
                  ) : (
                    <span>{isAr ? 'تأكيد تسجيل الحضور' : 'Submit Check-in'}</span>
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
