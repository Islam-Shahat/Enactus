import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import FormField from '../../components/dashboard/FormField';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import { useToast } from '../../components/dashboard/Toast';
import { CalendarRange, Plus, CheckCircle, ArrowRightLeft, Users, Loader2 } from 'lucide-react';

export default function SeasonPage() {
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [seasonToActivate, setSeasonToActivate] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    starts_on: '',
    ends_on: '',
    is_active: false,
  });

  const [rolloverData, setRolloverData] = useState({
    name: '',
    starts_on: '',
    ends_on: '',
    moveAlumni: true,
  });

  // Query all seasons
  const { data: seasons = [], isLoading, error } = useQuery({
    queryKey: ['dashboard', 'all-seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('starts_on', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Create Season Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.is_active) {
        // Deactivate all first to satisfy the single active season index
        await supabase.from('seasons').update({ is_active: false }).eq('is_active', true);
      }
      const { data, error } = await supabase.from('seasons').insert([payload]).select();
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      toast.show(isAr ? 'تمت إضافة الموسم بنجاح' : 'Season created successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'all-seasons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'active-season'] });
      setIsCreateOpen(false);
      setFormData({ name: '', starts_on: '', ends_on: '', is_active: false });
    },
    onError: (err) => {
      toast.show(err.message || 'Failed to create season', 'error');
    },
  });

  // Activate Season Mutation
  const activateMutation = useMutation({
    mutationFn: async (targetId) => {
      // 1. Deactivate others
      const { error: deactErr } = await supabase
        .from('seasons')
        .update({ is_active: false })
        .neq('id', targetId);
      if (deactErr) throw deactErr;

      // 2. Activate target
      const { error: actErr } = await supabase
        .from('seasons')
        .update({ is_active: true })
        .eq('id', targetId);
      if (actErr) throw actErr;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم تفعيل الموسم المحدد بنجاح' : 'Season activated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'all-seasons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'active-season'] });
      setSeasonToActivate(null);
    },
    onError: (err) => {
      toast.show(err.message || 'Failed to activate season', 'error');
    },
  });

  // Season Rollover Mutation
  const rolloverMutation = useMutation({
    mutationFn: async (payload) => {
      // 1. Move active memberships of current active season to 'alumni'
      if (payload.moveAlumni) {
        const activeS = seasons.find((s) => s.is_active);
        if (activeS) {
          const { error: memErr } = await supabase
            .from('memberships')
            .update({ status: 'alumni' })
            .eq('season_id', activeS.id)
            .eq('status', 'active');
          if (memErr) throw memErr;
        }
      }

      // 2. Deactivate current active seasons
      await supabase.from('seasons').update({ is_active: false }).eq('is_active', true);

      // 3. Insert and activate new season
      const { data, error } = await supabase
        .from('seasons')
        .insert([
          {
            name: payload.name.trim(),
            starts_on: payload.starts_on,
            ends_on: payload.ends_on,
            is_active: true,
          },
        ])
        .select();
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      toast.show(
        isAr ? 'تم تدوير الموسم وتفعيل الموسم الجديد بنجاح' : 'Season rollover completed successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'all-seasons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'active-season'] });
      setIsRolloverOpen(false);
      setRolloverData({ name: '', starts_on: '', ends_on: '', moveAlumni: true });
    },
    onError: (err) => {
      toast.show(err.message || 'Failed to execute season rollover', 'error');
    },
  });

  const columns = [
    {
      key: 'name',
      label: isAr ? 'الموسم' : 'Season',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CalendarRange size={18} color="#ffd54f" />
          <span style={{ fontWeight: 700, color: isDark ? '#fff' : '#0f111a', fontSize: '0.95rem' }}>
            {row.name}
          </span>
        </div>
      ),
    },
    {
      key: 'dates',
      label: isAr ? 'الفترة الزمنية' : 'Duration',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: isDark ? '#a0a0b2' : '#6b7280' }}>
          {row.starts_on} → {row.ends_on}
        </span>
      ),
    },
    {
      key: 'status',
      label: isAr ? 'الحالة' : 'Status',
      render: (row) => (
        <StatusBadge
          status={row.is_active ? 'active' : 'inactive'}
          label={row.is_active ? (isAr ? 'الموسم الحالي' : 'Active') : isAr ? 'مؤرشف' : 'Archived'}
        />
      ),
    },
    {
      key: 'actions',
      label: isAr ? 'إجراءات' : 'Actions',
      render: (row) =>
        !row.is_active ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSeasonToActivate(row);
            }}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <CheckCircle size={14} color="#ffd54f" />
            <span>{isAr ? 'تفعيل' : 'Activate'}</span>
          </button>
        ) : (
          <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>
            {isAr ? '✓ نشط حالياً' : '✓ Current'}
          </span>
        ),
    },
  ];

  return (
    <div dir={dir} style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: isDark ? '#ffd54f' : '#b45309',
              margin: '0 0 0.25rem 0',
            }}
          >
            {isAr ? 'إدارة المواسم وتدوير النشاط' : 'Season Management & Rollover'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: isDark ? '#a0a0b2' : '#6b7280', margin: 0 }}>
            {isAr
              ? 'التحكم في مواسم النشاط، وتدوير العضويات وترحيل السجلات بأمان.'
              : 'Manage activity seasons, rollover memberships, and preserve operational history.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsRolloverOpen(true)}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowRightLeft size={16} />
            <span>{isAr ? 'معالج تدوير الموسم (Rollover)' : 'Season Rollover Wizard'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontWeight: 600,
            }}
          >
            <Plus size={16} />
            <span>{isAr ? 'إضافة موسم' : 'Add Season'}</span>
          </button>
        </div>
      </div>

      {/* Seasons Table */}
      <DataTable
        columns={columns}
        data={seasons}
        total={seasons.length}
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        isLoading={isLoading}
        error={error}
        emptyTitle={isAr ? 'لا توجد مواسم مسجلة' : 'No seasons found'}
        emptyDescription={isAr ? 'ابدأ بإضافة موسم نشط للنظام.' : 'Create your first active season.'}
      />

      {/* Confirm Activate Dialog */}
      <ConfirmDialog
        isOpen={Boolean(seasonToActivate)}
        onClose={() => setSeasonToActivate(null)}
        onConfirm={() => activateMutation.mutate(seasonToActivate.id)}
        title={isAr ? 'تأكيد تفعيل الموسم' : 'Confirm Season Activation'}
        message={
          isAr
            ? `هل أنت متأكد من تفعيل الموسم "${seasonToActivate?.name}"؟ سيتم إلغاء تفعيل الموسم النشط الحالي تلقائياً.`
            : `Are you sure you want to activate "${seasonToActivate?.name}"? The currently active season will be deactivated.`
        }
        confirmText={isAr ? 'نعم، فعّل الموسم' : 'Yes, Activate'}
        cancelText={isAr ? 'إلغاء' : 'Cancel'}
        isLoading={activateMutation.isPending}
      />

      {/* Create Season Modal */}
      {isCreateOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="glass-panel gold-border-glow"
            style={{
              maxWidth: '480px',
              width: '100%',
              borderRadius: '18px',
              padding: '2rem',
              background: isDark ? '#141622' : '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.25rem 0', color: isDark ? '#ffd54f' : '#b45309', fontWeight: 800 }}>
              {isAr ? 'إضافة موسم جديد' : 'Create New Season'}
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  name: formData.name.trim(),
                  starts_on: formData.starts_on,
                  ends_on: formData.ends_on,
                  is_active: formData.is_active,
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <FormField label={isAr ? 'اسم الموسم' : 'Season Name'} required>
                <input
                  type="text"
                  placeholder="2026/2027"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,184,0,0.3)',
                    background: isDark ? '#1a1c28' : '#fff',
                    color: isDark ? '#fff' : '#000',
                  }}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormField label={isAr ? 'تاريخ البدء' : 'Start Date'} required>
                  <input
                    type="date"
                    value={formData.starts_on}
                    onChange={(e) => setFormData({ ...formData, starts_on: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,184,0,0.3)',
                      background: isDark ? '#1a1c28' : '#fff',
                      color: isDark ? '#fff' : '#000',
                    }}
                  />
                </FormField>

                <FormField label={isAr ? 'تاريخ الانتهاء' : 'End Date'} required>
                  <input
                    type="date"
                    value={formData.ends_on}
                    onChange={(e) => setFormData({ ...formData, ends_on: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,184,0,0.3)',
                      background: isDark ? '#1a1c28' : '#fff',
                      color: isDark ? '#fff' : '#000',
                    }}
                  />
                </FormField>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '8px' }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary"
                  style={{ flex: 2, padding: '0.65rem', borderRadius: '8px', fontWeight: 700 }}
                >
                  {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : isAr ? 'حفظ الموسم' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Season Rollover Wizard Modal */}
      {isRolloverOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setIsRolloverOpen(false)}
        >
          <div
            className="glass-panel gold-border-glow"
            style={{
              maxWidth: '520px',
              width: '100%',
              borderRadius: '20px',
              padding: '2rem',
              background: isDark ? '#141624' : '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <ArrowRightLeft size={22} color="#ffd54f" />
              <h3 style={{ margin: 0, color: isDark ? '#ffd54f' : '#b45309', fontWeight: 800 }}>
                {isAr ? 'معالج تدوير الموسم السنوي' : 'Season Rollover Wizard'}
              </h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: isDark ? '#a0a0b2' : '#6b7280', lineHeight: 1.5 }}>
              {isAr
                ? 'سيقوم هذا الإجراء بنقل نشاط إيناكوس قنا إلى موسم جديد، مع أرشفة الموسم الحالي وتغيير حالة الأعضاء النشطين إلى "خريجين" (Alumni) دون حذف أي نقاط أو سجلات تاريخية.'
                : 'This operation transitions Enactus Qena to a new season, archives the current season, and moves active memberships to Alumni safely.'}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                rolloverMutation.mutate(rolloverData);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}
            >
              <FormField label={isAr ? 'اسم الموسم الجديد' : 'New Season Name'} required>
                <input
                  type="text"
                  placeholder="2027/2028"
                  value={rolloverData.name}
                  onChange={(e) => setRolloverData({ ...rolloverData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,184,0,0.3)',
                    background: isDark ? '#1a1c28' : '#fff',
                    color: isDark ? '#fff' : '#000',
                  }}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormField label={isAr ? 'تاريخ البدء' : 'Start Date'} required>
                  <input
                    type="date"
                    value={rolloverData.starts_on}
                    onChange={(e) => setRolloverData({ ...rolloverData, starts_on: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,184,0,0.3)',
                      background: isDark ? '#1a1c28' : '#fff',
                      color: isDark ? '#fff' : '#000',
                    }}
                  />
                </FormField>

                <FormField label={isAr ? 'تاريخ الانتهاء' : 'End Date'} required>
                  <input
                    type="date"
                    value={rolloverData.ends_on}
                    onChange={(e) => setRolloverData({ ...rolloverData, ends_on: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,184,0,0.3)',
                      background: isDark ? '#1a1c28' : '#fff',
                      color: isDark ? '#fff' : '#000',
                    }}
                  />
                </FormField>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  color: isDark ? '#e0e0e0' : '#111',
                }}
              >
                <input
                  type="checkbox"
                  checked={rolloverData.moveAlumni}
                  onChange={(e) => setRolloverData({ ...rolloverData, moveAlumni: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#ffb800' }}
                />
                <span>{isAr ? 'نقل الأعضاء الحاليين إلى قائمة الخريجين (Alumni)' : 'Transition current members to Alumni'}</span>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsRolloverOpen(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '8px' }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={rolloverMutation.isPending}
                  className="btn-primary"
                  style={{ flex: 2, padding: '0.65rem', borderRadius: '8px', fontWeight: 800 }}
                >
                  {rolloverMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : isAr ? 'تنفيذ التدوير الآن' : 'Execute Rollover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

