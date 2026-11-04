// src/components/dashboard/media/PostDrawer.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Layers,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../Toast';
import Drawer from '../Drawer';
import FormField from '../FormField';
import {
  POST_PLATFORMS,
  POST_STATUSES,
  canPerformPostAction,
  getAvailableTransitions,
} from '../../../lib/mediaHelpers';
import { uploadLibraryMedia, getMediaPublicUrl } from '../../../lib/mediaStorage';
import PostWorkflowDialog from './PostWorkflowDialog';

export default function PostDrawer({
  isOpen,
  onClose,
  postId = null,
  initialDate = null,
  onSaved,
}) {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const isMediaAdmin = isSuperAdmin || hasRole('media_admin');
  const isExec = isSuperAdmin || hasRole(['president', 'vice_president']);
  const isHead = hasRole('committee_head');

  const [loading, setLoading] = useState(false);
  const [activeWorkflowAction, setActiveWorkflowAction] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    platform: 'facebook',
    title: '',
    caption: '',
    committee_id: '',
    season_id: '',
    scheduled_at: initialDate ? `${initialDate}T12:00` : '',
    post_url: '',
    status: 'draft',
    media_paths: [],
  });

  // Selected Deliverable IDs (for post_deliverables)
  const [selectedDeliverableIds, setSelectedDeliverableIds] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  // Fetch active season
  const { data: activeSeason } = useQuery({
    queryKey: ['season', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name')
        .eq('is_active', true)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch committees
  const { data: committees = [] } = useQuery({
    queryKey: ['committees', 'posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committees')
        .select('id, name_ar, name_en, slug, is_media_team')
        .order('name_ar');
      if (error) return [];
      return data || [];
    },
    enabled: isOpen,
  });

  // Fetch partner companies for deliverable linking
  const { data: companies = [] } = useQuery({
    queryKey: ['companies', 'for_deliverables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name_ar, name_en')
        .in('stage', ['signed', 'delivered', 'renewal'])
        .order('name_ar');
      if (error) return [];
      return data || [];
    },
    enabled: isOpen,
  });

  // Fetch deliverables for chosen company
  const { data: companyDeliverables = [] } = useQuery({
    queryKey: ['deliverables_for_post', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('deliverables')
        .select(`
          id,
          kind,
          title,
          required_count,
          due_date,
          agreements (title)
        `)
        .eq('company_id', selectedCompanyId);
      if (error) return [];
      return data || [];
    },
    enabled: Boolean(selectedCompanyId),
  });

  // Fetch existing post data if editing
  const { data: existingPost } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) return null;
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          season_id,
          committee_id,
          platform,
          title,
          caption,
          media_paths,
          scheduled_at,
          published_at,
          post_url,
          status,
          created_by,
          approved_by,
          created_at,
          committee:committee_id (id, name_ar, name_en),
          creator:created_by (id, full_name_ar, full_name_en),
          approver:approved_by (id, full_name_ar, full_name_en),
          post_deliverables (
            deliverable_id,
            deliverables:deliverable_id (
              id,
              company_id,
              kind,
              title
            )
          )
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isOpen && Boolean(postId),
  });

  // Sync form when existing post loads or when opening for create
  useEffect(() => {
    if (existingPost) {
      setFormData({
        platform: existingPost.platform || 'facebook',
        title: existingPost.title || '',
        caption: existingPost.caption || '',
        committee_id: existingPost.committee_id || '',
        season_id: existingPost.season_id || '',
        scheduled_at: existingPost.scheduled_at ? existingPost.scheduled_at.slice(0, 16) : '',
        post_url: existingPost.post_url || '',
        status: existingPost.status || 'draft',
        media_paths: existingPost.media_paths || [],
      });

      const linkedIds = (existingPost.post_deliverables || []).map((pd) => pd.deliverable_id);
      setSelectedDeliverableIds(linkedIds);

      const firstComp = existingPost.post_deliverables?.[0]?.deliverables?.company_id;
      if (firstComp) {
        setSelectedCompanyId(firstComp);
      }
    } else {
      // Default new post
      const mediaComm = committees.find((c) => c.slug === 'media' || c.is_media_team);
      setFormData({
        platform: 'facebook',
        title: '',
        caption: '',
        committee_id: mediaComm?.id || (committees[0]?.id || ''),
        season_id: activeSeason?.id || '',
        scheduled_at: initialDate ? `${initialDate}T12:00` : '',
        post_url: '',
        status: 'draft',
        media_paths: [],
      });
      setSelectedDeliverableIds([]);
      setSelectedCompanyId('');
    }
  }, [existingPost, committees, activeSeason, initialDate, isOpen]);

  // Context for post actions
  const userContext = {
    userId: user?.id,
    isSuperAdmin,
    isExec,
    isMediaAdmin,
    isHead,
    roles: hasRole() ? [hasRole()] : [],
  };

  const transitions = existingPost ? getAvailableTransitions(existingPost, userContext) : [];
  const canEdit = existingPost ? canPerformPostAction('edit', existingPost, userContext) : true;

  // Media file upload
  const handleUploadMedia = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    try {
      const uploadedPaths = [];
      for (const file of files) {
        const result = await uploadLibraryMedia(file, 'posts');
        uploadedPaths.push(result.path);
      }
      setFormData((prev) => ({
        ...prev,
        media_paths: [...prev.media_paths, ...uploadedPaths],
      }));
      toast.show(isAr ? 'تم رفع الملفات بنجاح' : 'Files uploaded successfully', 'success');
    } catch (err) {
      toast.show(err.message || (isAr ? 'فشل الرفع' : 'Upload failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMedia = (pathToRemove) => {
    setFormData((prev) => ({
      ...prev,
      media_paths: prev.media_paths.filter((p) => p !== pathToRemove),
    }));
  };

  const handleToggleDeliverable = (deliverableId) => {
    setSelectedDeliverableIds((prev) =>
      prev.includes(deliverableId)
        ? prev.filter((id) => id !== deliverableId)
        : [...prev, deliverableId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.show(isAr ? 'يرجى إدخال عنوان المنشور' : 'Post title is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        season_id: formData.season_id || activeSeason?.id,
        committee_id: formData.committee_id || null,
        platform: formData.platform,
        title: formData.title.trim(),
        caption: formData.caption.trim() || null,
        media_paths: formData.media_paths,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        post_url: formData.post_url.trim() || null,
        status: formData.status,
      };

      let finalPostId = postId;

      if (postId) {
        // Update post
        const { error: updateErr } = await supabase
          .from('posts')
          .update(payload)
          .eq('id', postId);
        if (updateErr) throw updateErr;
      } else {
        // Insert new post
        payload.created_by = user?.id;
        const { data: newPost, error: insertErr } = await supabase
          .from('posts')
          .insert(payload)
          .select()
          .single();
        if (insertErr) throw insertErr;
        finalPostId = newPost.id;
      }

      // Sync post_deliverables
      // Remove existing links
      await supabase.from('post_deliverables').delete().eq('post_id', finalPostId);

      // Insert new links
      if (selectedDeliverableIds.length > 0) {
        const linkRows = selectedDeliverableIds.map((delivId) => ({
          post_id: finalPostId,
          deliverable_id: delivId,
        }));
        const { error: linkErr } = await supabase.from('post_deliverables').insert(linkRows);
        if (linkErr) {
          console.error('Error linking deliverables:', linkErr);
        }
      }

      toast.show(
        isAr ? 'تم حفظ المنشور وربط التزامات الشركاء بنجاح' : 'Post saved successfully',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['deliverable_progress'] });
      queryClient.invalidateQueries({ queryKey: ['partner_deliverables'] });
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving post:', err);
      toast.show(
        err.message || (isAr ? 'تعذر حفظ المنشور، يرجى مراجعة الصلاحيات' : 'Failed to save post'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const statusObj = POST_STATUSES.find((s) => s.key === (existingPost?.status || formData.status));
  const platformObj = POST_PLATFORMS.find((p) => p.key === formData.platform);

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        width="680px"
        title={
          existingPost
            ? isAr
              ? existingPost.title
              : existingPost.title
            : isAr
            ? 'إنشاء منشور جديد'
            : 'New Content Post'
        }
        subtitle={
          platformObj
            ? `${isAr ? 'منصة: ' : 'Platform: '}${platformObj.label[lang] || platformObj.label.ar}`
            : null
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem' }}>
          {/* Status & Workflow Bar (When editing existing post) */}
          {existingPost && (
            <div
              className="glass-panel"
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#c5c5d6' }}>{isAr ? 'الحالة:' : 'Status:'}</span>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: statusObj?.color || 'rgba(255, 255, 255, 0.1)',
                    color: statusObj?.text || '#fff',
                  }}
                >
                  {statusObj?.label[lang] || statusObj?.label.ar || existingPost.status}
                </span>
              </div>

              {/* Workflow Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {transitions.map((t) => (
                  <button
                    key={t.action}
                    type="button"
                    onClick={() => setActiveWorkflowAction(t.action)}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: t.color,
                      color: t.action === 'submit_review' ? '#000' : '#fff',
                    }}
                  >
                    {t.label[lang] || t.label.ar}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormField label={isAr ? 'المنصة المستهدفة' : 'Platform'} required>
                <select
                  disabled={!canEdit}
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="dashboard-input"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 184, 0, 0.2)',
                    color: '#fff',
                  }}
                >
                  {POST_PLATFORMS.map((p) => (
                    <option key={p.key} value={p.key} style={{ background: '#161822', color: '#fff' }}>
                      {p.label[lang] || p.label.ar}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label={isAr ? 'اللجنة المسؤولة' : 'Committee'}>
                <select
                  disabled={!canEdit}
                  value={formData.committee_id}
                  onChange={(e) => setFormData({ ...formData, committee_id: e.target.value })}
                  className="dashboard-input"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 184, 0, 0.2)',
                    color: '#fff',
                  }}
                >
                  <option value="" style={{ background: '#161822', color: '#fff' }}>
                    {isAr ? '-- عام للفريق --' : '-- General Team --'}
                  </option>
                  {committees.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: '#161822', color: '#fff' }}>
                      {isAr ? c.name_ar : c.name_en || c.name_ar} {c.is_media_team ? '★' : ''}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label={isAr ? 'عنوان المنشور / الحملة' : 'Post Title'} required>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={isAr ? 'مثال: إعلان مسابقة المشروعات الريادية 2026' : 'e.g. Entrepreneurship Projects Launch'}
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                  color: '#fff',
                }}
              />
            </FormField>

            <FormField label={isAr ? 'نص الكابشن والمحتوى (Caption)' : 'Post Caption & Content'}>
              <textarea
                rows={5}
                disabled={!canEdit}
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                placeholder={isAr ? 'اكتب نص المنشور مع الهاشتاجات والروابط...' : 'Write the copy with hashtags and links...'}
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                }}
              />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormField label={isAr ? 'الموعد المجدول للنشر' : 'Scheduled Date & Time'}>
                <input
                  type="datetime-local"
                  disabled={!canEdit}
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="dashboard-input"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 184, 0, 0.2)',
                    color: '#fff',
                  }}
                />
              </FormField>

              <FormField label={isAr ? 'رابط المنشور بعد النشر (Live URL)' : 'Live Post URL'}>
                <input
                  type="url"
                  disabled={!canEdit}
                  value={formData.post_url}
                  onChange={(e) => setFormData({ ...formData, post_url: e.target.value })}
                  placeholder="https://..."
                  className="dashboard-input"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 184, 0, 0.2)',
                    color: '#fff',
                  }}
                />
              </FormField>
            </div>

            {/* Media Upload / Attachments */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffd54f' }}>
                  {isAr ? 'مرفقات الميديا والتصميمات' : 'Media Attachments'} ({formData.media_paths.length})
                </span>
                {canEdit && (
                  <label
                    style={{
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: '#ffb800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Plus size={14} />
                    <span>{isAr ? 'رفع ملفات' : 'Upload Files'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/mp4"
                      onChange={handleUploadMedia}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {formData.media_paths.length === 0 ? (
                <div
                  style={{
                    padding: '1.25rem',
                    textAlign: 'center',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#88889a',
                    fontSize: '0.85rem',
                  }}
                >
                  {isAr ? 'لا توجد مرفقات ميديا' : 'No media attachments'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                  {formData.media_paths.map((path) => {
                    const url = getMediaPublicUrl(path);
                    const isVideo = path.toLowerCase().endsWith('.mp4');
                    return (
                      <div
                        key={path}
                        style={{
                          position: 'relative',
                          height: '90px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 184, 0, 0.2)',
                          background: '#000',
                        }}
                      >
                        {isVideo ? (
                          <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={url} alt="Attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(path)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(239, 68, 68, 0.85)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Linked Deliverables Section */}
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem',
                borderRadius: '14px',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LinkIcon size={16} color="#ffb800" />
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>
                  {isAr ? 'ربط المنشور بالتزامات الرعاة (Sponsorship Deliverables)' : 'Link to Partner Deliverables'}
                </h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                {isAr
                  ? 'عند نشر هذا المنشور، سيتم احتساب الالتزام تلقائياً في نسبة إنجاز الراعي المختار.'
                  : 'Publishing will automatically fulfill the selected deliverable in partner progress view.'}
              </p>

              {/* Company Picker */}
              <select
                disabled={!canEdit}
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '8px',
                  background: '#161822',
                  fontSize: '0.85rem',
                }}
              >
                <option value="">{isAr ? '-- اختر الشركة الشريكة --' : '-- Select Partner Company --'}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isAr ? c.name_ar : c.name_en || c.name_ar}
                  </option>
                ))}
              </select>

              {/* Deliverables Checklist */}
              {selectedCompanyId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {companyDeliverables.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#88889a', textAlign: 'center', padding: '0.5rem' }}>
                      {isAr ? 'لا توجد التزامات مسجلة لهذه الشركة' : 'No deliverables found for this partner'}
                    </div>
                  ) : (
                    companyDeliverables.map((deliv) => {
                      const isChecked = selectedDeliverableIds.includes(deliv.id);
                      return (
                        <label
                          key={deliv.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            background: isChecked ? 'rgba(255, 184, 0, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            border: isChecked ? '1px solid rgba(255, 184, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                            cursor: canEdit ? 'pointer' : 'default',
                            fontSize: '0.82rem',
                            color: '#fff',
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={!canEdit}
                            checked={isChecked}
                            onChange={() => handleToggleDeliverable(deliv.id)}
                          />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700 }}>
                              {deliv.title || deliv.kind} ({isAr ? `مطلوب: ${deliv.required_count}` : `Req: ${deliv.required_count}`})
                            </span>
                            {deliv.agreements?.title && (
                              <span style={{ fontSize: '0.75rem', color: '#ffd54f', marginInlineStart: '0.5rem' }}>
                                • {deliv.agreements.title}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Submit / Save Button */}
            {canEdit && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="btn-secondary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    padding: '0.75rem 1.8rem',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {loading
                    ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                    : existingPost
                    ? (isAr ? 'تحديث المنشور' : 'Update Post')
                    : (isAr ? 'إنشاء المنشور كمسودة' : 'Create Draft Post')}
                </button>
              </div>
            )}
          </form>
        </div>
      </Drawer>

      {/* Workflow Transition Dialog */}
      {activeWorkflowAction && existingPost && (
        <PostWorkflowDialog
          isOpen={Boolean(activeWorkflowAction)}
          onClose={() => setActiveWorkflowAction(null)}
          post={existingPost}
          targetAction={activeWorkflowAction}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['post', postId] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
          }}
        />
      )}
    </>
  );
}
