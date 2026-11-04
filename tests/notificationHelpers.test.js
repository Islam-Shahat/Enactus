// tests/notificationHelpers.test.js
import { describe, it, expect } from 'vitest';
import { DedupeKeys, getNotificationMeta, NOTIFICATION_TYPES } from '../src/lib/notificationHelpers';
import {
  renderPaymentReminderHtml,
  renderWeeklyReportHtml,
  renderAnnouncementDigestHtml,
  wrapEmailLayout,
} from '../src/lib/emailTemplates';

describe('Notification Deduplication Keys', () => {
  it('builds correct task assign dedupe key', () => {
    const key = DedupeKeys.taskAssign('task-123', 'user-456');
    expect(key).toBe('task_assign:task-123:user-456');
  });

  it('builds correct task status dedupe key', () => {
    const key = DedupeKeys.taskStatus('task-123', 'review', 'head-789');
    expect(key).toBe('task_status:task-123:review:head-789');
  });

  it('builds correct point entry and void keys', () => {
    expect(DedupeKeys.pointAdded('point-1')).toBe('point_entry:point-1');
    expect(DedupeKeys.pointVoided('point-1')).toBe('point_void:point-1');
  });

  it('builds correct announcement dedupe key', () => {
    expect(DedupeKeys.announcement('ann-99', 'user-1')).toBe('announcement:ann-99:user-1');
  });

  it('builds correct payment due and overdue keys', () => {
    expect(DedupeKeys.paymentDue('pay-10', '2026-11-04', 'finance-1')).toBe('payment_due:pay-10:2026-11-04:finance-1');
    expect(DedupeKeys.paymentOverdue('pay-10', '2026-11-04', 'leader-1')).toBe('payment_overdue:pay-10:2026-11-04:leader-1');
    expect(DedupeKeys.paymentConfirmed('pay-10', 'pr-1')).toBe('payment_confirmed:pay-10:pr-1');
  });

  it('builds correct task deadline key', () => {
    expect(DedupeKeys.taskDeadline('task-5', '2026-11-04', 'user-10')).toBe('task_deadline:task-5:2026-11-04:user-10');
  });
});

describe('Notification Type Metadata', () => {
  it('returns valid metadata for defined notification types', () => {
    const meta = getNotificationMeta('task_assigned');
    expect(meta.color).toBe('#3b82f6');
    expect(meta.label.ar).toBe('مهمة جديدة');
    expect(meta.defaultLink).toBe('/dashboard/tasks');
  });

  it('returns fallback for unknown notification type', () => {
    const fallback = getNotificationMeta('unknown_type_xyz');
    expect(fallback.color).toBe('#ffb800');
    expect(fallback.defaultLink).toBe('/dashboard');
  });
});

describe('Email Templates Rendering', () => {
  it('renders payment reminder in Arabic with RTL and overdue badge', () => {
    const html = renderPaymentReminderHtml({
      companyName: 'شركة النيل',
      agreementTitle: 'اتفاقية الرعاية الذهبية',
      amount: 50000,
      dueDate: '2026-11-10',
      isOverdue: true,
      lang: 'ar',
    });

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('شركة النيل');
    expect(html).toContain('اتفاقية الرعاية الذهبية');
    expect(html).toContain('متأخرة');
    expect(html).toContain('50,000');
  });

  it('renders payment reminder in English with LTR', () => {
    const html = renderPaymentReminderHtml({
      companyName: 'Nile Corp',
      agreementTitle: 'Gold Sponsor Agreement',
      amount: 25000,
      dueDate: '2026-11-15',
      isOverdue: false,
      lang: 'en',
    });

    expect(html).toContain('dir="ltr"');
    expect(html).toContain('Nile Corp');
    expect(html).toContain('Due Soon');
    expect(html).toContain('25,000 EGP');
  });

  it('escapes unsafe input to prevent HTML injection in email templates', () => {
    const html = renderPaymentReminderHtml({
      companyName: '<script>alert("hack")</script>',
      agreementTitle: 'Safe & Sound',
      amount: 1000,
      dueDate: '2026-11-10',
      lang: 'en',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders weekly report template with stats table', () => {
    const html = renderWeeklyReportHtml({
      committeeName: 'لجنة التكنولوجيا',
      stats: { attendanceRate: 92, tasksDone: 15, tasksLate: 1, pointsAwarded: 120 },
      weekLabel: 'الأسبوع الأول - نوفمبر',
      lang: 'ar',
    });

    expect(html).toContain('92%');
    expect(html).toContain('لجنة التكنولوجيا');
    expect(html).toContain('التقرير الأسبوعي للأداء والعمليات');
  });

  it('renders announcement digest template', () => {
    const html = renderAnnouncementDigestHtml({
      announcements: [
        { title: 'اجتماع هام للجميع', body: 'يرجى الحضور في موعد الجلسة', published_at: '2026-11-04' },
      ],
      lang: 'ar',
    });

    expect(html).toContain('اجتماع هام للجميع');
    expect(html).toContain('يرجى الحضور في موعد الجلسة');
  });
});
