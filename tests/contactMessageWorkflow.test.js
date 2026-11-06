// tests/contactMessageWorkflow.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { contactFormSchema, sponsorFormSchema } from '../src/lib/schemas.js';

describe('Contact & Sponsor Message Submission Workflow', () => {
  const rootDir = process.cwd();
  const migrationPath = path.join(
    rootDir,
    'supabase',
    'migrations',
    '20261106083000_secure_contact_message_submission.sql'
  );

  it('migration file exists and contains submit_contact_message RPC', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('create or replace function public.submit_contact_message');
    expect(sql).toContain('security definer');
    expect(sql).toContain('p_full_name text');
    expect(sql).toContain('p_email text');
    expect(sql).toContain('p_message text');
    expect(sql).toContain('contact_messages_insert');
    expect(sql).toContain('grant execute on function public.submit_contact_message');
    expect(sql).toContain('grant insert on public.contact_messages to anon, authenticated');
  });

  it('validates contact form payload against contactFormSchema', () => {
    const validContact = {
      fullName: 'أحمد محمود',
      email: 'ahmed@example.com',
      subject: 'استفسار عن التقديم',
      message: 'أريد معرفة موعد المقابلات القادمة.',
    };

    const res = contactFormSchema.safeParse(validContact);
    expect(res.success).toBe(true);

    const invalidEmail = {
      ...validContact,
      email: 'not-an-email',
    };
    expect(contactFormSchema.safeParse(invalidEmail).success).toBe(false);

    const shortMessage = {
      ...validContact,
      message: 'hi',
    };
    expect(contactFormSchema.safeParse(shortMessage).success).toBe(false);
  });

  it('validates sponsor form payload against sponsorFormSchema', () => {
    const validSponsor = {
      companyName: 'مؤسسة قنا للابتكار',
      contactPerson: 'مهندس محمد',
      email: 'sponsor@qena-tech.com',
      phone: '01012345678',
      tier: 'الباقة الذهبية',
      message: 'نود بحث تفاصيل الرعاية السنوية للفريق.',
    };

    const res = sponsorFormSchema.safeParse(validSponsor);
    expect(res.success).toBe(true);
  });

  it('turnstile shared utility allows dev bypass tokens without remote secret error', () => {
    const turnstileSharedPath = path.join(
      rootDir,
      'supabase',
      'functions',
      '_shared',
      'turnstile.ts'
    );
    const code = fs.readFileSync(turnstileSharedPath, 'utf-8');

    expect(code).toContain('dev-bypass-turnstile-token');
  });

  it('migration 20261106094500 sets up dispatch_contact_message_notifications, trigger and backfill', () => {
    const notifyMigrationPath = path.join(
      rootDir,
      'supabase',
      'migrations',
      '20261106094500_notify_dashboard_on_contact_messages.sql'
    );
    expect(fs.existsSync(notifyMigrationPath)).toBe(true);

    const sql = fs.readFileSync(notifyMigrationPath, 'utf-8');
    expect(sql).toContain('function public.dispatch_contact_message_notifications');
    expect(sql).toContain('trigger trg_contact_messages_notify');
    expect(sql).toContain("'super_admin', 'president', 'vice_president', 'pr_admin', 'hr_admin'");
    expect(sql).toContain("'new_contact_message'");
    expect(sql).toContain('insert into public.notifications');
  });

  it('NotificationsPage has Drawer component to display sender and full message content', () => {
    const pagePath = path.join(rootDir, 'src', 'pages', 'dashboard', 'NotificationsPage.jsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    expect(content).toContain('Drawer');
    expect(content).toContain('selectedNotif');
    expect(content).toContain('setSelectedNotif');
    expect(content).toContain('selectedNotif.data.email');
    expect(content).toContain('selectedNotif.data?.message');
  });
});

