import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';
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
} from 'lucide-react';

export default function QrScannerModal({
  isOpen,
  onClose,
  sessions = [], // active/upcoming sessions for manual code select
  onCheckinSuccess,
}) {
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();

  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'manual'
  const [cameraError, setCameraError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkinResult, setCheckinResult] = useState(null);

  // Manual fallback inputs
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [manualCode, setManualCode] = useState('');

  const scannerRef = useRef(null);

  // Stop camera media tracks and safely stop scanner instance
  const stopCamera = useCallback(async () => {
    // 1. Stop video stream tracks directly to turn off camera immediately
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

    // 2. Stop Html5Qrcode instance
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (typeof scanner.getState === 'function') {
          const state = scanner.getState();
          // State 2: SCANNING, State 3: PAUSED
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
      if (sessions.length > 0) {
        setSelectedSessionId((prev) => prev || sessions[0].id);
      }
    } else {
      stopCamera();
    }
  }, [isOpen, sessions, stopCamera]);

  // Execute check-in via Edge Function
  const executeCheckin = async (payload) => {
    try {
      setIsProcessing(true);
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession) {
        throw new Error(isAr ? 'جلسة المستخدم منتهية. يرجى تسجيل الدخول مجدداً.' : 'User session expired.');
      }

      let res;
      try {
        res = await fetch(
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
      } catch (fetchErr) {
        throw new Error(
          isAr
            ? 'تعذر الاتصال بخدمة التحقق من الحضور. يرجى التأكد من اتصالك بالإنترنت.'
            : 'Could not reach attendance check-in service.'
        );
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || (isAr ? 'فشل تسجيل الحضور' : 'Check-in failed'));
      }

      setCheckinResult(data);
      toast.show(
        isAr
          ? `تم تسجيل الحضور بنجاح (${data.status === 'late' ? 'متأخر' : 'حاضر'})`
          : `Check-in successful (${data.status})`,
        'success'
      );

      if (onCheckinSuccess) onCheckinSuccess(data);
    } catch (err) {
      toast.show(err.message, 'error');
      setTimeout(() => {
        setIsProcessing(false);
      }, 2000);
    } finally {
      if (payload.code) {
        setIsProcessing(false);
      }
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

    // Delay start slightly to ensure DOM element is mounted
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
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isProcessingRef.current) return;
            stopCamera();
            executeCheckinRef.current({ token: decodedText });
          },
          () => {
            // Frame scan miss, normal behavior
          }
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
              ? 'تعذر تشغيل الكاميرا. يمكنك إدخال الرمز المكون من 8 أحرف يدوياً.'
              : 'Failed to access camera. You can enter the 8-character code manually.'
          );
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, activeMode, checkinResult, isAr, stopCamera]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!selectedSessionId) {
      toast.show(isAr ? 'يرجى اختيار الجلسة' : 'Please select a session', 'error');
      return;
    }
    if (!manualCode.trim() || manualCode.trim().length !== 8) {
      toast.show(isAr ? 'الكود يجب أن يتكون من 8 خانات' : 'Code must be 8 characters', 'error');
      return;
    }

    executeCheckin({
      session_id: selectedSessionId,
      code: manualCode.trim().toUpperCase(),
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

        {/* Success View */}
        {checkinResult ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem 1rem',
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
                background: 'rgba(34, 197, 94, 0.15)',
                border: '2px solid rgba(34, 197, 94, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4ade80',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h4 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 800 }}>
                {isAr ? 'تم تأكيد تسجيل الحضور!' : 'Attendance Confirmed!'}
              </h4>
              <p style={{ color: '#aaa', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
                {checkinResult.session_title}
              </p>
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

            <button
              type="button"
              onClick={handleClose}
              className="btn-primary"
              style={{ marginTop: '1rem', padding: '0.65rem 1.5rem', borderRadius: '8px' }}
            >
              {isAr ? 'إغلاق النافذة' : 'Close'}
            </button>
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

            {/* Mode 1: Camera Scanner (Kept mounted to prevent DOM destruction during scan) */}
            <div
              style={{
                display: activeMode === 'camera' ? 'flex' : 'none',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
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
                      }}
                    >
                      <Loader2 size={32} className="animate-spin" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        {isAr ? 'جاري التحقق من الكود...' : 'Verifying code...'}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <p style={{ color: '#888', fontSize: '0.78rem', margin: 0, textAlign: 'center' }}>
                {isAr
                  ? 'وجّه الكاميرا نحو الكود الدوار المعروض في شاشة الجلسة'
                  : 'Point your camera at the rotating QR on the session display'}
              </p>
            </div>

            {/* Mode 2: Manual 8-Character Code Fallback */}
            <div style={{ display: activeMode === 'manual' ? 'block' : 'none', width: '100%' }}>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <FormField label={isAr ? 'الجلسة الحالية' : 'Attendance Session'} required>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      color: '#fff',
                    }}
                    required
                  >
                    <option value="" style={{ background: '#181920', color: '#888' }}>
                      {isAr ? '-- اختر الجلسة --' : '-- Select Session --'}
                    </option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id} style={{ background: '#181920', color: '#fff' }}>
                        {s.title} ({s.starts_at ? new Date(s.starts_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : ''})
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label={isAr ? 'رمز الحضور (8 خانات)' : '8-Character Session Code'}
                  hint={isAr ? 'الرمز المكون من 8 أحرف وأرقام معروض تحت QR Code' : 'Displayed below the rotating QR'}
                  required
                >
                  <input
                    type="text"
                    maxLength={8}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="E.G. A2BC3D4E"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      color: '#ffd54f',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      letterSpacing: '0.2rem',
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
                      <span>{isAr ? 'جاري التسجيل...' : 'Checking in...'}</span>
                    </>
                  ) : (
                    <span>{isAr ? 'تأكيد الحضور بالكود' : 'Submit Check-in Code'}</span>
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
