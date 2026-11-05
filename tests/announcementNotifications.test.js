// tests/announcementNotifications.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DedupeKeys, NOTIFICATION_TYPES } from '../src/lib/notificationHelpers';

/**
 * Pure model of the trigger logic from 20261105092000_publish_announcement_notifications.sql
 */
function shouldTriggerFanOut(op, oldRow, newRow, now = new Date()) {
  const isNowOrPast = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() <= now.getTime();
  };

  const isNotExpired = (dateStr) => {
    if (!dateStr) return true;
    return new Date(dateStr).getTime() > now.getTime();
  };

  const newIsPublished = isNowOrPast(newRow.published_at) && isNotExpired(newRow.expires_at);

  if (!newIsPublished) {
    return false;
  }

  if (op === 'INSERT') {
    return true;
  }

  if (op === 'UPDATE') {
    const oldWasNotPublished =
      !oldRow.published_at || new Date(oldRow.published_at).getTime() > now.getTime();
    return oldWasNotPublished;
  }

  return false;
}

describe('Announcement Notifications Lifecycle & Deduplication', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20261105092000_publish_announcement_notifications.sql'
  );
  const testSqlPath = path.resolve(
    __dirname,
    '../supabase/tests/announcement_notifications_test.sql'
  );

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  const testSql = fs.readFileSync(testSqlPath, 'utf-8');

  describe('Database Migration (20261105092000_publish_announcement_notifications.sql)', () => {
    it('timestamp is later than all previous migrations (20261105091000)', () => {
      const filename = path.basename(migrationPath);
      const timestamp = Number(filename.split('_')[0]);
      expect(timestamp).toBeGreaterThan(20261105091000);
    });

    it('allows announcements to be saved as drafts by dropping not null on published_at', () => {
      expect(migrationSql).toMatch(
        /alter\s+table\s+public\.announcements\s+alter\s+column\s+published_at\s+drop\s+not\s+null/i
      );
    });

    it('creates an index on published_at for efficient scheduled queries', () => {
      expect(migrationSql).toMatch(/create\s+index\s+if\s+not\s+exists\s+announcements_published_at_idx/i);
    });

    it('defines private.fan_out_announcement_notifications with security definer and deduplication', () => {
      expect(migrationSql).toContain('function private.fan_out_announcement_notifications(');
      expect(migrationSql).toContain('security definer');
      expect(migrationSql).toContain("'announcement:' || ");
      expect(migrationSql).toContain('/dashboard/announcements');
    });

    it('defines private.trg_notify_announcement_published and trigger listening to both INSERT and UPDATE', () => {
      expect(migrationSql).toContain('function private.trg_notify_announcement_published()');
      expect(migrationSql).toContain('create trigger trg_announcements_notify');
      expect(migrationSql).toMatch(/after\s+insert\s+or\s+update/i);
    });

    it('defines private.publish_scheduled_announcements routine and logs to job_runs', () => {
      expect(migrationSql).toContain('function private.publish_scheduled_announcements()');
      expect(migrationSql).toContain("insert into public.job_runs (job, ok, details)");
      expect(migrationSql).toContain("'publish_scheduled_announcements'");
    });

    it('schedules periodic job via pg_cron with clean idempotency', () => {
      expect(migrationSql).toContain("cron.unschedule('publish-scheduled-announcements')");
      expect(migrationSql).toContain("cron.schedule(");
      expect(migrationSql).toContain("'publish-scheduled-announcements'");
      expect(migrationSql).toContain('private.publish_scheduled_announcements()');
    });

    it('strictly revokes permissions from public, anon, and authenticated', () => {
      expect(migrationSql).toMatch(
        /revoke\s+all\s+on\s+function\s+private\.fan_out_announcement_notifications.*from\s+public,\s*anon,\s*authenticated/i
      );
      expect(migrationSql).toMatch(
        /revoke\s+all\s+on\s+function\s+private\.trg_notify_announcement_published.*from\s+public,\s*anon,\s*authenticated/i
      );
      expect(migrationSql).toMatch(
        /revoke\s+all\s+on\s+function\s+private\.publish_scheduled_announcements.*from\s+public,\s*anon,\s*authenticated/i
      );
    });
  });

  describe('Dedupe Keys and Notification Contract Alignment', () => {
    it('uses dedupe key format matching DedupeKeys.announcement(announcementId, recipientId)', () => {
      const annId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
      const userId = '11111111-2222-3333-4444-555555555555';
      const key = DedupeKeys.announcement(annId, userId);
      expect(key).toBe(`announcement:${annId}:${userId}`);
    });

    it('announcement type is registered with dashboard link /dashboard/announcements', () => {
      expect(NOTIFICATION_TYPES.announcement).toBeDefined();
      expect(NOTIFICATION_TYPES.announcement.defaultLink).toBe('/dashboard/announcements');
    });
  });

  describe('Trigger Logic State Machine Pure Unit Tests', () => {
    const fixedNow = new Date('2026-11-05T12:00:00.000Z');

    it('Case 1: Immediate publish upon insert -> triggers fan-out', () => {
      const row = {
        title: 'Immediate Announcement',
        published_at: '2026-11-05T12:00:00.000Z',
        expires_at: null,
      };
      expect(shouldTriggerFanOut('INSERT', null, row, fixedNow)).toBe(true);
    });

    it('Case 2: Draft insert (published_at is null) -> does NOT trigger fan-out', () => {
      const row = {
        title: 'Draft Announcement',
        published_at: null,
        expires_at: null,
      };
      expect(shouldTriggerFanOut('INSERT', null, row, fixedNow)).toBe(false);
    });

    it('Case 3: Draft edit (remains published_at null) -> does NOT trigger fan-out', () => {
      const oldRow = {
        title: 'Draft Announcement',
        published_at: null,
        expires_at: null,
      };
      const newRow = {
        title: 'Draft Announcement - Edited',
        published_at: null,
        expires_at: null,
      };
      expect(shouldTriggerFanOut('UPDATE', oldRow, newRow, fixedNow)).toBe(false);
    });

    it('Case 4: Publishing existing draft (published_at set to now) -> triggers fan-out', () => {
      const oldRow = {
        title: 'Draft Announcement',
        published_at: null,
        expires_at: null,
      };
      const newRow = {
        title: 'Draft Announcement',
        published_at: '2026-11-05T12:00:00.000Z',
        expires_at: null,
      };
      expect(shouldTriggerFanOut('UPDATE', oldRow, newRow, fixedNow)).toBe(true);
    });

    it('Case 5: Scheduled announcement insert (published_at in future) -> does NOT trigger fan-out', () => {
      const row = {
        title: 'Scheduled Announcement',
        published_at: '2026-11-05T15:00:00.000Z',
        expires_at: null,
      };
      expect(shouldTriggerFanOut('INSERT', null, row, fixedNow)).toBe(false);
    });

    it('Case 6: Edits to scheduled announcement (still in future) -> does NOT trigger fan-out', () => {
      const oldRow = {
        title: 'Scheduled Announcement',
        published_at: '2026-11-05T15:00:00.000Z',
        expires_at: null,
      };
      const newRow = {
        title: 'Scheduled Announcement Rescheduled',
        published_at: '2026-11-05T16:00:00.000Z',
        expires_at: null,
      };
      expect(shouldTriggerFanOut('UPDATE', oldRow, newRow, fixedNow)).toBe(false);
    });

    it('Case 7: Editing an already-published announcement -> does NOT trigger duplicate fan-out', () => {
      const oldRow = {
        title: 'Published Announcement',
        published_at: '2026-11-05T10:00:00.000Z',
        expires_at: null,
      };
      const newRow = {
        title: 'Published Announcement - Fixed Typo',
        published_at: '2026-11-05T10:00:00.000Z',
        expires_at: null,
      };
      expect(shouldTriggerFanOut('UPDATE', oldRow, newRow, fixedNow)).toBe(false);
    });

    it('Case 8: Rescheduling scheduled announcement to NOW early -> triggers fan-out', () => {
      const oldRow = {
        title: 'Scheduled Announcement',
        published_at: '2026-11-05T18:00:00.000Z',
        expires_at: null,
      };
      const newRow = {
        title: 'Scheduled Announcement',
        published_at: '2026-11-05T12:00:00.000Z',
        expires_at: null,
      };
      expect(shouldTriggerFanOut('UPDATE', oldRow, newRow, fixedNow)).toBe(true);
    });

    it('Case 9: Expired announcement -> does NOT trigger fan-out', () => {
      const row = {
        title: 'Expired Announcement',
        published_at: '2026-11-05T10:00:00.000Z',
        expires_at: '2026-11-05T11:00:00.000Z', // already expired before fixedNow (12:00)
      };
      expect(shouldTriggerFanOut('INSERT', null, row, fixedNow)).toBe(false);
    });
  });

  describe('PostgreSQL Test Script (supabase/tests/announcement_notifications_test.sql)', () => {
    it('is enclosed in a transactional block (begin ... rollback)', () => {
      expect(testSql).toMatch(/\bbegin;/i);
      expect(testSql.trim().endsWith('rollback;')).toBe(true);
    });

    it('tests immediate publish, draft insert, draft edits, publishing draft, scheduled publish, and repeated execution', () => {
      expect(testSql).toContain('1. Immediate Publish generates notifications');
      expect(testSql).toContain('2. Draft insert dispatches 0 notifications');
      expect(testSql).toContain('3. Edits to draft dispatch 0 notifications');
      expect(testSql).toContain('4. Publishing existing draft triggers fan-out');
      expect(testSql).toContain('5. Scheduled announcement insert dispatches 0 notifications');
      expect(testSql).toContain('6. Rescheduling/editing future announcement dispatches 0 notifications');
      expect(testSql).toContain('7. Scheduled routine notifies target committee member');
      expect(testSql).toContain('8a. Second run of scheduled routine does NOT create duplicate notifications');
      expect(testSql).toContain('8b. Editing an already-published announcement does NOT duplicate notifications');
      expect(testSql).toContain('8c. Direct re-invocation of fan_out is completely idempotent');
    });

    it('raises an exception with non-zero SQL error on any test failure', () => {
      expect(testSql).toContain("raise exception 'Announcement Notifications Test FAILED with % failure(s)");
    });
  });
});
