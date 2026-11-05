// src/pages/dashboard/AnnouncementsPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  Pin,
  PinOff,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  Users,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { formatDate, formatRelativeTime } from '../../lib/formatters';
import Skeleton from '../../components/dashboard/Skeleton';
import EmptyState from '../../components/dashboard/EmptyState';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import Drawer from '../../components/dashboard/Drawer';
import FormField from '../../components/dashboard/FormField';
import { useToast } from '../../components/dashboard/Toast';

export default function AnnouncementsPage() {
  const { user, roles, isSuperAdmin, hasRole } = useAuth();
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const isLeadership = isSuperAdmin || hasRole(['president', 'vice_president', 'hr_admin']);
  const isHead = hasRole('committee_head');
  const headRoleObj = roles.find((r) => r.role === 'committee_head');
  const headCommitteeId = headRoleObj?.committee_id;
  const canPublish = isLeadership || isHead;

  const [committeeFilter, setCommitteeFilter] = useState('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    committee_id: '',
    pinned: false,
    expires_at: '',
  });

  // 1. Fetch Active Season
  const { data: activeSeason } = useQuery({
    queryKey: ['dashboard', 'active_season'],
    queryFn: async () => {
      const { data } = await supabase
        .from('seasons')
        .select('id, name')
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
  });

  // 2. Fetch Committees
  const { data: committees = [] } = useQuery({
    queryKey: ['dashboard', 'committees'],
    queryFn: async () => {
      const { data } = await supabase
        .from('committees')
        .select('id, name_ar, name_en, slug, color')
        .order('name_ar');
      return data || [];
    },
  });

  // 3. Fetch Announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'announcements', committeeFilter],
    queryFn: async () => {
      let query = supabase
        .from('announcements')
        .select(`
          id,
          title,
          body,
          pinned,
          published_at,
          expires_at,
          created_by,
          committee_id,
          season_id,
          committees (id, name_ar, name_en, color),
          profiles:created_by (id, full_name_ar, full_name_en)
        `)
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (committeeFilter !== 'all') {
        if (committeeFilter === 'general') {
          query = query.is('committee_id', null);
        } else {
          query = query.eq('committee_id', committeeFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Open Drawer for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      body: '',
      committee_id: isLeadership ? '' : headCommitteeId || '',
      pinned: false,
      expires_at: '',
    });
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      body: item.body,
      committee_id: item.committee_id || '',
      pinned: item.pinned,
      expires_at: item.expires_at ? item.expires_at.slice(0, 10) : '',
    });
    setIsDrawerOpen(true);
  };

  // Save Mutation (Create / Edit)
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingItem) {
        const { data, error } = await supabase
          .from('announcements')
          .update({
            title: payload.title,
            body: payload.body,
            committee_id: payload.committee_id || null,
            pinned: payload.pinned,
            expires_at: payload.expires_at ? new Date(payload.expires_at).toISOString() : null,
          })
          .eq('id', editingItem.id)
          .select();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert([
            {
              title: payload.title,
              body: payload.body,
              committee_id: payload.committee_id || null,
              season_id: activeSeason?.id || null,
              pinned: payload.pinned,
              expires_at: payload.expires_at ? new Date(payload.expires_at).toISOString() : null,
              created_by: user?.id,
              published_at: new Date().toISOString(),
            },
          ])
          .select();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.show(
        editingItem
          ? isAr
            ? 'تم حفظ تعديل الإعلان بنجاح'
            : 'Announcement updated'
          : isAr
          ? 'تم نشر الإعلان بنجاح'
          : 'Announcement published',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'announcements'] });
      setIsDrawerOpen(false);
    },
    onError: (err) => {
      console.error('[AnnouncementsPage error]:', err);
      toast.show(err.message || (isAr ? 'فشل حفظ الإعلان' : 'Failed to save announcement'), 'error');
    },
  });

  // Pin Toggle Mutation
  const togglePinMutation = useMutation({
    mutationFn: async (item) => {
      const { error } = await supabase
        .from('announcements')
        .update({ pinned: !item.pinned })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'announcements'] });
    },
    onError: (err) => {
      toast.show(err.message, 'error');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم حذف الإعلان' : 'Announcement deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'announcements'] });
      setDeleteId(null);
    },
    onError: (err) => {
      toast.show(err.message, 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) {
      toast.show(isAr ? 'عنوان ونص الإعلان مطلوبان' : 'Title and body are required', 'error');
      return;
    }
    saveMutation.mutate(formData);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    background: isDark ? '#141620' : '#ffffff',
    border: isDark ? '1px solid rgba(255, 184, 0, 0.3)' : '1px solid rgba(184, 120, 0, 0.4)',
    color: isDark ? '#ffffff' : '#0f111a',
    fontSize: '0.92rem',
    outline: 'none',
    colorScheme: isDark ? 'dark' : 'light',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
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
              <Megaphone size={20} />
            </div>
            <h1
              className="gold-gradient-text"
              style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}
            >
              {isAr ? 'الإعلانات والتعليمات العامة' : 'Announcements & Directives'}
            </h1>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: isDark ? '#a3a3b2' : '#6b7280', fontSize: '0.88rem' }}>
            {isAr
              ? 'البيانات الرسمية والتوجيهات التشغيلية الموجهة لأعضاء ولجان كتيبة إيناكوس قنا.'
              : 'Official operational statements and updates addressed to members and committees.'}
          </p>
        </div>

        {canPublish && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-primary"
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.88rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            <span>{isAr ? 'نشر إعلان جديد' : 'New Announcement'}</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '0.75rem 1.25rem',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffd54f' }}>
          {isAr ? 'تصفية حسب الجمهور:' : 'Audience:'}
        </span>
        <select
          value={committeeFilter}
          onChange={(e) => setCommitteeFilter(e.target.value)}
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
          <option value="all">{isAr ? 'كافة الإعلانات المتاحة' : 'All Announcements'}</option>
          <option value="general">{isAr ? 'إعلانات عامة للجميع فقط' : 'General Announcements Only'}</option>
          {committees.map((c) => (
            <option key={c.id} value={c.id}>
              {isAr ? `لجنة: ${c.name_ar}` : `Committee: ${c.name_en}`}
            </option>
          ))}
        </select>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Skeleton height="110px" borderRadius="18px" />
          <Skeleton height="110px" borderRadius="18px" />
          <Skeleton height="110px" borderRadius="18px" />
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={isAr ? 'لا توجد إعلانات منشورة' : 'No announcements published'}
          description={
            isAr
              ? 'لم يتم نشر أي إعلانات عامة أو موجهة للجنة المحددة حالياً.'
              : 'No announcements have been published for this audience selection yet.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {announcements.map((item) => {
            const isPinned = item.pinned;
            const author =
              (isAr ? item.profiles?.full_name_ar : item.profiles?.full_name_en) ||
              item.profiles?.full_name_ar ||
              (isAr ? 'إدارة الفريق' : 'Leadership');

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1.35rem 1.5rem',
                  borderRadius: '18px',
                  background: isPinned
                    ? isDark
                      ? 'linear-gradient(135deg, rgba(255, 184, 0, 0.12), rgba(22, 24, 34, 0.98))'
                      : 'rgba(255, 184, 0, 0.12)'
                    : isDark
                    ? 'rgba(18, 19, 26, 0.85)'
                    : '#ffffff',
                  border: isPinned
                    ? '1.5px solid rgba(255, 184, 0, 0.5)'
                    : isDark
                    ? '1px solid rgba(255, 184, 0, 0.2)'
                    : '1px solid rgba(184, 120, 0, 0.25)',
                  boxShadow: isPinned
                    ? isDark
                      ? '0 10px 25px rgba(255, 184, 0, 0.12)'
                      : '0 8px 20px rgba(184, 120, 0, 0.12)'
                    : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  position: 'relative',
                }}
              >
                {/* Top Badge & Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {isPinned && (
                      <span
                        style={{
                          background: 'linear-gradient(135deg, #d48800, #ffb800)',
                          color: '#000000',
                          padding: '3px 9px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Pin size={12} />
                        <span>{isAr ? 'مثبت في الصدارة' : 'PINNED'}</span>
                      </span>
                    )}

                    {item.committees ? (
                      <span
                        style={{
                          background: item.committees.color || 'rgba(59, 130, 246, 0.2)',
                          color: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {isAr ? item.committees.name_ar : item.committees.name_en}
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(255, 184, 0, 0.15)',
                          color: '#ffb800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {isAr ? 'عام للجميع' : 'General (All)'}
                      </span>
                    )}

                    <span style={{ fontSize: '0.75rem', color: isDark ? '#a3a3b2' : '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} />
                      <span>{formatRelativeTime(item.published_at, lang)}</span>
                    </span>
                  </div>

                  {/* Actions for leadership & creator */}
                  {canPublish && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => togglePinMutation.mutate(item)}
                        title={isPinned ? (isAr ? 'إلغاء التثبيت' : 'Unpin') : (isAr ? 'تثبيت' : 'Pin')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isPinned ? '#ffb800' : isDark ? '#a3a3b2' : '#6b7280',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          borderRadius: '6px',
                        }}
                      >
                        {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        title={isAr ? 'تعديل' : 'Edit'}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isDark ? '#a3a3b2' : '#6b7280',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          borderRadius: '6px',
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(item.id)}
                        title={isAr ? 'حذف' : 'Delete'}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          borderRadius: '6px',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Announcement Title & Body */}
                <div>
                  <h3
                    style={{
                      margin: '0 0 0.5rem 0',
                      color: isDark ? '#ffd54f' : '#b45309',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: isDark ? '#e5e7eb' : '#374151',
                      fontSize: '0.94rem',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {item.body}
                  </p>
                </div>

                {/* Footer details */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f3f4f6',
                    fontSize: '0.78rem',
                    color: isDark ? '#888899' : '#9ca3af',
                  }}
                >
                  <span>
                    {isAr ? 'الناشر: ' : 'Posted by: '}
                    <strong style={{ color: isDark ? '#ffd54f' : '#111' }}>{author}</strong>
                  </span>
                  {item.expires_at && (
                    <span>
                      {isAr ? 'ينتهي في: ' : 'Expires on: '}
                      {formatDate(item.expires_at, lang)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={
          editingItem
            ? isAr
              ? 'تعديل الإعلان'
              : 'Edit Announcement'
            : isAr
            ? 'نشر إعلان جديد'
            : 'New Announcement'
        }
        size="md"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <FormField label={isAr ? 'عنوان الإعلان' : 'Title'} required>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={isAr ? 'مثال: موعد الاجتماع التحضيري العام' : 'e.g. Preparation Meeting Schedule'}
              style={inputStyle}
              required
            />
          </FormField>

          <FormField label={isAr ? 'الجمهور المستهدف' : 'Target Audience'}>
            <select
              value={formData.committee_id}
              onChange={(e) => setFormData({ ...formData, committee_id: e.target.value })}
              disabled={!isLeadership && Boolean(headCommitteeId)}
              style={inputStyle}
            >
              {isLeadership && (
                <option value="">{isAr ? '-- عام للجميع (General) --' : '-- Everyone (All Members) --'}</option>
              )}
              {committees
                .filter((c) => isLeadership || c.id === headCommitteeId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {isAr ? c.name_ar : c.name_en}
                  </option>
                ))}
            </select>
          </FormField>

          <FormField label={isAr ? 'نص وتفاصيل الإعلان' : 'Announcement Content'} required>
            <textarea
              rows={6}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder={isAr ? 'اكتب نص الإعلان والتعليمات والتوجيهات هنا...' : 'Write directive details here...'}
              style={{ ...inputStyle, resize: 'vertical' }}
              required
            />
          </FormField>

          <FormField label={isAr ? 'تاريخ انتهاء الصلاحية (اختياري)' : 'Expiry Date (Optional)'}>
            <input
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
            <input
              type="checkbox"
              id="pinned-checkbox"
              checked={formData.pinned}
              onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: '#ffb800', cursor: 'pointer' }}
            />
            <label htmlFor="pinned-checkbox" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffd54f', cursor: 'pointer' }}>
              {isAr ? 'تثبيت الإعلان في صدارة اللوحة' : 'Pin Announcement to Top'}
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600 }}
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
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
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
                    {editingItem
                      ? isAr
                        ? 'حفظ التعديل'
                        : 'Save Changes'
                      : isAr
                      ? 'نشر الإعلان'
                      : 'Publish Announcement'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title={isAr ? 'حذف الإعلان' : 'Delete Announcement'}
        message={isAr ? 'هل أنت متأكد من حذف هذا الإعلان نهائياً من النظام؟' : 'Are you sure you want to permanently delete this announcement?'}
        confirmText={isAr ? 'نعم، احذف' : 'Yes, Delete'}
        isDanger={true}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

