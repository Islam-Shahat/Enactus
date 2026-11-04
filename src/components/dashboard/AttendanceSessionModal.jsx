import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import FormField from './FormField';
import { useToast } from './Toast';
import { Calendar, Save, X, Loader2 } from 'lucide-react';

export default function AttendanceSessionModal({
  isOpen,
  onClose,
  sessionToEdit = null,
  activeSeasonId = null,
  committees = [],
}) {
  const { user, roles, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const isHrOrExec = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president', 'coordinator', 'oc_admin']);
  const headRoleObj = roles.find((r) => r.role === 'committee_head');
  const headCommitteeId = headRoleObj?.committee_id;

  const selectableCommittees = isHrOrExec
    ? committees
    : committees.filter((c) => c.id === headCommitteeId);

  // Helper to get formatted local datetime string for input defaultValue
  const getDefaultStartsAt = () => {
    const now = new Date();
    // Default to today rounded to next full hour
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const getDefaultEndsAt = () => {
    const later = new Date();
    later.setHours(later.getHours() + 3, 0, 0, 0);
    const tzOffset = later.getTimezoneOffset() * 60000;
    return new Date(later.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    title: '',
    type: 'meeting',
    committee_id: '',
    location: '',
    starts_at: '',
    ends_at: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    if (sessionToEdit) {
      const sTzOffset = sessionToEdit.starts_at ? new Date(sessionToEdit.starts_at).getTimezoneOffset() * 60000 : 0;
      const eTzOffset = sessionToEdit.ends_at ? new Date(sessionToEdit.ends_at).getTimezoneOffset() * 60000 : 0;

      setFormData({
        title: sessionToEdit.title || '',
        type: sessionToEdit.type || 'meeting',
        committee_id: sessionToEdit.committee_id || '',
        location: sessionToEdit.location || '',
        starts_at: sessionToEdit.starts_at
          ? new Date(new Date(sessionToEdit.starts_at).getTime() - sTzOffset).toISOString().slice(0, 16)
          : '',
        ends_at: sessionToEdit.ends_at
          ? new Date(new Date(sessionToEdit.ends_at).getTime() - eTzOffset).toISOString().slice(0, 16)
          : '',
      });
    } else {
      setFormData({
        title: '',
        type: 'meeting',
        committee_id: isHrOrExec ? '' : headCommitteeId || '',
        location: '',
        starts_at: getDefaultStartsAt(),
        ends_at: getDefaultEndsAt(),
      });
    }
  }, [sessionToEdit, isOpen, isHrOrExec, headCommitteeId]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (sessionToEdit) {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionToEdit.id)
          .select();
        if (error) throw error;
        return data?.[0] || payload;
      } else {
        // 1. Robust season resolution: prioritize activeSeasonId, fallback to DB query
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
          throw new Error(
            isAr
              ? 'لا يوجد موسم مسجل في النظام. يرجى تفعيل موسم أولاً.'
              : 'No season found in database. Please activate a season first.'
          );
        }

        // 2. Permission enforcement on committee
        let finalCommitteeId = payload.committee_id;
        if (!isHrOrExec) {
          finalCommitteeId = headCommitteeId || null;
          if (!finalCommitteeId) {
            throw new Error(
              isAr
                ? 'غير مصرح لك بإنشاء جلسة عامة لعدم وجود لجنة مرتبطة بك'
                : 'Unauthorized: No assigned committee for this role'
            );
          }
        }

        // 3. Creator ID check (ensure creator exists in public.profiles to satisfy FK)
        let validCreatorId = null;
        if (user?.id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();
          if (prof?.id) {
            validCreatorId = prof.id;
          }
        }

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

        const { data, error } = await supabase
          .from('attendance_sessions')
          .insert([insertPayload])
          .select();

        if (error) throw error;
        return data?.[0] || insertPayload;
      }
    },
    onSuccess: () => {
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
      onClose();
    },
    onError: (err) => {
      console.error('[AttendanceSessionModal error]:', err);
      let errMsg = err.message || (isAr ? 'فشل حفظ الجلسة' : 'Failed to save session');
      if (err.code === '42501' || err.message?.includes('row-level security') || err.message?.includes('policy')) {
        errMsg = isAr
          ? 'ليس لديك صلاحية لإنشاء أو تعديل هذه الجلسة'
          : 'Permission denied: You cannot create or modify this session';
      }
      toast.show(errMsg, 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.show(isAr ? 'عنوان الجلسة مطلوب' : 'Session title is required', 'error');
      return;
    }

    if (!formData.starts_at) {
      toast.show(isAr ? 'موعد بدء الجلسة مطلوب' : 'Start time is required', 'error');
      return;
    }

    const startDate = new Date(formData.starts_at);
    if (isNaN(startDate.getTime())) {
      toast.show(isAr ? 'صيغة موعد البدء غير صحيحة' : 'Invalid start time', 'error');
      return;
    }

    let endDate = null;
    if (formData.ends_at) {
      endDate = new Date(formData.ends_at);
      if (isNaN(endDate.getTime())) {
        toast.show(isAr ? 'صيغة موعد الانتهاء غير صحيحة' : 'Invalid end time', 'error');
        return;
      }
      if (endDate <= startDate) {
        toast.show(
          isAr
            ? 'موعد الانتهاء المتوقع يجب أن يكون بعد موعد البدء'
            : 'Expected end time must be after start time',
          'error'
        );
        return;
      }
    }

    const payload = {
      title: formData.title.trim(),
      type: formData.type,
      committee_id: formData.committee_id || null,
      location: formData.location.trim() || null,
      starts_at: startDate.toISOString(),
      ends_at: endDate ? endDate.toISOString() : null,
    };

    saveMutation.mutate(payload);
  };

  if (!isOpen) return null;

  // Theming constants
  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    background: isDark ? '#141620' : '#ffffff',
    border: isDark ? '1px solid rgba(255, 184, 0, 0.35)' : '1px solid rgba(184, 120, 0, 0.4)',
    color: isDark ? '#ffffff' : '#0f111a',
    fontSize: '0.92rem',
    outline: 'none',
    boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
    colorScheme: isDark ? 'dark' : 'light',
  };

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
          padding: '1.75rem',
          maxWidth: '540px',
          width: '100%',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.85)' : '0 20px 50px rgba(184, 120, 0, 0.15)',
          background: isDark
            ? 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))'
            : '#ffffff',
          color: isDark ? '#ffffff' : '#0f111a',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
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
              <Calendar size={20} />
            </div>
            <h3
              className="modal-header-title"
              style={{
                margin: 0,
                color: titleColor,
                fontSize: '1.25rem',
                fontWeight: 800,
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
          </div>
          <button
            type="button"
            onClick={onClose}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <FormField label={isAr ? 'عنوان الجلسة / الاجتماع' : 'Session Title'} required>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={isAr ? 'مثال: الاجتماع العام الترحيبي' : 'e.g. General Orientation Meeting'}
              style={inputStyle}
              required
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'نوع الجلسة' : 'Session Type'} required>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={inputStyle}
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

          <FormField label={isAr ? 'المكان / القاعة' : 'Location'}>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={isAr ? 'مثال: قاعة المؤتمرات الكبرى' : 'e.g. Main Conference Hall'}
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label={isAr ? 'موعد البدء' : 'Start Time'} required>
              <input
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                style={inputStyle}
                required
              />
            </FormField>

            <FormField label={isAr ? 'موعد الانتهاء المتوقع' : 'Expected End Time'}>
              <input
                type="datetime-local"
                value={formData.ends_at}
                onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                style={inputStyle}
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.8rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending}
              className="btn-secondary"
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '10px',
                fontWeight: 600,
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
                fontWeight: 700,
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
