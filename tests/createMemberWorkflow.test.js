// tests/createMemberWorkflow.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createMemberSchema } from '../supabase/functions/_shared/schemas.ts';
import { formatMemberCode, parseEgyptianNationalId } from '../src/lib/nationalIdHelper';

describe('Create Member & 7-Digit Code Workflow', () => {
  describe('Zod Validation Schema (createMemberSchema)', () => {
    it('accepts valid member creation payload with 14-digit National ID', () => {
      const validPayload = {
        fullNameAr: 'أحمد محمود علي السيد',
        fullNameEn: 'Ahmed Mahmoud Ali',
        nationalId: '30308152700315',
        phone: '01012345678',
        email: 'ahmed@example.com',
        committeeId: 'b7c7b8e0-1c3a-4e2b-9f1a-1234567890ab',
        position: 'member',
        faculty: 'كلية التجارة',
        studyYear: 'الفرقة الثالثة',
      };

      const parsed = createMemberSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.nationalId).toBe('30308152700315');
        expect(parsed.data.studyYear).toBe(3);
        expect(parsed.data.position).toBe('member');
      }
    });

    it('allows empty email and auto-defaults studyYear to 1', () => {
      const payloadWithoutEmail = {
        fullNameAr: 'فاطمة محمد إبراهيم',
        nationalId: '29912250100028',
        committeeId: 'b7c7b8e0-1c3a-4e2b-9f1a-1234567890ab',
        email: '',
      };

      const parsed = createMemberSchema.safeParse(payloadWithoutEmail);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.email).toBe('');
        expect(parsed.data.studyYear).toBe(1);
        expect(parsed.data.position).toBe('member');
      }
    });

    it('rejects invalid national ID lengths or formats', () => {
      const invalidShortNid = {
        fullNameAr: 'علي حسن',
        nationalId: '123456', // only 6 digits
        committeeId: 'b7c7b8e0-1c3a-4e2b-9f1a-1234567890ab',
      };
      expect(createMemberSchema.safeParse(invalidShortNid).success).toBe(false);

      const invalidLettersNid = {
        fullNameAr: 'علي حسن',
        nationalId: '3030815270031A', // contains letter
        committeeId: 'b7c7b8e0-1c3a-4e2b-9f1a-1234567890ab',
      };
      expect(createMemberSchema.safeParse(invalidLettersNid).success).toBe(false);
    });
  });

  describe('Sequential 7-digit Member Code Logic', () => {
    it('generates codes starting with season year and 3 zero-padded digits', () => {
      expect(formatMemberCode('2026', 1)).toBe('2026001');
      expect(formatMemberCode('2026', 2)).toBe('2026002');
      expect(formatMemberCode('2026', 10)).toBe('2026010');
      expect(formatMemberCode('2026', 105)).toBe('2026105');
    });

    it('correctly parses National ID to deduce age and demographic info', () => {
      const qenaMaleNid = '30308152700315';
      const parsed = parseEgyptianNationalId(qenaMaleNid);
      expect(parsed.isValid).toBe(true);
      expect(parsed.governorate.ar).toBe('قنا');
      expect(parsed.gender.key).toBe('male');
      expect(parsed.birthDateStr).toBe('2003-08-15');
      expect(parsed.age).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Migration & Edge Function Contracts', () => {
    it('verifies migration 20261105130000 adds member_code, national_id, and RPC functions', () => {
      const migPath = path.join(process.cwd(), 'supabase', 'migrations', '20261105130000_add_member_code_and_national_id.sql');
      expect(fs.existsSync(migPath)).toBe(true);

      const migSql = fs.readFileSync(migPath, 'utf-8');
      expect(migSql).toContain('add column if not exists member_code text unique');
      expect(migSql).toContain('add column if not exists national_id text');
      expect(migSql).toContain('generate_next_member_code');
      expect(migSql).toContain('get_member_login_email');
    });

    it('verifies Edge Function create-member checks allowed roles and sets password = nationalId', () => {
      const edgeFuncPath = path.join(process.cwd(), 'supabase', 'functions', 'create-member', 'index.ts');
      expect(fs.existsSync(edgeFuncPath)).toBe(true);

      const edgeFuncSource = fs.readFileSync(edgeFuncPath, 'utf-8');
      expect(edgeFuncSource).toContain("'hr_admin', 'president', 'vice_president', 'super_admin'");
      expect(edgeFuncSource).toContain('adminClient.auth.admin.createUser');
      expect(edgeFuncSource).toContain('password: nationalId');
      expect(edgeFuncSource).toContain('member_code: memberCode');
      expect(edgeFuncSource).toContain('generate_next_member_code');
    });

    it('verifies migration 20261106090000 defines convert_application_to_member and create_member_admin RPCs', () => {
      const migPath = path.join(
        process.cwd(),
        'supabase',
        'migrations',
        '20261106090000_secure_member_conversion_and_creation.sql'
      );
      expect(fs.existsSync(migPath)).toBe(true);

      const migSql = fs.readFileSync(migPath, 'utf-8');
      expect(migSql).toContain('function public.convert_application_to_member');
      expect(migSql).toContain('function public.create_member_admin');
      expect(migSql).toContain("'hr_admin', 'president', 'vice_president', 'super_admin'");
      expect(migSql).toContain('generate_next_member_code');
      expect(migSql).toContain('grant execute on function public.convert_application_to_member');
      expect(migSql).toContain('grant execute on function public.create_member_admin');
    });

    it('verifies ApplicationsPage and CreateMemberModal use resilient RPC with Edge Function fallback', () => {
      const appPage = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'dashboard', 'ApplicationsPage.jsx'),
        'utf-8'
      );
      expect(appPage).toContain("supabase.rpc('convert_application_to_member'");
      expect(appPage).toContain("supabase.functions.invoke('convert-application'");

      const modal = fs.readFileSync(
        path.join(process.cwd(), 'src', 'components', 'dashboard', 'members', 'CreateMemberModal.jsx'),
        'utf-8'
      );
      expect(modal).toContain("supabase.rpc('create_member_admin'");
      expect(modal).toContain('functions/v1/create-member');
    });

    it('verifies migration 20261106101500 optimizes get_member_login_email with indexed fast-paths', () => {
      const migPath = path.join(
        process.cwd(),
        'supabase',
        'migrations',
        '20261106101500_optimize_login_email_resolution.sql'
      );
      expect(fs.existsSync(migPath)).toBe(true);

      const migSql = fs.readFileSync(migPath, 'utf-8');
      expect(migSql).toContain('function public.get_member_login_email(p_identifier text)');
      expect(migSql).toContain('stable');
      expect(migSql).toContain('security definer');
      expect(migSql).toContain('idx_profiles_member_code_active');
      expect(migSql).toContain('idx_profile_private_national_id_clean');
      expect(migSql).toContain('grant execute on function public.get_member_login_email');
    });

    it('verifies LoginPage implements pre-resolution cache and dashboard preloading', () => {
      const loginSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'LoginPage.jsx'),
        'utf-8'
      );
      expect(loginSource).toContain('preloadDashboardChunks');
      expect(loginSource).toContain('preResolveIdentifier');
      expect(loginSource).toContain('getCachedEmail');
      expect(loginSource).toContain('setCachedEmail');
    });

    it('verifies migration 20261107190000 defines delete_member RPC and recycles member codes', () => {
      const migPath = path.join(
        process.cwd(),
        'supabase',
        'migrations',
        '20261107190000_allow_member_deletion_and_recycle_code.sql'
      );
      expect(fs.existsSync(migPath)).toBe(true);

      const migSql = fs.readFileSync(migPath, 'utf-8');
      expect(migSql).toContain('function public.delete_member(p_user_id uuid)');
      expect(migSql).toContain("'hr_admin', 'president', 'vice_president', 'super_admin'");
      expect(migSql).toContain('delete from public.memberships');
      expect(migSql).toContain('delete from public.profiles');
      expect(migSql).toContain('delete from auth.users');
      expect(migSql).toContain('grant execute on function public.delete_member');
      expect(migSql).toContain('generate_series');

      const membersPage = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'dashboard', 'MembersPage.jsx'),
        'utf-8'
      );
      expect(membersPage).toContain("supabase.rpc('delete_member'");
      expect(membersPage).toContain('ConfirmDialog');
      expect(membersPage).toContain('deleteMemberMutation');
    });

    it('verifies migration 20261107215000 fixes auth.identities, confirmed_at, and credential sync', () => {
      const migPath = path.join(
        process.cwd(),
        'supabase',
        'migrations',
        '20261107215000_fix_member_auth_login_and_sync.sql'
      );
      expect(fs.existsSync(migPath)).toBe(true);

      const migSql = fs.readFileSync(migPath, 'utf-8');
      expect(migSql).toContain('function public.sync_member_auth_credentials');
      expect(migSql).toContain('function public.convert_application_to_member');
      expect(migSql).toContain('function public.create_member_admin');
      expect(migSql).toContain('function public.get_member_login_email');
      // Crucial: GoTrue identity lookup matches provider_id = user_id::text
      expect(migSql).toContain('v_user_id::text');
      expect(migSql).toContain('email_confirmed_at');
      expect(migSql).toContain('grant execute on function public.sync_member_auth_credentials');

      const membersPage = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'dashboard', 'MembersPage.jsx'),
        'utf-8'
      );
      expect(membersPage).toContain("supabase.rpc('sync_member_auth_credentials'");
      expect(membersPage).toContain('syncAuthMutation');

      const loginPage = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'LoginPage.jsx'),
        'utf-8'
      );
      expect(loginPage).toContain('clearCachedEmail');
    });
  });
});

