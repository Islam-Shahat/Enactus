// tests/pointHelpers.test.js
import { describe, it, expect } from 'vitest';
import {
  isDisputeEligible,
  getRemainingDisputeTime,
  formatPointValue,
  calculateLeaderboardRanks,
  DISPUTE_WINDOW_MS,
} from '../src/lib/pointHelpers.js';

describe('Point Helpers', () => {
  const now = new Date('2026-11-04T12:00:00Z');

  describe('isDisputeEligible', () => {
    it('returns true for an unvoided penalty created 24 hours ago without prior dispute', () => {
      const entry = {
        type: 'penalty',
        created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        voided_at: null,
        point_disputes: [],
      };
      expect(isDisputeEligible(entry, now)).toBe(true);
    });

    it('returns false for bonus entries', () => {
      const entry = {
        type: 'bonus',
        created_at: new Date(now.getTime() - 1000).toISOString(),
        voided_at: null,
      };
      expect(isDisputeEligible(entry, now)).toBe(false);
    });

    it('returns false for voided entries', () => {
      const entry = {
        type: 'penalty',
        created_at: new Date(now.getTime() - 1000).toISOString(),
        voided_at: now.toISOString(),
      };
      expect(isDisputeEligible(entry, now)).toBe(false);
    });

    it('returns false when created more than 48 hours ago', () => {
      const entry = {
        type: 'penalty',
        created_at: new Date(now.getTime() - (48 * 60 * 60 * 1000 + 1000)).toISOString(),
        voided_at: null,
      };
      expect(isDisputeEligible(entry, now)).toBe(false);
    });

    it('returns false if a dispute is already recorded', () => {
      const entry = {
        type: 'penalty',
        created_at: new Date(now.getTime() - 1000).toISOString(),
        voided_at: null,
        point_disputes: [{ id: 'disp-1', status: 'pending' }],
      };
      expect(isDisputeEligible(entry, now)).toBe(false);
    });
  });

  describe('getRemainingDisputeTime', () => {
    it('computes exact remaining hours and minutes', () => {
      // Created 10.5 hours ago -> remaining 37.5 hours (37h 30m)
      const createdAt = new Date(now.getTime() - 10.5 * 60 * 60 * 1000).toISOString();
      const res = getRemainingDisputeTime(createdAt, now);
      expect(res.expired).toBe(false);
      expect(res.hours).toBe(37);
      expect(res.minutes).toBe(30);
    });

    it('returns expired = true when window exceeded', () => {
      const createdAt = new Date(now.getTime() - (DISPUTE_WINDOW_MS + 5000)).toISOString();
      const res = getRemainingDisputeTime(createdAt, now);
      expect(res.expired).toBe(true);
      expect(res.remainingMs).toBe(0);
    });
  });

  describe('formatPointValue', () => {
    it('prefixes bonus with + and penalty with -', () => {
      expect(formatPointValue('bonus', 15)).toBe('+15');
      expect(formatPointValue('penalty', 10)).toBe('-10');
      expect(formatPointValue('penalty', -10)).toBe('-10');
    });
  });

  describe('calculateLeaderboardRanks', () => {
    it('assigns ranks descending with tie handling', () => {
      const scores = [
        { user_id: 'u1', total: 50, bonus_total: 60 },
        { user_id: 'u2', total: 100, bonus_total: 100 },
        { user_id: 'u3', total: 50, bonus_total: 50 },
        { user_id: 'u4', total: 20, bonus_total: 20 },
      ];

      const ranked = calculateLeaderboardRanks(scores);
      expect(ranked[0].user_id).toBe('u2');
      expect(ranked[0].rank).toBe(1);

      expect(ranked[1].user_id).toBe('u1');
      expect(ranked[1].rank).toBe(2);

      expect(ranked[2].user_id).toBe('u3');
      expect(ranked[2].rank).toBe(2); // Tied on total

      expect(ranked[3].user_id).toBe('u4');
      expect(ranked[3].rank).toBe(4);
    });
  });
});

