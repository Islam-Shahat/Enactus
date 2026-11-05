import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import FormField from './FormField';
import { useToast } from './Toast';
import { Calendar, Save, X, Loader2, AlertCircle, Sparkles } from 'lucide-react';

// Safe helper to format a local Date into YYYY-MM-DDTHH:mm string
function formatLocalDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export default function AttendanceSessionModal({
  isOpen,
  onClose,
  onSuccess = null,
  sessionToEdit = null,
  activeSeasonId = null,
  committees = [],
}) {
  const { user, profile, roles, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();
  const titleInputRef = useRef(null);

  const isHrOrExec = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president', 'coordinator', 'oc_admin']);
  const headRoleObj = roles.find((r) => r.role === 'committee_head');
  const headCommitteeId = headRoleObj?.committee_id;

  const selectableCommittees = useMemo(
    () => (isHrOrExec ? committees : committees.filter((c) => c.id === headCommitteeId)),
    [isHrOrExec, committees, headCommitteeId]
  );

  // Helper to get formatted local datetime string for input defaultValue
  const getDefaultStartsAt = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return formatLocalDateTime(now);
  };

  const getDefaultEndsAt = () => {
    const later = new Date();
    later.setMinutes(0, 0, 0);
    later.setHours(later.getHours() + 3);
    return formatLocalDateTime(later);
  };

  const [formData, setFormData] = useState({
    title: '',
    type: 'meeting',
    committee_id: '',
    location: '',
    starts_at: '',
    ends_at: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});

    if (sessionToEdit) {
      const sDate = sessionToEdit.starts_at ? new Date(sessionToEdit.starts_at) : null;
      const eDate = sessionToEdit.ends_at ? new Date(sessionToEdit.ends_at) : null;

      setFormData({
        title: sessionToEdit.title || '',
        type: sessionToEdit.type || 'meeting',
        committee_id: sessionToEdit.committee_id || '',
        location: sessionToEdit.location || '',
        starts_at: sDate && !isNaN(sDate.getTime()) ? formatLocalDateTime(sDate) : '',
        ends_at: eDate && !isNaN(eDate.getTime()) ? formatLocalDateTime(eDate) : '',
      });
    } else {
      setFormData({
        title: '',
        type: 'meeting',
        committee_id: isHrOrExec ? '' : headCommitteeId || selectableCommittees[0]?.id || '',
        location: '',
        starts_at: getDefaultStartsAt(),
        ends_at: getDefaultEndsAt(),
      });
    }

    // Auto-focus title input when opening
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, [sessionToEdit, isOpen, isHrOrExec, headCommitteeId, selectableCommittees]);

  // Quick suggestion chips based on session type
  const quickTitleSuggestions = {
    meeting: isAr
      ? ['الاجتماع العام الترحيبي', 'اجتماع متابعة أسبوعي', 'اجتماع تنسيقي للجنة', 'مناقشة خطة العمل']
      : ['General Orientation Meeting', 'Weekly Follow-up Meeting', 'Committee Coordination', 'Action Plan Discussion'],
    workshop: isAr
      ? ['ورشة عمل المهارات التقنية', 'ورشة مهارات العرض والإلقاء', 'ورشة إدارة الوقت والمهام']
      : ['Technical Skills Workshop', 'Presentation Skills Workshop', 'Time Management Workshop'],
    training: isAr
      ? ['تدريب أساسيات العمل الطلابي', 'جلسة تدريب وبناء القدرات', 'تدريب القيادة والتواصل']
      : ['Student Activity Foundations', 'Capacity Building Training', 'Leadership & Communication'],
    event: isAr
      ? ['الفعالية الافتتاحية للموسم', 'يوم الإنجازات والأنشطة', 'الحفل الختامي والتكريم']
      : ['Season Opening Event', 'Achievements & Activities Day', 'Closing Ceremony & Recognition'],
  };

  const handleApplySuggestion = (suggestionTitle) => {
    setFormData((prev) => ({ ...prev, title: suggestionTitle }));
    setErrors((prev) => ({ ...prev, title: null }));
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (sessionToEdit) {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .update({
            title: payload.title,
            type: payload.type,
            committee_id: payload.committee_id || null,
            location: payload.location,
            starts_at: payload.starts_at,
            ends_at: payload.ends_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionToEdit.id)
          .select();
        if (error) {
          console.error('[AttendanceSessionModal update error]:', error);
          throw error;
        }
        return data?.[0] || payload;
      } else {
        // 1. Robust season resolution: prioritize activeSeasonId, fallback to DB queries
        let resolvedSeasonId = activeSeasonId;

        if (!resolvedSeasonId) {
          const { data: activeS } = await supabase
            .from('seasons')
            .select('id, is_active')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          resolvedSeasonId = activeS?.id;
        }

        if (!resolvedSeasonId) {
          const { data: latestS } = await supabase
            .from('seasons')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          resolvedSeasonId = latestS?.id;
        }

        if (!resolvedSeasonId) {
          const { data: anySeason } = await supabase
            .from('seasons')
            .select('id')
            .limit(1)
            .maybeSingle();
          resolvedSeasonId = anySeason?.id;
        }

        // Auto-seed season 2026/2027 if table is completely empty and user is staff
        if (!resolvedSeasonId && (isSuperAdmin || hasRole(['president', 'vice_president', 'hr_admin']))) {
          const { data: newSeason } = await supabase
            .from('seasons')
            .insert([
              {
                name: '2026/2027',
                starts_on: '2026-09-01',
                ends_on: '2027-06-30',
                is_active: true,
              },
            ])
            .select('id')
            .maybeSingle();
          if (newSeason?.id) {
            resolvedSeasonId = newSeason.id;
          }
        }

        if (!resolvedSeasonId) {
          throw new Error(
            isAr
              ? 'لا يوجد موسم مفعل مسجل في النظام. يرجى تفعيل موسم أولاً من صفحة المواسم.'
              : 'No active season found in database. Please activate a season first.'
          );
        }

        // 2. Permission enforcement on committee
        let finalCommitteeId = payload.committee_id;
        if (!isHrOrExec) {
          finalCommitteeId = headCommitteeId || selectableCommittees[0]?.id || null;
          if (!finalCommitteeId) {
            throw new Error(
              isAr
                ? 'غير مصرح لك بإنشاء جلسة عامة لعدم وجود لجنة مرتبطة بك'
                : 'Unauthorized: No assigned committee for this role'
            );
          }
        }

        // 3. Creator ID (safe resolution with foreign key fallback)
        const validCreatorId = profile?.id || user?.id || null;

        const insertPayload = {
          title: payload.title,
          type: payload.type,
          committee_id: finalCommitteeId || null,
          location: payload.location,
          starts_at: payload.starts_at,
          ends_at: payload.ends_at,
          season_id: resolvedSeasonId,
          created_by: validCreatorId,
          check_in_open: false,
        };

        let { data, error } = await supabase
          .from('attendance_sessions')
          .insert([insertPayload])
          .select();

        // If FK on created_by fails, retry with created_by: null
        if (error && error.code === '23503' && error.message?.includes('created_by')) {
          console.warn('[AttendanceSessionModal] created_by FK failed, retrying with null...');
          const retryPayload = { ...insertPayload, created_by: null };
          const retryRes = await supabase
            .from('attendance_sessions')
            .insert([retryPayload])
            .select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('[AttendanceSessionModal insert error]:', error);
          throw error;
        }
        return data?.[0] || insertPayload;
      }
    },
    onSuccess: (savedSession) => {
      toast.show(
        sessionToEdit
          ? isAr
            ? 'تم حفظ تعديل الجلسة بنجاح'
            : 'Session updated successfully'
          : isAr
          ? 'تم إنشاء جلسة الحضور بنجاح'
          : 'Attendance session created successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'upcoming_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'my_attendance'] });
      if (onSuccess) {
        onSuccess(savedSession);
      } else {
        onClose();
      }
    },
    onError: (err) => {
      console.error('[AttendanceSessionModal error]:', err);
      let errMsg = err.message || (isAr ? 'فشل حفظ الجلسة' : 'Failed to save session');
      if (err.code === '42501' || err.message?.includes('row-level security') || err.message?.includes('policy')) {
        errMsg = isAr
          ? 'ليس لديك صلاحية لإنشاء أو تعديل هذه الجلسة'
          : 'Permission denied: You cannot create or modify this session';
      } else if (err.code === '23503' && err.message?.includes('season_id')) {
        errMsg = isAr
          ? 'الموسم المحدد غير صالح أو غير موجود'
          : 'Invalid or missing active season';
      }
      toast.show(errMsg, 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    const trimmedTitle = formData.title?.trim();
    if (!trimmedTitle) {
      newErrors.title = isAr ? 'عنوان الجلسة مطلوب، يرجى كتابة عنوان' : 'Session title is required';
      titleInputRef.current?.focus();
    }

    if (!formData.starts_at) {
      newErrors.starts_at = isAr ? 'موعد بدء الجلسة مطلوب' : 'Start time is required';
    }

    const startDate = formData.starts_at ? new Date(formData.starts_at) : null;
    if (formData.starts_at && (!startDate || isNaN(startDate.getTime()))) {
      newErrors.starts_at = isAr ? 'صيغة موعد البدء غير صحيحة' : 'Invalid start time';
    }

    let endDate = null;
    if (formData.ends_at) {
      endDate = new Date(formData.ends_at);
      if (isNaN(endDate.getTime())) {
        newErrors.ends_at = isAr ? 'صيغة موعد الانتهاء غير صحيحة' : 'Invalid end time';
      } else if (startDate && endDate <= startDate) {
        newErrors.ends_at = isAr
          ? 'موعد الانتهاء المتوقع يجب أن يكون بعد موعد البدء'
          : 'Expected end time must be after start time';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.show(firstError, 'error');
      return;
    }

    setErrors({});

    const payload = {
      title: trimmedTitle,
      type: formData.type,
      committee_id: formData.committee_id || null,
      location: formData.location?.trim() || null,
      starts_at: startDate.toISOString(),
      ends_at: endDate ? endDate.toISOString() : null,
    };

    saveMutation.mutate(payload);
  };

  if (!isOpen) return null;

  // Theming constants
  const inputStyle = {
    width: '100%',
    padding: '0.7rem 0.9rem',
    borderRadius: '10px',
    background: isDark ? '#141620' : '#ffffff',
    border: isDark ? '1px solid rgba(255, 184, 0, 0.35)' : '1px solid rgba(184, 120, 0, 0.4)',
    color: isDark ? '#ffffff' : '#0f111a',
    fontSize: '0.92rem',
    outline: 'none',
    boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
    colorScheme: isDark ? 'dark' : 'light',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  };

  const errorInputStyle = {
    ...inputStyle,
    borderColor: '#ef4444',
    boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.25)',
  };

  const titleColor = isDark ? '#ffd54f' : '#b45309';
  const activeSuggestions = quickTitleSuggestions[formData.type] || quickTitleSuggestions.meeting;

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
          padding: '1.75rem',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.85)' : '0 20px 50px rgba(184, 120, 0, 0.15)',
          background: isDark
            ? 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))'
            : '#ffffff',
          color: isDark ? '#ffffff' : '#0f111a',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(217, 119, 6, 0.12)',
                border: isDark ? '1px solid rgba(255, 184, 0, 0.3)' : '1px solid rgba(217, 119, 6, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: titleColor,
              }}
            >
              <Calendar size={22} />
            </div>
            <div>
              <h3
                className="session-modal-title modal-header-title"
                style={{
                  margin: 0,
                  color: titleColor,
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                }}
              >
                {sessionToEdit
                  ? isAr
                    ? 'تعديل جلسة الحضور'
                    : 'Edit Attendance Session'
                  : isAr
                  ? 'إنشاء جلسة حضور جديدة'
                  : 'Create Attendance Session'}
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: isDark ? '#9ca3af' : '#64748b' }}>
                {isAr
                  ? 'حدد تفاصيل الجلسة وموعدها لتمكين تسجيل حضور الأعضاء عبر الـ QR'
                  : 'Specify session details to enable member QR check-in'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#a0a0b2' : '#6b7280',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Title Field with Quick Suggestion Chips */}
          <FormField
            label={isAr ? 'عنوان الجلسة / الاجتماع' : 'Session Title'}
            required
            error={errors.title}
          >
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: null });
              }}
              placeholder={isAr ? 'اكتب عنوان الجلسة هنا (مثال: الاجتماع العام)' : 'Enter session title here...'}
              style={errors.title ? errorInputStyle : inputStyle}
              className="session-modal-input"
            />
            {/* Quick Suggestions Chips */}
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: isDark ? '#d4af37' : '#92400e', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                <Sparkles size={12} />
                {isAr ? 'اقتراحات سريعة:' : 'Quick suggestions:'}
              </span>
              {activeSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplySuggestion(suggestion)}
                  style={{
                    background: isDark ? 'rgba(255, 184, 0, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                    border: isDark ? '1px solid rgba(255, 184, 0, 0.25)' : '1px solid rgba(217, 119, 6, 0.25)',
                    color: isDark ? '#fef08a' : '#854d0e',
                    borderRadius: '6px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? 'rgba(255, 184, 0, 0.2)' : 'rgba(217, 119, 6, 0.16)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? 'rgba(255, 184, 0, 0.08)' : 'rgba(217, 119, 6, 0.08)';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </FormField>

          {/* Type & Committee Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'نوع الجلسة' : 'Session Type'} required>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={inputStyle}
                className="session-modal-input"
              >
                <option value="meeting" style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#fff' : '#111' }}>
                  {isAr ? 'اجتماع (Meeting)' : 'Meeting'}
                </option>
                <option value="workshop" style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#fff' : '#111' }}>
                  {isAr ? 'ورشة عمل (Workshop)' : 'Workshop'}
                </option>
                <option value="training" style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#fff' : '#111' }}>
                  {isAr ? 'تدريب (Training)' : 'Training'}
                </option>
                <option value="event" style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#fff' : '#111' }}>
                  {isAr ? 'فعالية (Event)' : 'Event'}
                </option>
              </select>
            </FormField>

            <FormField label={isAr ? 'اللجنة التابعة' : 'Committee'}>
              <select
                value={formData.committee_id}
                onChange={(e) => setFormData({ ...formData, committee_id: e.target.value })}
                disabled={!isHrOrExec && Boolean(headCommitteeId)}
                style={inputStyle}
                className="session-modal-input"
              >
                {isHrOrExec && (
                  <option value="" style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#ffd54f' : '#b45309', fontWeight: 'bold' }}>
                    {isAr ? '-- جلسة عامة للجميع (General) --' : '-- General (All Members) --'}
                  </option>
                )}
                {selectableCommittees.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    style={{ background: isDark ? '#181920' : '#ffffff', color: isDark ? '#fff' : '#111' }}
                  >
                    {isAr ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Location Field */}
          <FormField label={isAr ? 'المكان / القاعة' : 'Location'}>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={isAr ? 'مثال: قاعة المؤتمرات الكبرى أو عبر الإنترنت' : 'e.g. Main Conference Hall or Online'}
              style={inputStyle}
              className="session-modal-input"
            />
          </FormField>

          {/* Start and End Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'موعد البدء' : 'Start Time'} required error={errors.starts_at}>
              <input
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => {
                  setFormData({ ...formData, starts_at: e.target.value });
                  if (errors.starts_at) setErrors({ ...errors, starts_at: null });
                }}
                style={errors.starts_at ? errorInputStyle : inputStyle}
                className="session-modal-input"
              />
            </FormField>

            <FormField label={isAr ? 'موعد الانتهاء المتوقع' : 'Expected End Time'} error={errors.ends_at}>
              <input
                type="datetime-local"
                value={formData.ends_at}
                onChange={(e) => {
                  setFormData({ ...formData, ends_at: e.target.value });
                  if (errors.ends_at) setErrors({ ...errors, ends_at: null });
                }}
                style={errors.ends_at ? errorInputStyle : inputStyle}
                className="session-modal-input"
              />
            </FormField>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.6rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending}
              className="btn-secondary"
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '10px',
                fontWeight: 700,
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                color: isDark ? '#ffffff' : '#1e293b',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                cursor: 'pointer',
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-primary"
              style={{
                flex: 2,
                padding: '0.75rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #ffd752 0%, #ffb800 50%, #c47c00 100%)',
                color: '#08080a',
                border: 'none',
                boxShadow: '0 4px 15px rgba(255, 184, 0, 0.35)',
                cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: saveMutation.isPending ? 0.7 : 1,
              }}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>
                    {sessionToEdit
                      ? isAr
                        ? 'حفظ التعديلات'
                        : 'Save Changes'
                      : isAr
                      ? 'إنشاء الجلسة'
                      : 'Create Session'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
