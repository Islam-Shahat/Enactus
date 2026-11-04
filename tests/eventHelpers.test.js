import { describe, it, expect } from 'vitest';
import {
  calculateEventCapacity,
  calculateAverageRating,
  generateEventSlug,
  EVENT_STATUSES,
  REGISTRATION_STATUSES,
  VOLUNTEER_STATUSES,
} from '../src/lib/eventHelpers';

describe('eventHelpers', () => {
  describe('calculateEventCapacity', () => {
    it('handles unlimited capacity', () => {
      const res = calculateEventCapacity(null, 50);
      expect(res.capacity).toBeNull();
      expect(res.isFull).toBe(false);
      expect(res.remaining).toBeNull();
    });

    it('calculates remaining and percentages for finite capacity', () => {
      const res = calculateEventCapacity(100, 45);
      expect(res.capacity).toBe(100);
      expect(res.remaining).toBe(55);
      expect(res.percentage).toBe(45);
      expect(res.isFull).toBe(false);
    });

    it('flags full capacity and waitlist triggers', () => {
      const res = calculateEventCapacity(100, 100);
      expect(res.remaining).toBe(0);
      expect(res.isFull).toBe(true);

      const overflow = calculateEventCapacity(100, 120);
      expect(overflow.isFull).toBe(true);
      expect(overflow.remaining).toBe(0);
      expect(overflow.percentage).toBe(100);
    });
  });

  describe('calculateAverageRating', () => {
    it('returns zeroes for empty feedback list', () => {
      expect(calculateAverageRating([])).toEqual({
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    });

    it('calculates correct average and distribution', () => {
      const feedback = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
        { rating: 3 },
      ];
      const res = calculateAverageRating(feedback);
      expect(res.count).toBe(4);
      expect(res.average).toBe(4.3);
      expect(res.distribution[5]).toBe(2);
      expect(res.distribution[4]).toBe(1);
      expect(res.distribution[3]).toBe(1);
    });
  });

  describe('generateEventSlug', () => {
    it('generates Arabic slug correctly', () => {
      const slug = generateEventSlug('المؤتمر السنوي لريادة الأعمال 2026');
      expect(slug).toBe('المؤتمر-السنوي-لريادة-الأعمال-2026');
    });

    it('generates English slug with punctuation stripped', () => {
      const slug = generateEventSlug('Annual Mega Event: 2026 Edition!');
      expect(slug).toBe('annual-mega-event-2026-edition');
    });
  });

  describe('Statuses metadata', () => {
    it('has all event statuses matching DB constraints', () => {
      expect(EVENT_STATUSES.map((s) => s.key)).toEqual([
        'draft',
        'published',
        'ongoing',
        'completed',
        'cancelled',
      ]);
    });

    it('has all registration statuses matching DB constraints', () => {
      expect(REGISTRATION_STATUSES.map((s) => s.key)).toEqual([
        'registered',
        'waitlist',
        'attended',
        'cancelled',
      ]);
    });

    it('has all volunteer statuses matching DB constraints', () => {
      expect(VOLUNTEER_STATUSES.map((s) => s.key)).toEqual([
        'requested',
        'confirmed',
        'declined',
      ]);
    });
  });
});

