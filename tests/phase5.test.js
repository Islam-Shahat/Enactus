// tests/phase5.test.js
import { describe, it, expect } from 'vitest';
import {
  validatePdfBytes,
  validatePdfUpload,
  sanitizeText,
  parseStudyYear,
  isRateLimitExceeded,
} from '../src/lib/formHelpers.js';
import {
  recruitmentFormSchema,
  contactFormSchema,
  sponsorFormSchema,
} from '../src/lib/schemas.js';

describe('Phase 5 Form Helpers & Security Logic', () => {
  describe('PDF Magic Bytes & Mime Validator', () => {
    it('recognizes valid PDF magic bytes (%PDF)', () => {
      // 0x25 = %, 0x50 = P, 0x44 = D, 0x46 = F
      const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      expect(validatePdfBytes(validPdfBytes)).toBe(true);
    });

    it('rejects invalid or non-PDF binary data', () => {
      const invalidBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
      expect(validatePdfBytes(invalidBytes)).toBe(false);
      expect(validatePdfBytes(new Uint8Array([]))).toBe(false);
      expect(validatePdfBytes(null)).toBe(false);
    });

    it('enforces 5 MB size limit and mime type', () => {
      const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const validFile = {
        size: 1024 * 100, // 100 KB
        type: 'application/pdf',
        bytes: validPdfBytes,
      };
      expect(validatePdfUpload(validFile).valid).toBe(true);

      const oversizedFile = {
        size: 6 * 1024 * 1024, // 6 MB
        type: 'application/pdf',
        bytes: validPdfBytes,
      };
      expect(validatePdfUpload(oversizedFile).valid).toBe(false);
      expect(validatePdfUpload(oversizedFile).error).toMatch(/exceeds/i);

      const wrongMime = {
        size: 1000,
        type: 'image/jpeg',
        bytes: validPdfBytes,
      };
      expect(validatePdfUpload(wrongMime).valid).toBe(false);
    });
  });

  describe('Text Sanitizer & Control Character Stripper', () => {
    it('removes ASCII control characters while keeping Arabic and regular whitespace', () => {
      const dirty = 'مرحبا بكم \x00\x08في كتيبة \x1Bإيناكوس قنا!\nسطر جديد';
      const clean = sanitizeText(dirty);
      expect(clean).toBe('مرحبا بكم في كتيبة إيناكوس قنا!\nسطر جديد');
      expect(clean).not.toContain('\x00');
      expect(clean).not.toContain('\x08');
      expect(clean).not.toContain('\x1B');
    });

    it('handles empty or non-string values gracefully', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
      expect(sanitizeText(123)).toBe('');
    });
  });

  describe('Study Year Parser', () => {
    it('parses Arabic year strings into integer smallints', () => {
      expect(parseStudyYear('الفرقة الأولى')).toBe(1);
      expect(parseStudyYear('الفرقة الثانية')).toBe(2);
      expect(parseStudyYear('الفرقة الثالثة')).toBe(3);
      expect(parseStudyYear('الفرقة الرابعة')).toBe(4);
      expect(parseStudyYear('الفرقة الخامسة / دراسات عليا')).toBe(5);
    });

    it('parses English year strings into integer smallints', () => {
      expect(parseStudyYear('1st Year (Freshman)')).toBe(1);
      expect(parseStudyYear('2nd Year (Sophomore)')).toBe(2);
      expect(parseStudyYear('3rd Year (Junior)')).toBe(3);
      expect(parseStudyYear('4th Year (Senior)')).toBe(4);
    });

    it('clamps numeric inputs between 1 and 8', () => {
      expect(parseStudyYear(3)).toBe(3);
      expect(parseStudyYear(0)).toBe(1);
      expect(parseStudyYear(10)).toBe(8);
    });
  });

  describe('Rate Limiting Logic', () => {
    it('correctly flags rate limit breach at or above threshold', () => {
      expect(isRateLimitExceeded(0, 3)).toBe(false);
      expect(isRateLimitExceeded(2, 3)).toBe(false);
      expect(isRateLimitExceeded(3, 3)).toBe(true);
      expect(isRateLimitExceeded(5, 3)).toBe(true);
    });
  });

  describe('Zod Form Schemas', () => {
    it('validates a valid recruitment submission', () => {
      const validRecruitment = {
        fullName: 'أحمد محمود مصطفى',
        email: 'ahmed@example.com',
        phone: '01012345678',
        faculty: 'كلية التجارة',
        studyYear: 'الفرقة الثانية',
        committee: 'إدارة المشاريع التنموية (PM)',
        impactGoal: 'تطوير مشاريع مستدامة',
      };
      const res = recruitmentFormSchema.safeParse(validRecruitment);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.studyYear).toBe(2);
      }
    });

    it('rejects invalid email or short phone in recruitment', () => {
      const invalidRecruitment = {
        fullName: 'أحمد',
        email: 'not-an-email',
        phone: '123',
        faculty: 'كلية التجارة',
        studyYear: '1',
        committee: 'PM',
      };
      const res = recruitmentFormSchema.safeParse(invalidRecruitment);
      expect(res.success).toBe(false);
    });

    it('validates contact and sponsor form schemas', () => {
      const validContact = {
        fullName: 'سارة علي',
        email: 'sara@example.com',
        subject: 'استفسار عن الشراكات',
        message: 'نود بحث إمكانية التعاون مع إيناكوس قنا.',
      };
      expect(contactFormSchema.safeParse(validContact).success).toBe(true);

      const validSponsor = {
        companyName: 'شركة النيل للتقنية',
        contactPerson: 'م. خالد أحمد',
        email: 'sponsor@company.com',
        phone: '01123456789',
        tier: 'الباقة الذهبية',
        message: 'تفاصيل الدعم اللوجستي والرعايات للموسم الحالي.',
      };
      expect(sponsorFormSchema.safeParse(validSponsor).success).toBe(true);
    });
  });
});

