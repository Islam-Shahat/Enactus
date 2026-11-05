// src/lib/notificationHelpers.js
// Pure helper functions for notification deduplication keys, types, and formatting.

/**
 * Builds deterministic deduplication keys for notification triggers.
 */
export const DedupeKeys = {
  taskAssign: (taskId, assigneeId) => `task_assign:${taskId}:${assigneeId}`,
  taskStatus: (taskId, status, recipientId) => `task_status:${taskId}:${status}:${recipientId}`,
  taskDeadline: (taskId, dateStr, assigneeId) => `task_deadline:${taskId}:${dateStr}:${assigneeId}`,
  pointAdded: (entryId) => `point_entry:${entryId}`,
  pointVoided: (entryId) => `point_void:${entryId}`,
  announcement: (announcementId, recipientId) => `announcement:${announcementId}:${recipientId}`,
  excuseDecision: (excuseId, status) => `excuse:${excuseId}:${status}`,
  disputeDecision: (disputeId, status) => `dispute:${disputeId}:${status}`,
  newApplication: (applicationId, adminId) => `app_received:${applicationId}:${adminId}`,
  newContactMessage: (messageId, adminId) => `contact_msg:${messageId}:${adminId}`,
  paymentDue: (paymentId, dateStr, recipientId) => `payment_due:${paymentId}:${dateStr}:${recipientId}`,
  paymentOverdue: (paymentId, dateStr, recipientId) => `payment_overdue:${paymentId}:${dateStr}:${recipientId}`,
  paymentConfirmed: (paymentId, recipientId) => `payment_confirmed:${paymentId}:${recipientId}`,
};

/**
 * Notification type visual metadata (icons, colors, badges)
 */
export const NOTIFICATION_TYPES = {
  task_assigned: {
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    label: { ar: 'مهمة جديدة', en: 'New Task' },
    defaultLink: '/dashboard/tasks',
  },
  task_status: {
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    label: { ar: 'حالة المهمة', en: 'Task Status' },
    defaultLink: '/dashboard/tasks',
  },
  task_deadline: {
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    label: { ar: 'موعد تسليم', en: 'Deadline' },
    defaultLink: '/dashboard/tasks',
  },
  point_added: {
    color: '#ffb800',
    bgColor: 'rgba(255, 184, 0, 0.15)',
    label: { ar: 'نقاط', en: 'Points' },
    defaultLink: '/dashboard/points',
  },
  point_voided: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    label: { ar: 'إلغاء نقاط', en: 'Points Voided' },
    defaultLink: '/dashboard/points',
  },
  announcement: {
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    label: { ar: 'إعلان', en: 'Announcement' },
    defaultLink: '/dashboard/announcements',
  },
  excuse_decision: {
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    label: { ar: 'عذر غياب', en: 'Excuse' },
    defaultLink: '/dashboard/attendance',
  },
  dispute_decision: {
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    label: { ar: 'اعتراض', en: 'Dispute' },
    defaultLink: '/dashboard/points',
  },
  new_application: {
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.15)',
    label: { ar: 'طلب تقديم', en: 'Application' },
    defaultLink: '/dashboard/applications',
  },
  new_contact_message: {
    color: '#14b8a6',
    bgColor: 'rgba(20, 184, 166, 0.15)',
    label: { ar: 'رسالة تواصل', en: 'Contact Msg' },
    defaultLink: '/dashboard/site',
  },
  payment_due: {
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    label: { ar: 'دفعة مستحقة', en: 'Payment Due' },
    defaultLink: '/dashboard/finance',
  },
  payment_overdue: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    label: { ar: 'دفعة متأخرة', en: 'Payment Overdue' },
    defaultLink: '/dashboard/finance',
  },
  payment_confirmed: {
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    label: { ar: 'دفعة مؤكدة', en: 'Payment Confirmed' },
    defaultLink: '/dashboard/finance',
  },
};

export function getNotificationMeta(type) {
  return (
    NOTIFICATION_TYPES[type] || {
      color: '#ffb800',
      bgColor: 'rgba(255, 184, 0, 0.15)',
      label: { ar: 'إشعار', en: 'Notification' },
      defaultLink: '/dashboard',
    }
  );
}

