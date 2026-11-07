// tests/directMessageWorkflow.test.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NOTIFICATION_TYPES, getNotificationMeta } from '../src/lib/notificationHelpers';

describe('Direct Member Messaging Workflow', () => {
  it('registers direct_message notification type with appropriate branding', () => {
    expect(NOTIFICATION_TYPES.direct_message).toBeDefined();
    expect(NOTIFICATION_TYPES.direct_message.defaultLink).toBe('/dashboard/notifications');
    expect(NOTIFICATION_TYPES.direct_message.color).toBe('#06b6d4');
    expect(NOTIFICATION_TYPES.direct_message.label.ar).toContain('رسالة');
    expect(NOTIFICATION_TYPES.direct_message.label.en).toContain('Direct Message');

    const meta = getNotificationMeta('direct_message');
    expect(meta.color).toBe('#06b6d4');
  });

  it('provides the database migration for send_member_message RPC with proper role controls', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../supabase/migrations/20261107200000_direct_member_messaging.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // 1. Check function name & security definer
    expect(sql).toContain('create or replace function public.send_member_message');
    expect(sql).toContain('security definer');

    // 2. Check role authorization checks
    expect(sql).toContain('super_admin');
    expect(sql).toContain('president');
    expect(sql).toContain('vice_president');
    expect(sql).toContain('hr_admin');
    expect(sql).toContain('committee_head');
    expect(sql).toContain('coordinator');

    // 3. Check parameter validation
    expect(sql).toContain('p_recipient_id');
    expect(sql).toContain('p_title');
    expect(sql).toContain('p_body');
    expect(sql).toContain('Recipient ID is required');

    // 4. Check notification insertion targeted strictly to recipient
    expect(sql).toContain('insert into public.notifications');
    expect(sql).toContain("'direct_message'");
    expect(sql).toContain('/dashboard/notifications');
    expect(sql).toContain('p_recipient_id');

    // 5. Check grant
    expect(sql).toContain('grant execute on function public.send_member_message(uuid, text, text) to authenticated');
  });

  it('SendMessageModal and MembersPage are correctly configured', () => {
    const modalPath = path.resolve(
      __dirname,
      '../src/components/dashboard/members/SendMessageModal.jsx'
    );
    expect(fs.existsSync(modalPath)).toBe(true);

    const modalCode = fs.readFileSync(modalPath, 'utf-8');
    expect(modalCode).toContain("supabase.rpc('send_member_message'");
    expect(modalCode).toContain('p_recipient_id');
    expect(modalCode).toContain('p_title');
    expect(modalCode).toContain('p_body');
    expect(modalCode).toContain('role="dialog"');

    const membersPagePath = path.resolve(
      __dirname,
      '../src/pages/dashboard/MembersPage.jsx'
    );
    const membersPageCode = fs.readFileSync(membersPagePath, 'utf-8');
    expect(membersPageCode).toContain('SendMessageModal');
    expect(membersPageCode).toContain('canMessageMember');
    expect(membersPageCode).toContain('committee_head');
    expect(membersPageCode).toContain('coordinator');
    expect(membersPageCode).toContain('setIsMessageOpen');
  });
});

