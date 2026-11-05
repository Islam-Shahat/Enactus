// tests/nationalIdHelper.test.js
import { describe, it, expect } from 'vitest';
import {
  parseEgyptianNationalId,
  isValidMemberCode,
  formatMemberCode,
  EGYPTIAN_GOVERNORATES,
} from '../src/lib/nationalIdHelper';

describe('Egyptian National ID & Member Code Helpers', () => {
  describe('parseEgyptianNationalId', () => {
    it('accurately parses a valid 2000s Egyptian National ID from Qena', () => {
      // 3 = 2000s, 03 = 2003, 08 = August, 15 = 15th, 27 = Qena, 123 = seq, 1 = check digit (digit 13 is 3 -> male)
      const nid = '30308152700315';
      const res = parseEgyptianNationalId(nid);

      expect(res.isValid).toBe(true);
      expect(res.birthYear).toBe(2003);
      expect(res.birthMonth).toBe(8);
      expect(res.birthDay).toBe(15);
      expect(res.birthDateStr).toBe('2003-08-15');
      expect(res.governorate.ar).toBe('قنا');
      expect(res.governorate.en).toBe('Qena');
      expect(res.gender.key).toBe('male');
      expect(res.age).toBeGreaterThanOrEqual(20);
    });

    it('accurately parses a 1990s female National ID from Cairo', () => {
      // 2 = 1900s, 99 = 1999, 12 = December, 25 = 25th, 01 = Cairo, seq 002 -> digit 13 is 2 (even) -> female
      const nid = '29912250100028';
      const res = parseEgyptianNationalId(nid);

      expect(res.isValid).toBe(true);
      expect(res.birthYear).toBe(1999);
      expect(res.birthMonth).toBe(12);
      expect(res.birthDay).toBe(25);
      expect(res.birthDateStr).toBe('1999-12-25');
      expect(res.governorate.ar).toBe('القاهرة');
      expect(res.gender.key).toBe('female');
      expect(res.age).toBeGreaterThanOrEqual(24);
    });

    it('rejects invalid inputs, bad length, or impossible dates', () => {
      expect(parseEgyptianNationalId('').isValid).toBe(false);
      expect(parseEgyptianNationalId('12345').isValid).toBe(false);
      expect(parseEgyptianNationalId('abc30308152700').isValid).toBe(false);
      // Century 1 is invalid
      expect(parseEgyptianNationalId('10308152700315').isValid).toBe(false);
      // Month 13 is invalid
      expect(parseEgyptianNationalId('30313152700315').isValid).toBe(false);
      // Day 32 is invalid
      expect(parseEgyptianNationalId('30308322700315').isValid).toBe(false);
      // Feb 30 is invalid
      expect(parseEgyptianNationalId('30302302700315').isValid).toBe(false);
    });
  });

  describe('Member Code Utilities', () => {
    it('formats 7-digit code with year prefix and 3-digit zero-padded sequence', () => {
      expect(formatMemberCode('2026', 1)).toBe('2026001');
      expect(formatMemberCode('2026', 2)).toBe('2026002');
      expect(formatMemberCode('2026', 42)).toBe('2026042');
      expect(formatMemberCode('2026', 999)).toBe('2026999');
    });

    it('validates 7-digit member code strings', () => {
      expect(isValidMemberCode('2026001')).toBe(true);
      expect(isValidMemberCode('2026002')).toBe(true);
      expect(isValidMemberCode('202600')).toBe(false); // 6 digits
      expect(isValidMemberCode('20260001')).toBe(false); // 8 digits
      expect(isValidMemberCode('202600A')).toBe(false); // non-digits
      expect(isValidMemberCode(null)).toBe(false);
    });

    it('exports governorate mapping including Upper Egypt governorates', () => {
      expect(EGYPTIAN_GOVERNORATES['27'].ar).toBe('قنا');
      expect(EGYPTIAN_GOVERNORATES['28'].ar).toBe('أسوان');
      expect(EGYPTIAN_GOVERNORATES['29'].ar).toBe('الأقصر');
      expect(EGYPTIAN_GOVERNORATES['01'].ar).toBe('القاهرة');
    });
  });
});
