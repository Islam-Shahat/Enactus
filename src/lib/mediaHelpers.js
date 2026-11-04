// src/lib/mediaHelpers.js
// Pure helpers for media post workflows, permissions, platform configs, and custom calendar grids.

export const POST_PLATFORMS = [
  { key: 'facebook', label: { ar: 'فيسبوك (Facebook)', en: 'Facebook' }, color: '#1877f2' },
  { key: 'instagram', label: { ar: 'إنستغرام (Instagram)', en: 'Instagram' }, color: '#e4405f' },
  { key: 'linkedin', label: { ar: 'لينكد إن (LinkedIn)', en: 'LinkedIn' }, color: '#0a66c2' },
  { key: 'tiktok', label: { ar: 'تيك توك (TikTok)', en: 'TikTok' }, color: '#00f2fe' },
  { key: 'x', label: { ar: 'إكس (X / Twitter)', en: 'X (Twitter)' }, color: '#ffffff' },
  { key: 'youtube', label: { ar: 'يوتيوب (YouTube)', en: 'YouTube' }, color: '#ff0000' },
  { key: 'other', label: { ar: 'منصة أخرى', en: 'Other Platform' }, color: '#a0a0b2' },
];

export const POST_STATUSES = [
  { key: 'draft', label: { ar: 'مسودة', en: 'Draft' }, color: 'rgba(156, 163, 175, 0.2)', text: '#9ca3af' },
  { key: 'review', label: { ar: 'قيد المراجعة', en: 'In Review' }, color: 'rgba(234, 179, 8, 0.2)', text: '#facc15' },
  { key: 'approved', label: { ar: 'معتمد', en: 'Approved' }, color: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
  { key: 'scheduled', label: { ar: 'مجدول', en: 'Scheduled' }, color: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' },
  { key: 'published', label: { ar: 'منشور', en: 'Published' }, color: 'rgba(147, 51, 234, 0.2)', text: '#c084fc' },
  { key: 'cancelled', label: { ar: 'ملغي', en: 'Cancelled' }, color: 'rgba(239, 68, 68, 0.2)', text: '#f87171' },
];

/**
 * Validates whether a user can perform a specific status change on a post.
 * Respects the DB RLS policy:
 * - Creators can insert/edit only draft & review
 * - Approving, scheduling, and publishing requires head of post committee, media_admin, or leadership
 */
export function canPerformPostAction(action, post, userContext) {
  if (!post || !userContext) return false;
  const { userId, isSuperAdmin, isHead, isMediaAdmin, isExec } = userContext;

  const isCreator = post.created_by === userId;
  const hasLeadAuthority = isSuperAdmin || isExec || isMediaAdmin || isHead;

  switch (action) {
    case 'submit_review':
      // From draft to review: creator or leadership
      return (post.status === 'draft') && (isCreator || hasLeadAuthority);

    case 'approve':
      // From review (or draft): only heads/media_admin/leadership
      return (post.status === 'review' || post.status === 'draft') && hasLeadAuthority;

    case 'schedule':
      // From approved or review: only heads/media_admin/leadership
      return (post.status === 'approved' || post.status === 'review' || post.status === 'draft') && hasLeadAuthority;

    case 'publish':
      // From scheduled or approved: only heads/media_admin/leadership
      return (post.status === 'scheduled' || post.status === 'approved' || post.status === 'review') && hasLeadAuthority;

    case 'cancel':
      if (post.status === 'published') return false;
      return (isCreator && post.status === 'draft') || hasLeadAuthority;

    case 'edit':
      if (hasLeadAuthority) return true;
      return isCreator && (post.status === 'draft' || post.status === 'review');

    case 'delete':
      if (isSuperAdmin || (isExec && userContext.roles?.includes('president')) || isMediaAdmin) return true;
      return isCreator && post.status === 'draft';

    default:
      return false;
  }
}

/**
 * Returns allowed next actions and target statuses for a given post and user.
 */
export function getAvailableTransitions(post, userContext) {
  const transitions = [];
  if (!post) return transitions;

  if (canPerformPostAction('submit_review', post, userContext)) {
    transitions.push({
      action: 'submit_review',
      targetStatus: 'review',
      label: { ar: 'إرسال للمراجعة والاعتماد', en: 'Submit for Review' },
      color: '#facc15',
    });
  }

  if (canPerformPostAction('approve', post, userContext) && post.status !== 'approved') {
    transitions.push({
      action: 'approve',
      targetStatus: 'approved',
      label: { ar: 'اعتماد المنشور', en: 'Approve Post' },
      color: '#34d399',
    });
  }

  if (canPerformPostAction('schedule', post, userContext) && post.status !== 'scheduled') {
    transitions.push({
      action: 'schedule',
      targetStatus: 'scheduled',
      label: { ar: 'جدولة موعد النشر', en: 'Schedule Post' },
      color: '#60a5fa',
    });
  }

  if (canPerformPostAction('publish', post, userContext) && post.status !== 'published') {
    transitions.push({
      action: 'publish',
      targetStatus: 'published',
      label: { ar: 'نشر وتأكيد الالتزامات', en: 'Publish Now' },
      color: '#c084fc',
    });
  }

  if (canPerformPostAction('cancel', post, userContext) && post.status !== 'cancelled') {
    transitions.push({
      action: 'cancel',
      targetStatus: 'cancelled',
      label: { ar: 'إلغاء المنشور', en: 'Cancel' },
      color: '#f87171',
    });
  }

  return transitions;
}

/**
 * Lightweight pure month calendar matrix generator.
 * Returns array of days with { date, dayOfMonth, isCurrentMonth, dateString }.
 */
export function getMonthCalendarMatrix(year, monthIndex) {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  // Sunday = 0, Saturday = 6. For Arabic / Egyptian calendars, Saturday is typically first day of week (6).
  // Standard 0 (Sunday) to 6 (Saturday)
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday
  const daysInMonth = lastDayOfMonth.getDate();

  const days = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const dateObj = new Date(year, monthIndex - 1, d);
    days.push({
      date: dateObj,
      dayOfMonth: d,
      isCurrentMonth: false,
      dateString: dateObj.toISOString().split('T')[0],
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, monthIndex, d);
    days.push({
      date: dateObj,
      dayOfMonth: d,
      isCurrentMonth: true,
      dateString: dateObj.toISOString().split('T')[0],
    });
  }

  // Next month leading days to complete full grid rows (multiple of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const dateObj = new Date(year, monthIndex + 1, d);
    days.push({
      date: dateObj,
      dayOfMonth: d,
      isCurrentMonth: false,
      dateString: dateObj.toISOString().split('T')[0],
    });
  }

  return days;
}

/**
 * Filter posts matching a calendar day (matches scheduled_at or published_at date).
 */
export function getPostsForDay(posts, dayDateString) {
  if (!posts || !dayDateString) return [];
  return posts.filter((p) => {
    const sDate = p.scheduled_at ? p.scheduled_at.split('T')[0] : null;
    const pDate = p.published_at ? p.published_at.split('T')[0] : null;
    return sDate === dayDateString || pDate === dayDateString;
  });
}

