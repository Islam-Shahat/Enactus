// src/components/dashboard/media/PostWorkflowDialog.jsx
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Calendar,
  Send,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../Toast';
import FormField from '../FormField';

export default function PostWorkflowDialog({
  isOpen,
  onClose,
  post,
  targetAction,
  onSuccess,
}) {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [postUrl, setPostUrl] = useState(post?.post_url || '');
  const [scheduledAt, setScheduledAt] = useState(() =>
    post?.scheduled_at ? post.scheduled_at.slice(0, 16) : new Date().toISOString().slice(0, 16)
  );

  if (!isOpen || !post || !targetAction) return null;

  const handleExecute = async () => {
    setLoading(true);
    try {
      const updates = {};
      const nowIso = new Date().toISOString();

      switch (targetAction) {
        case 'submit_review':
          updates.status = 'review';
          break;

        case 'approve':
          updates.status = 'approved';
          updates.approved_by = user?.id;
          break;

        case 'schedule':
          if (!scheduledAt) {
            toast.show(isAr ? 'يرجى تحديد موعد النشر المجدول' : 'Please select scheduled time', 'error');
            setLoading(false);
            return;
          }
          updates.status = 'scheduled';
          updates.scheduled_at = new Date(scheduledAt).toISOString();
          break;

        case 'publish':
          updates.status = 'published';
          updates.published_at = nowIso;
          if (postUrl.trim()) {
            updates.post_url = postUrl.trim();
          }
          if (!post.approved_by) {
            updates.approved_by = user?.id;
          }
          break;

        case 'cancel':
          updates.status = 'cancelled';
          break;

        default:
          break;
      }

      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', post.id)
        .select()
        .single();

      if (error) throw error;

      toast.show(
        isAr ? 'تم تحديث حالة المنشور بنجاح' : 'Post status updated successfully',
        'success'
      );

      // Invalidate posts and deliverable progress caches
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['deliverable_progress'] });
      queryClient.invalidateQueries({ queryKey: ['partner_deliverables'] });

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Workflow error:', err);
      toast.show(
        err.message || (isAr ? 'تعذر تنفيذ الإجراء، يرجى مراجعة الصلاحيات' : 'Failed to update post status'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const dialogConfig = {
    submit_review: {
      title: isAr ? 'إرسال المنشور للمراجعة والاعتماد' : 'Submit Post for Review',
      desc: isAr
        ? 'سيتم إرسال هذا المنشور إلى رئيس لجنة الميديا والرئاسة لمراجعته واعتماده قبل النشر.'
        : 'This post will be submitted to the Media Head & Leadership for review.',
      color: '#facc15',
      icon: Send,
      confirmText: isAr ? 'تأكيد الإرسال' : 'Submit for Review',
    },
    approve: {
      title: isAr ? 'اعتماد المنشور للنشر' : 'Approve Post for Publishing',
      desc: isAr
        ? 'بصفتك مخولاً، ستقوم باعتماد صياغة ومحتوى المنشور ليصبح جاهزاً للنشر أو الجدولة.'
        : 'Approve this post content and media assets for publication.',
      color: '#34d399',
      icon: CheckCircle2,
      confirmText: isAr ? 'اعتماد المنشور' : 'Approve Post',
    },
    schedule: {
      title: isAr ? 'جدولة موعد النشر' : 'Schedule Publication',
      desc: isAr
        ? 'حدد التاريخ والوقت المستهدف لنشر هذا المحتوى على المنصة المحددة.'
        : 'Select the scheduled date & time to release this post.',
      color: '#60a5fa',
      icon: Calendar,
      confirmText: isAr ? 'تأكيد الجدولة' : 'Confirm Schedule',
    },
    publish: {
      title: isAr ? 'نشر المحتوى وتحديث التزامات الشركاء' : 'Publish Post Now',
      desc: isAr
        ? 'نشر هذا المنشور سيقوم تلقائياً باحتساب الالتزام للشريك الراعي وتحديث مؤشر الإنجاز لدى العلاقات العامة.'
        : 'Publishing will immediately increment deliverable progress for linked sponsors.',
      color: '#c084fc',
      icon: Sparkles,
      confirmText: isAr ? 'تأكيد النشر الفعلي' : 'Publish Now',
    },
    cancel: {
      title: isAr ? 'إلغاء المنشور' : 'Cancel Post',
      desc: isAr
        ? 'هل أنت متأكد من رغبتك في إلغاء هذا المنشور؟ يمكنك دائماً الرجوع إليه كمسودة لاحقاً.'
        : 'Are you sure you want to cancel this post?',
      color: '#f87171',
      icon: XCircle,
      confirmText: isAr ? 'إلغاء المنشور' : 'Cancel Post',
    },
  }[targetAction] || {
    title: isAr ? 'تأكيد الإجراء' : 'Confirm Action',
    desc: '',
    color: '#ffb800',
    icon: CheckCircle2,
    confirmText: isAr ? 'تأكيد' : 'Confirm',
  };

  const IconComponent = dialogConfig.icon;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(170deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))',
          borderRadius: '20px',
          border: `1px solid ${dialogConfig.color}40`,
          padding: '2rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: `${dialogConfig.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: dialogConfig.color,
            }}
          >
            <IconComponent size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              {dialogConfig.title}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{post.title}</p>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: '#c5c5d6', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          {dialogConfig.desc}
        </p>

        {targetAction === 'schedule' && (
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField label={isAr ? 'موعد النشر المجدول' : 'Scheduled Date & Time'} required>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  color: '#fff',
                }}
              />
            </FormField>
          </div>
        )}

        {targetAction === 'publish' && (
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField label={isAr ? 'رابط المنشور على المنصة (Live URL - اختياري)' : 'Live Post URL (Optional)'}>
              <input
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://facebook.com/... or https://instagram.com/p/..."
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(192, 132, 252, 0.4)',
                  color: '#fff',
                }}
              />
            </FormField>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
            style={{ padding: '0.75rem 1.4rem', borderRadius: '10px', fontSize: '0.88rem', cursor: 'pointer' }}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={loading}
            style={{
              padding: '0.75rem 1.7rem',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: dialogConfig.color,
              color: targetAction === 'submit_review' ? '#000' : '#fff',
              border: 'none',
              boxShadow: `0 4px 15px ${dialogConfig.color}40`,
            }}
          >
            {loading ? (isAr ? 'جاري التنفيذ...' : 'Processing...') : dialogConfig.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

