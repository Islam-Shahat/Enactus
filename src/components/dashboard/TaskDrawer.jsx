import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import StatusBadge from './StatusBadge';
import Drawer from './Drawer';
import { useToast } from './Toast';
import {
  isTaskOverdue,
  canUserChangeStatus,
  canUserManageTask,
  formatDueDate,
} from '../../lib/taskHelpers';
import {
  CheckCircle2,
  AlertTriangle,
  Award,
  User,
  Paperclip,
  MessageSquare,
  Send,
  Trash2,
  Download,
  Upload,
  Edit,
  Calendar,
  Layers,
} from 'lucide-react';

export default function TaskDrawer({
  task,
  isOpen,
  onClose,
  onEditTask = null,
}) {
  const { user, roles, isSuperAdmin } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [currentTask, setCurrentTask] = useState(task);
  const [commentBody, setCommentBody] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  const canEdit = currentTask && canUserManageTask(currentTask.committee_id, user, roles, isSuperAdmin);
  const canUpdateStatus = currentTask && canUserChangeStatus(currentTask, user, roles, isSuperAdmin);
  const isOverdue = currentTask && isTaskOverdue(currentTask);

  // 1. Fetch Comments
  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ['dashboard', 'task_comments', task?.id],
    queryFn: async () => {
      if (!task?.id) return [];
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          id,
          body,
          created_at,
          author_id,
          profiles!task_comments_author_id_fkey(
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          )
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(task?.id && isOpen),
  });

  // 2. Fetch Attachments
  const { data: attachments = [], isLoading: loadingAttachments } = useQuery({
    queryKey: ['dashboard', 'task_attachments', task?.id],
    queryFn: async () => {
      if (!task?.id) return [];
      const { data, error } = await supabase
        .from('task_attachments')
        .select(`
          id,
          file_name,
          file_path,
          created_at,
          uploaded_by,
          profiles!task_attachments_uploaded_by_fkey(
            id,
            full_name_ar,
            full_name_en
          )
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(task?.id && isOpen),
  });

  // Mutation: Update status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentTask.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (updated) => {
      toast.show(isAr ? 'تم تحديث حالة المهمة' : 'Task status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kanban_tasks'] });
      setCurrentTask((prev) => (prev ? { ...prev, status: updated.status, completed_at: updated.completed_at } : null));
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل تحديث الحالة' : 'Failed to update status'), 'error');
    },
  });

  // Mutation: Add Comment
  const addCommentMutation = useMutation({
    mutationFn: async (body) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert([
          {
            task_id: task.id,
            author_id: user.id,
            body: body.trim(),
          },
        ])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setCommentBody('');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'task_comments', task?.id] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل إضافة التعليق' : 'Failed to post comment'), 'error');
    },
  });

  // Mutation: Delete Comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم حذف التعليق' : 'Comment deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'task_comments', task?.id] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل حذف التعليق' : 'Failed to delete comment'), 'error');
    },
  });

  // Upload Attachment
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !task?.id || !user?.id) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.show(isAr ? 'الحد الأقصى للملف 10 ميجابايت' : 'Max file size is 10 MB', 'error');
      return;
    }

    try {
      setIsUploadingFile(true);
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${task.id}/${Date.now()}_${cleanFileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('task-files')
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { error: dbErr } = await supabase.from('task_attachments').insert([
        {
          task_id: task.id,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: filePath,
        },
      ]);

      if (dbErr) throw dbErr;

      toast.show(isAr ? 'تم رفع المرفق بنجاح' : 'Attachment uploaded', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'task_attachments', task.id] });
    } catch (err) {
      toast.show(err.message || (isAr ? 'فشل رفع الملف' : 'Upload failed'), 'error');
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  // Download Attachment via signed URL
  const handleDownloadAttachment = async (filePath) => {
    try {
      const { data, error } = await supabase.storage
        .from('task-files')
        .createSignedUrl(filePath, 3600); // 1 hour access
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      toast.show(err.message || (isAr ? 'فشل إنشاء رابط التحميل' : 'Failed to generate download link'), 'error');
    }
  };

  // Delete Attachment
  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({ id, filePath }) => {
      // 1. Delete storage file
      await supabase.storage.from('task-files').remove([filePath]);
      // 2. Delete DB record
      const { error } = await supabase.from('task_attachments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم حذف المرفق' : 'Attachment deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'task_attachments', task?.id] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل حذف المرفق' : 'Failed to delete attachment'), 'error');
    },
  });

  if (!currentTask) return null;

  const assigneeName = isAr
    ? currentTask.profiles?.full_name_ar || currentTask.profiles?.full_name_en
    : currentTask.profiles?.full_name_en || currentTask.profiles?.full_name_ar;

  const committeeName = isAr ? currentTask.committees?.name_ar : currentTask.committees?.name_en;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={currentTask.title}
      subtitle={committeeName ? `${isAr ? 'لجنة: ' : 'Committee: '} ${committeeName}` : ''}
      footer={
        canEdit && (
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onEditTask) onEditTask(currentTask);
              }}
              className="btn-primary"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
              }}
            >
              <Edit size={16} />
              <span>{isAr ? 'تعديل تفاصيل المهمة' : 'Edit Task Details'}</span>
            </button>
          </div>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Top Badges & Overdue Alert */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <StatusBadge status={currentTask.status} />
          <StatusBadge status={currentTask.priority} />
          {currentTask.points_value > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                background: 'rgba(255, 184, 0, 0.15)',
                color: '#ffd54f',
                border: '1px solid rgba(255, 184, 0, 0.4)',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <Award size={13} />
              <span>+{currentTask.points_value} {isAr ? 'نقطة' : 'pts'}</span>
            </span>
          )}

          {isOverdue && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 800,
              }}
            >
              <AlertTriangle size={13} />
              <span>{isAr ? 'متأخرة عن الموعد' : 'Overdue'}</span>
            </span>
          )}
        </div>

        {/* Status Change Control */}
        {canUpdateStatus && (
          <div
            style={{
              background: 'rgba(255, 184, 0, 0.04)',
              border: '1px solid rgba(255, 184, 0, 0.2)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#ffd54f', fontWeight: 600, marginBottom: '0.5rem' }}>
              {isAr ? 'تغيير حالة المهمة' : 'Update Status'}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['todo', 'in_progress', 'review', 'done', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => updateStatusMutation.mutate(st)}
                  disabled={updateStatusMutation.isPending || currentTask.status === st}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: currentTask.status === st ? 'default' : 'pointer',
                    background:
                      currentTask.status === st
                        ? 'rgba(255, 184, 0, 0.25)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${
                      currentTask.status === st ? 'rgba(255, 184, 0, 0.6)' : 'rgba(255, 255, 255, 0.1)'
                    }`,
                    color: currentTask.status === st ? '#ffd54f' : '#aaa',
                  }}
                >
                  <StatusBadge status={st} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Task Description */}
        <div>
          <h4 style={{ color: '#ffd54f', fontSize: '0.92rem', margin: '0 0 0.4rem' }}>
            {isAr ? 'الوصف والتفاصيل' : 'Description'}
          </h4>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              color: '#ddd',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {currentTask.description || (
              <span style={{ color: '#666', fontStyle: 'italic' }}>
                {isAr ? 'لا يوجد وصف مفصل لهذه المهمة.' : 'No description provided.'}
              </span>
            )}
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {/* Assignee */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.74rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={12} />
              <span>{isAr ? 'المُعيّن للمهمة' : 'Assignee'}</span>
            </div>
            <div style={{ color: '#fff', fontWeight: 600, marginTop: '0.25rem', fontSize: '0.88rem' }}>
              {assigneeName || (isAr ? 'غير معيّن' : 'Unassigned')}
            </div>
          </div>

          {/* Committee */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.74rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Layers size={12} />
              <span>{isAr ? 'اللجنة' : 'Committee'}</span>
            </div>
            <div style={{ color: '#fff', fontWeight: 600, marginTop: '0.25rem', fontSize: '0.88rem' }}>
              {committeeName || '—'}
            </div>
          </div>

          {/* Due Date */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.74rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={12} />
              <span>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</span>
            </div>
            <div
              style={{
                color: isOverdue ? '#f87171' : '#fff',
                fontWeight: 600,
                marginTop: '0.25rem',
                fontSize: '0.88rem',
              }}
            >
              {formatDueDate(currentTask.due_date, lang)}
            </div>
          </div>

          {/* Completed At */}
          {currentTask.completed_at && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.74rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle2 size={12} color="#4ade80" />
                <span>{isAr ? 'تاريخ الاكتمال' : 'Completed At'}</span>
              </div>
              <div style={{ color: '#4ade80', fontWeight: 600, marginTop: '0.25rem', fontSize: '0.88rem' }}>
                {formatDueDate(currentTask.completed_at, lang)}
              </div>
            </div>
          )}
        </div>

        {/* Attachments Section */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.6rem',
            }}
          >
            <h4
              style={{
                color: '#ffd54f',
                fontSize: '0.92rem',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Paperclip size={15} />
              <span>{isAr ? 'المرفقات والملفات' : 'Attachments'}</span>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>({attachments.length})</span>
            </h4>

            {/* Upload Button */}
            <label
              style={{
                cursor: isUploadingFile ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.78rem',
                color: '#ffb800',
                background: 'rgba(255, 184, 0, 0.1)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
              }}
            >
              <Upload size={13} />
              <span>{isUploadingFile ? (isAr ? 'جاري الرفع...' : 'Uploading...') : isAr ? 'رفع ملف' : 'Upload File'}</span>
              <input
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                disabled={isUploadingFile}
              />
            </label>
          </div>

          {loadingAttachments ? (
            <div style={{ color: '#777', fontSize: '0.82rem' }}>{isAr ? 'تحميل المرفقات...' : 'Loading attachments...'}</div>
          ) : attachments.length === 0 ? (
            <div style={{ color: '#666', fontSize: '0.82rem', fontStyle: 'italic' }}>
              {isAr ? 'لا توجد ملفات مرفقة حالياً.' : 'No attachments uploaded.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {attachments.map((att) => {
                const canDeleteAtt = user?.id === att.uploaded_by || canEdit;
                return (
                  <div
                    key={att.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255, 184, 0, 0.15)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <Paperclip size={14} color="#ffd54f" />
                      <span
                        style={{
                          fontSize: '0.85rem',
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '220px',
                        }}
                      >
                        {att.file_name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att.file_path)}
                        title={isAr ? 'تحميل الملف' : 'Download File'}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ffd54f',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Download size={15} />
                      </button>

                      {canDeleteAtt && (
                        <button
                          type="button"
                          onClick={() => deleteAttachmentMutation.mutate({ id: att.id, filePath: att.file_path })}
                          title={isAr ? 'حذف المرفق' : 'Delete attachment'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div>
          <h4
            style={{
              color: '#ffd54f',
              fontSize: '0.92rem',
              margin: '0 0 0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <MessageSquare size={15} />
            <span>{isAr ? 'المناقشة والتعليقات' : 'Comments'}</span>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>({comments.length})</span>
          </h4>

          {/* Comments List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxHeight: '300px',
              overflowY: 'auto',
              marginBottom: '0.75rem',
              paddingInlineEnd: '0.25rem',
            }}
          >
            {loadingComments ? (
              <div style={{ color: '#777', fontSize: '0.82rem' }}>{isAr ? 'تحميل التعليقات...' : 'Loading comments...'}</div>
            ) : comments.length === 0 ? (
              <div style={{ color: '#666', fontSize: '0.82rem', fontStyle: 'italic' }}>
                {isAr ? 'لا توجد تعليقات بعد. كن أول من يترك تعليقاً!' : 'No comments yet.'}
              </div>
            ) : (
              comments.map((c) => {
                const authorName = isAr
                  ? c.profiles?.full_name_ar || c.profiles?.full_name_en
                  : c.profiles?.full_name_en || c.profiles?.full_name_ar;
                const isAuthor = user?.id === c.author_id;
                const canDeleteComm = isAuthor || canEdit;

                return (
                  <div
                    key={c.id}
                    style={{
                      background: isAuthor ? 'rgba(255, 184, 0, 0.05)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isAuthor ? 'rgba(255, 184, 0, 0.2)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'rgba(255, 184, 0, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {c.profiles?.avatar_url ? (
                            <img
                              src={c.profiles.avatar_url}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <User size={12} color="#ffb800" />
                          )}
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffd54f' }}>
                          {authorName || '—'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#777' }}>
                          {new Date(c.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {canDeleteComm && (
                        <button
                          type="button"
                          onClick={() => deleteCommentMutation.mutate(c.id)}
                          title={isAr ? 'حذف التعليق' : 'Delete comment'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.1rem',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '0.86rem', color: '#eee', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                      {c.body}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Comment Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!commentBody.trim()) return;
              addCommentMutation.mutate(commentBody);
            }}
            style={{ display: 'flex', gap: '0.5rem' }}
          >
            <input
              type="text"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={isAr ? 'اكتب تعليقاً أو استفساراً...' : 'Write a comment...'}
              style={{
                flex: 1,
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                color: '#fff',
                fontSize: '0.85rem',
              }}
            />
            <button
              type="submit"
              disabled={addCommentMutation.isPending || !commentBody.trim()}
              className="btn-primary"
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </Drawer>
  );
}
