// supabase/functions/_shared/schemas.ts
import { z } from 'npm:zod@4.6.7';

export const submitApplicationSchema = z.object({
  fullName: z.string().trim().min(3, 'الاسم يجب ألا يقل عن 3 أحرف').max(120),
  email: z.string().trim().email('البريد الإلكتروني غير صالح').max(150),
  phone: z.string().trim().min(8, 'رقم الهاتف يجب ألا يقل عن 8 أرقام').max(25),
  faculty: z.string().trim().min(2, 'يرجى اختيار الكلية').max(100),
  studyYear: z.union([z.number().int().min(1).max(8), z.string()]).transform((val) => {
    if (typeof val === 'number') return val;
    const match = val.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    if (val.includes('أولى') || val.includes('1')) return 1;
    if (val.includes('ثانية') || val.includes('2')) return 2;
    if (val.includes('ثالثة') || val.includes('3')) return 3;
    if (val.includes('رابعة') || val.includes('4')) return 4;
    if (val.includes('خامسة') || val.includes('5')) return 5;
    return 1;
  }),
  committeeSlug: z.string().trim().min(1).max(100).optional(),
  firstChoiceSlug: z.string().trim().min(1).max(100).optional(),
  secondChoiceSlug: z.string().trim().min(1).max(100).optional(),
  universityId: z.string().trim().max(50).optional(),
  motivation: z.string().trim().max(2000).optional(),
  answers: z.record(z.string(), z.unknown()).optional().default({}),
  turnstileToken: z.string().optional(),
  honeypot: z.string().optional(),
  cvBase64: z.string().optional(),
  cvFileName: z.string().optional(),
});

export const contactFormSchema = z.object({
  kind: z.enum(['contact', 'sponsor', 'partnership', 'feedback']).default('contact'),
  fullName: z.string().trim().min(2, 'الاسم مطلوب').max(120),
  email: z.string().trim().email('البريد الإلكتروني غير صالح').max(150),
  phone: z.string().trim().max(30).optional(),
  organization: z.string().trim().max(150).optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(5, 'نص الرسالة مطلوب ويجب ألا يقل عن 5 أحرف').max(3000),
  packageInterest: z.string().trim().max(100).optional(),
  turnstileToken: z.string().optional(),
  honeypot: z.string().optional(),
});

export const convertApplicationSchema = z.object({
  applicationId: z.string().uuid('معرف الطلب غير صالح'),
  committeeSlug: z.string().trim().min(1, 'معرف أو كود اللجنة مطلوب'),
  position: z.enum(['member', 'vice', 'head', 'coordinator']).default('member'),
});

export const createMemberSchema = z.object({
  fullNameAr: z.string().trim().min(3, 'الاسم بالعربية يجب ألا يقل عن 3 أحرف').max(150),
  fullNameEn: z.string().trim().max(150).optional(),
  nationalId: z.string().trim().regex(/^\d{14}$/, 'الرقم القومي يجب أن يتكون من 14 رقماً'),
  phone: z.string().trim().max(25).optional(),
  email: z.string().trim().email('البريد الإلكتروني غير صالح').optional().or(z.literal('')),
  committeeId: z.string().uuid('يرجى اختيار لجنة صالحة'),
  position: z.enum(['member', 'head', 'vice', 'coordinator']).default('member'),
  faculty: z.string().trim().max(120).optional(),
  studyYear: z.union([z.number().int().min(1).max(8), z.string()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return 1;
    if (typeof val === 'number') return val;
    const match = val.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    if (val.includes('أولى') || val.includes('1')) return 1;
    if (val.includes('ثانية') || val.includes('2')) return 2;
    if (val.includes('ثالثة') || val.includes('3')) return 3;
    if (val.includes('رابعة') || val.includes('4')) return 4;
    if (val.includes('خامسة') || val.includes('5')) return 5;
    return 1;
  }),
  birthDate: z.string().trim().max(30).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  governorate: z.string().trim().max(60).optional(),
  seasonId: z.string().uuid().optional(),
});

