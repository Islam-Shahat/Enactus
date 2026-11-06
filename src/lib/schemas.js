// src/lib/schemas.js
import { z } from 'zod';
import { parseStudyYear } from './formHelpers';

export const recruitmentFormSchema = z.object({
  fullName: z.string().trim().min(3, { message: 'الاسم يجب ألا يقل عن 3 أحرف' }).max(120),
  email: z.string().trim().email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }).max(150),
  phone: z.string().trim().min(8, { message: 'يرجى إدخال رقم هاتف صحيح (8 أرقام على الأقل)' }).max(25),
  faculty: z.string().trim().min(2, { message: 'يرجى اختيار الكلية' }).max(100),
  studyYear: z.union([z.number(), z.string()]).transform(parseStudyYear),
  committee: z.string().trim().min(1, { message: 'يرجى اختيار اللجنة' }),
  impactGoal: z.string().trim().max(2000).optional(),
  honeypot: z.string().optional(),
});

export const contactFormSchema = z.object({
  fullName: z.string().trim().min(2, { message: 'الاسم مطلوب' }).max(120),
  email: z.string().trim().email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }).max(150),
  phone: z.string().trim().min(8, { message: 'يرجى إدخال رقم هاتف صحيح (8 أرقام على الأقل)' }).max(25),
  subject: z.string().trim().min(2, { message: 'موضوع الاستفسار مطلوب' }).max(200),
  message: z.string().trim().min(5, { message: 'نص الرسالة يجب ألا يقل عن 5 أحرف' }).max(3000),
  honeypot: z.string().optional(),
});

export const sponsorFormSchema = z.object({
  companyName: z.string().trim().min(2, { message: 'اسم المؤسسة أو الشركة مطلوب' }).max(150),
  contactPerson: z.string().trim().min(2, { message: 'اسم ممثل الجهة مطلوب' }).max(120),
  email: z.string().trim().email({ message: 'يرجى إدخال بريد إلكتروني رسمي صحيح' }).max(150),
  phone: z.string().trim().min(8, { message: 'يرجى إدخال رقم هاتف للتواصل' }).max(30),
  tier: z.string().trim().min(1, { message: 'يرجى اختيار باقة الرعاية' }),
  message: z.string().trim().min(5, { message: 'يرجى كتابة تفاصيل الاستفسار أو الأهداف' }).max(3000),
  honeypot: z.string().optional(),
});

