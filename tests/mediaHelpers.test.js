import { describe, it, expect } from 'vitest';
import {
  canPerformPostAction,
  getAvailableTransitions,
  getMonthCalendarMatrix,
  getPostsForDay,
  POST_PLATFORMS,
  POST_STATUSES,
} from '../src/lib/mediaHelpers';

describe('mediaHelpers', () => {
  const creatorUser = {
    userId: 'user-creator',
    isSuperAdmin: false,
    isHead: false,
    isMediaAdmin: false,
    isExec: false,
    roles: ['member'],
  };

  const mediaHeadUser = {
    userId: 'user-head',
    isSuperAdmin: false,
    isHead: true,
    isMediaAdmin: false,
    isExec: false,
    roles: ['committee_head'],
  };

  const execUser = {
    userId: 'user-exec',
    isSuperAdmin: true,
    isHead: false,
    isMediaAdmin: false,
    isExec: true,
    roles: ['president'],
  };

  const otherMember = {
    userId: 'user-other',
    isSuperAdmin: false,
    isHead: false,
    isMediaAdmin: false,
    isExec: false,
    roles: ['member'],
  };

  describe('canPerformPostAction', () => {
    const draftPost = {
      id: 'post-1',
      created_by: 'user-creator',
      status: 'draft',
    };

    const reviewPost = {
      id: 'post-2',
      created_by: 'user-creator',
      status: 'review',
    };

    const approvedPost = {
      id: 'post-3',
      created_by: 'user-creator',
      status: 'approved',
    };

    it('allows creator to submit draft for review', () => {
      expect(canPerformPostAction('submit_review', draftPost, creatorUser)).toBe(true);
      expect(canPerformPostAction('submit_review', draftPost, otherMember)).toBe(false);
    });

    it('disallows normal creator from approving or publishing directly', () => {
      expect(canPerformPostAction('approve', reviewPost, creatorUser)).toBe(false);
      expect(canPerformPostAction('publish', approvedPost, creatorUser)).toBe(false);
    });

    it('allows media head and exec to approve, schedule, and publish', () => {
      expect(canPerformPostAction('approve', reviewPost, mediaHeadUser)).toBe(true);
      expect(canPerformPostAction('schedule', approvedPost, mediaHeadUser)).toBe(true);
      expect(canPerformPostAction('publish', approvedPost, mediaHeadUser)).toBe(true);

      expect(canPerformPostAction('approve', reviewPost, execUser)).toBe(true);
      expect(canPerformPostAction('publish', approvedPost, execUser)).toBe(true);
    });

    it('allows creator to delete only draft posts', () => {
      expect(canPerformPostAction('delete', draftPost, creatorUser)).toBe(true);
      expect(canPerformPostAction('delete', reviewPost, creatorUser)).toBe(false);
      expect(canPerformPostAction('delete', reviewPost, execUser)).toBe(true);
    });
  });

  describe('getAvailableTransitions', () => {
    it('returns submit_review for creator on draft post', () => {
      const draftPost = { id: 'p1', created_by: 'user-creator', status: 'draft' };
      const transitions = getAvailableTransitions(draftPost, creatorUser);
      expect(transitions.map((t) => t.action)).toContain('submit_review');
      expect(transitions.map((t) => t.action)).not.toContain('approve');
    });

    it('returns approve, schedule, publish for leadership on review post', () => {
      const reviewPost = { id: 'p2', created_by: 'user-creator', status: 'review' };
      const transitions = getAvailableTransitions(reviewPost, execUser);
      expect(transitions.map((t) => t.action)).toContain('approve');
      expect(transitions.map((t) => t.action)).toContain('publish');
    });
  });

  describe('getMonthCalendarMatrix', () => {
    it('generates a grid of days for a month in multiple of 7', () => {
      // November 2026: 30 days
      const days = getMonthCalendarMatrix(2026, 10);
      expect(days.length % 7).toBe(0);
      expect(days.length).toBeGreaterThanOrEqual(28);

      const currentMonthDays = days.filter((d) => d.isCurrentMonth);
      expect(currentMonthDays.length).toBe(30);
    });
  });

  describe('getPostsForDay', () => {
    it('filters posts matching day by scheduled_at or published_at', () => {
      const posts = [
        { id: '1', scheduled_at: '2026-11-15T10:00:00Z', published_at: null },
        { id: '2', scheduled_at: null, published_at: '2026-11-15T18:00:00Z' },
        { id: '3', scheduled_at: '2026-11-20T10:00:00Z', published_at: null },
      ];

      const match15 = getPostsForDay(posts, '2026-11-15');
      expect(match15.map((p) => p.id)).toEqual(['1', '2']);

      const match20 = getPostsForDay(posts, '2026-11-20');
      expect(match20.map((p) => p.id)).toEqual(['3']);
    });
  });

  describe('Constants', () => {
    it('has all 7 platforms and 6 statuses', () => {
      expect(POST_PLATFORMS.map((p) => p.key)).toEqual([
        'facebook',
        'instagram',
        'linkedin',
        'tiktok',
        'x',
        'youtube',
        'other',
      ]);
      expect(POST_STATUSES.map((s) => s.key)).toEqual([
        'draft',
        'review',
        'approved',
        'scheduled',
        'published',
        'cancelled',
      ]);
    });
  });
});

