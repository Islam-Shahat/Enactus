import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../components/dashboard/Toast';
import { Settings as SettingsIcon, ToggleLeft, ToggleRight, Sparkles, Clock, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const canManage = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president']);

  // Fetch current applications_open setting
  const { data: setting, isLoading } = useQuery({
    queryKey: ['dashboard', 'setting', 'applications_open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'applications_open')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isOpen = Boolean(setting?.value === true || setting?.value === 'true');

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async (nextValue) => {
      // First try update
      const { data: updateData, error: updateErr } = await supabase
        .from('settings')
        .update({
          value: nextValue,
          is_public: true,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'applications_open')
        .select();

      if (updateErr) throw updateErr;

      // If no row existed, insert it
      if (!updateData || updateData.length === 0) {
        const { error: insertErr } = await supabase.from('settings').insert([
          {
            key: 'applications_open',
            value: nextValue,
            is_public: true,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          },
        ]);
        if (insertErr) throw insertErr;
      }
    },
    onSuccess: (_, nextVal) => {
      toast.show(
        nextVal
          ? isAr
            ? 'تم فتح باب التقديم بنجاح'
            : 'Applications opened successfully'
          : isAr
          ? 'تم إغلاق باب التقديم'
          : 'Applications closed successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'setting', 'applications_open'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'applications-open'] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل تعديل الإعداد' : 'Failed to update setting'), 'error');
    },
  });

  const handleToggle = () => {
    if (!canManage) {
      toast.show(isAr ? 'غير مصرح لك بتغيير هذه الإعدادات' : 'Unauthorized to change this setting', 'error');
      return;
    }
    toggleMutation.mutate(!isOpen);
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={24} color="#ffd54f" />
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffd54f', margin: 0 }}>
            {isAr ? 'إعدادات المنصة' : 'Platform Settings'}
          </h1>
        </div>
        <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
          {isAr
            ? 'التحكم في بوابات النظام وحالة التقديم (متاح لمسؤولي الموارد البشرية ورئاسة الفريق)'
            : 'Manage platform feature flags and recruitment status'}
        </p>
      </div>

      {/* Recruitment Gate Setting Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 184, 0, 0.25)',
          borderRadius: '14px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#ffd54f" />
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                {isAr ? 'فتح باب التقديم والانضمام (Recruitment Gate)' : 'Recruitment Application Gate'}
              </h3>
            </div>
            <p style={{ margin: '0.35rem 0 0', color: '#aaa', fontSize: '0.86rem', maxWidth: '600px' }}>
              {isAr
                ? 'عند التفعيل، يمكن للمتقدمين تقديم طلبات الانضمام عبر الموقع العام. عند الإغلاق، تظهر رسالة إغلاق باب التقديم وتمنع الـ Edge Function استلام أي طلبات جديدة.'
                : 'When enabled, public visitors can submit recruitment applications. When disabled, the form shows closed state and the backend rejects submissions.'}
            </p>
          </div>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={isLoading || toggleMutation.isPending || !canManage}
            style={{
              background: isOpen ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${isOpen ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '30px',
              padding: '0.55rem 1.25rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: canManage ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              color: isOpen ? '#4ade80' : '#f87171',
              fontWeight: 700,
              fontSize: '0.92rem',
            }}
          >
            {isOpen ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
            <span>
              {isLoading
                ? isAr
                  ? 'جاري التحميل...'
                  : 'Loading...'
                : toggleMutation.isPending
                ? isAr
                  ? 'جاري التعديل...'
                  : 'Updating...'
                : isOpen
                ? isAr
                  ? 'باب التقديم مفتوح'
                  : 'Applications OPEN'
                : isAr
                ? 'باب التقديم مغلق'
                : 'Applications CLOSED'}
            </span>
          </button>
        </div>

        {/* Setting Metadata Footer */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 184, 0, 0.1)',
            paddingTop: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.78rem',
            color: '#888',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={14} />
            <span>
              {isAr ? 'آخر تحديث: ' : 'Last updated: '}
              {setting?.updated_at
                ? new Date(setting.updated_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')
                : '—'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={14} color="#ffd54f" />
            <span>
              {isAr
                ? 'الصلاحيات المطلوبة: HR Admin أو President أو Super Admin'
                : 'Required: HR Admin, President, or Super Admin'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

