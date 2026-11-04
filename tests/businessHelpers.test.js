import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  parseMoney,
  getPaymentDueStatus,
  calculateDeliverableProgress,
  COMPANY_STAGES,
  AGREEMENT_STATUSES,
  PAYMENT_KINDS,
  PAYMENT_METHODS,
} from '../src/lib/businessHelpers';

describe('businessHelpers', () => {
  describe('formatMoney', () => {
    it('formats numbers correctly in Arabic with EGP suffix', () => {
      const formatted = formatMoney(15000, 'ar');
      expect(formatted).toContain('ج.م');
      expect(formatted).toContain('15');
    });

    it('formats numbers correctly in English with EGP prefix', () => {
      const formatted = formatMoney(15000.5, 'en');
      expect(formatted).toBe('EGP 15,000.50');
    });

    it('handles zero, string numbers and negative numbers safely', () => {
      expect(formatMoney(0, 'en')).toBe('EGP 0.00');
      expect(formatMoney('250.75', 'en')).toBe('EGP 250.75');
      expect(formatMoney(null, 'en')).toBe('EGP 0.00');
    });
  });

  describe('parseMoney', () => {
    it('parses formatted numeric strings', () => {
      expect(parseMoney('15,000.50')).toBe(15000.5);
      expect(parseMoney('EGP 250.75')).toBe(250.75);
      expect(parseMoney('100.999')).toBe(101);
      expect(parseMoney('')).toBe(0);
      expect(parseMoney(null)).toBe(0);
    });
  });

  describe('getPaymentDueStatus', () => {
    const fixedNow = new Date('2026-11-04T12:00:00Z');

    it('returns paid for already paid payments', () => {
      expect(getPaymentDueStatus('2026-10-01', 'paid', fixedNow)).toEqual({
        status: 'paid',
        daysDiff: 0,
      });
    });

    it('detects overdue payments past due date', () => {
      const res = getPaymentDueStatus('2026-11-01', 'pending', fixedNow);
      expect(res.status).toBe('overdue');
      expect(res.daysDiff).toBe(3);
    });

    it('detects due soon payments due within 7 days', () => {
      const res = getPaymentDueStatus('2026-11-08', 'pending', fixedNow);
      expect(res.status).toBe('due_soon');
      expect(res.daysDiff).toBe(4);
    });

    it('detects upcoming payments due further out', () => {
      const res = getPaymentDueStatus('2026-11-20', 'pending', fixedNow);
      expect(res.status).toBe('upcoming');
      expect(res.daysDiff).toBe(16);
    });
  });

  describe('calculateDeliverableProgress', () => {
    it('calculates completed percentage correctly', () => {
      expect(calculateDeliverableProgress(2, 4)).toEqual({
        done: 2,
        required: 4,
        percentage: 50,
        isComplete: false,
      });

      expect(calculateDeliverableProgress(5, 5)).toEqual({
        done: 5,
        required: 5,
        percentage: 100,
        isComplete: true,
      });

      expect(calculateDeliverableProgress(7, 5)).toEqual({
        done: 7,
        required: 5,
        percentage: 100,
        isComplete: true,
      });
    });
  });

  describe('Metadata constants', () => {
    it('has all 7 company stages', () => {
      expect(COMPANY_STAGES.map((s) => s.key)).toEqual([
        'lead',
        'contacted',
        'negotiation',
        'signed',
        'delivered',
        'renewal',
        'lost',
      ]);
    });

    it('has all agreement statuses', () => {
      expect(AGREEMENT_STATUSES.map((s) => s.key)).toEqual([
        'draft',
        'active',
        'completed',
        'cancelled',
      ]);
    });

    it('contains payment kinds and methods matching Postgres checks', () => {
      expect(Object.keys(PAYMENT_KINDS)).toEqual(['deposit', 'installment', 'final']);
      expect(Object.keys(PAYMENT_METHODS)).toEqual(['cash', 'bank_transfer', 'wallet', 'cheque']);
    });
  });
});

