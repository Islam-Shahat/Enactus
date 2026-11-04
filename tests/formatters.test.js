import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatCurrency,
  formatNumber,
  formatRelativeTime,
} from '../src/lib/formatters';

describe('Intl Formatters', () => {
  it('formats dates in Arabic and English with Latin digits', () => {
    const d = new Date('2026-11-04T12:00:00Z');
    const arStr = formatDate(d, 'ar');
    const enStr = formatDate(d, 'en');

    expect(arStr).toContain('2026');
    expect(enStr).toContain('2026');
    // Ensure Latin numerals in Arabic (not Hindi numerals)
    expect(arStr).toMatch(/\d{4}/);
  });

  it('formats currency in EGP for both languages', () => {
    const egpAr = formatCurrency(1500, 'ar');
    const egpEn = formatCurrency(1500, 'en');

    expect(egpAr).toContain('ج.م');
    expect(egpAr).toContain('1,500.00');
    expect(egpEn).toContain('EGP');
    expect(egpEn).toContain('1,500.00');
  });

  it('formats numbers with Latin numerals', () => {
    const nAr = formatNumber(1000000, 'ar');
    const nEn = formatNumber(1000000, 'en');
    expect(nAr).toBe('1,000,000');
    expect(nEn).toBe('1,000,000');
  });

  it('formats relative time', () => {
    const pastHour = new Date(Date.now() - 3600000 * 2);
    const relAr = formatRelativeTime(pastHour, 'ar');
    const relEn = formatRelativeTime(pastHour, 'en');

    expect(relAr).toBeTruthy();
    expect(relEn).toContain('2 hours ago');
  });
});

