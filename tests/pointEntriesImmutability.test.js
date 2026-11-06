// tests/pointEntriesImmutability.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Point Entries Immutability & Voiding Audit Tests', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20261105090000_point_entries_immutability_and_voiding.sql'
  );
  const testSqlPath = path.resolve(
    __dirname,
    '../supabase/tests/point_entries_immutability_test.sql'
  );

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  const testSql = fs.readFileSync(testSqlPath, 'utf-8');

  it('migration file exists and timestamp is after 20261031151827 and 20261105085000', () => {
    expect(migrationSql).toBeTruthy();
    const filename = path.basename(migrationPath);
    const timestamp = filename.split('_')[0];
    expect(Number(timestamp)).toBeGreaterThan(20261031151827);
    expect(Number(timestamp)).toBeGreaterThan(20261105085000);
  });

  describe('Ledger Immutability Trigger Guard (point_entries_guard)', () => {
    it('unconditionally blocks DELETE operations on point entries', () => {
      expect(migrationSql).toMatch(/if\s+tg_op\s*=\s*'DELETE'\s+then/i);
      expect(migrationSql).toMatch(/cannot be deleted/i);
    });

    it('protects core fields from being silently modified or rewritten', () => {
      // Must protect committee_id, rule_id, value, reason, source, etc.
      expect(migrationSql).toContain('new.committee_id');
      expect(migrationSql).toContain('old.committee_id');
      expect(migrationSql).toContain('new.rule_id');
      expect(migrationSql).toContain('old.rule_id');
      expect(migrationSql).toContain('new.value');
      expect(migrationSql).toContain('new.reason');
      expect(migrationSql).toContain('new.type');
      expect(migrationSql).toContain('new.user_id');
      expect(migrationSql).toContain('new.season_id');
      expect(migrationSql).toMatch(/core fields \(including committee_id and rule_id\) cannot be edited/i);
    });

    it('strictly seals already-voided entries against any subsequent tampering', () => {
      expect(migrationSql).toMatch(/if\s+old\.voided_at\s+is\s+not\s+null\s+then/i);
      expect(migrationSql).toMatch(/already voided/i);
    });

    it('requires a non-empty void_reason and valid voided_at timestamp', () => {
      expect(migrationSql).toMatch(/new\.void_reason\s+is\s+null\s+or\s+trim\(new\.void_reason\)\s*=\s*''/i);
      expect(migrationSql).toMatch(/A non-empty void_reason is required/i);
      expect(migrationSql).toMatch(/new\.voided_at\s+is\s+null\s+then/i);
    });

    it('prevents spoofing of the voided_by user identity when an authenticated session exists', () => {
      expect(migrationSql).toMatch(/v_caller\s+is\s+not\s+null\s+and\s+new\.voided_by\s*<>\s*v_caller/i);
      expect(migrationSql).toMatch(/Unauthorized to record void on behalf of another user/i);
    });
  });

  describe('RLS Policies & Privilege Narrowing', () => {
    it('narrows RLS point_entries_void policy to authorized roles on unvoided rows only', () => {
      expect(migrationSql).toContain('create policy point_entries_void on public.point_entries');
      expect(migrationSql).toContain("array['hr_admin', 'president', 'vice_president']");
      expect(migrationSql).toContain('voided_at is null');
      expect(migrationSql).toContain('voided_at is not null');
    });

    it('restricts UPDATE privileges at column level to approved void fields only', () => {
      expect(migrationSql).toMatch(/revoke\s+update\s+on\s+public\.point_entries\s+from\s+authenticated/i);
      expect(migrationSql).toMatch(/grant\s+update\s*\(voided_at,\s*voided_by,\s*void_reason\)\s*on\s+public\.point_entries\s+to\s+authenticated/i);
      expect(migrationSql).toMatch(/revoke\s+delete\s+on\s+public\.point_entries\s+from\s+authenticated/i);
    });

    it('ensures audit trigger is attached to preserve audit logs', () => {
      expect(migrationSql).toMatch(/create\s+trigger\s+audit_point_entries/i);
      expect(migrationSql).toMatch(/after\s+insert\s+or\s+update\s+or\s+delete\s+on\s+public\.point_entries/i);
      expect(migrationSql).toMatch(/execute\s+function\s+private\.audit_row\(\)/i);
    });
  });

  describe('PostgreSQL Smoke & Regression Script (point_entries_immutability_test.sql)', () => {
    it('is strictly transactional and always rolls back at the end', () => {
      const uncommented = testSql.replace(/--.*$/gm, '').trim().toLowerCase();
      expect(uncommented.startsWith('begin;')).toBe(true);
      expect(uncommented.endsWith('rollback;')).toBe(true);
    });

    it('covers allowed voiding with audit log check', () => {
      expect(testSql).toMatch(/Allowed voiding by hr_admin/i);
      expect(testSql).toContain('table_name = \'point_entries\'');
      expect(testSql).toContain('action = \'UPDATE\'');
    });

    it('covers all forbidden operations (delete, field edits, tamper after void, spoofing, empty reason, unauthorized member)', () => {
      expect(testSql).toMatch(/Forbidden DELETE is blocked/i);
      expect(testSql).toMatch(/Forbidden edit of committee_id is blocked/i);
      expect(testSql).toMatch(/Forbidden edit of rule_id is blocked/i);
      expect(testSql).toMatch(/Forbidden edit on already-voided entry/i);
      expect(testSql).toMatch(/Forbidden spoofing of voided_by/i);
      expect(testSql).toMatch(/Forbidden voiding with empty reason/i);
      expect(testSql).toMatch(/Forbidden voiding by plain member is blocked/i);
    });

    it('aborts with non-zero SQL error on failure', () => {
      expect(testSql).toMatch(/raise\s+exception\s+.*Point Entries Immutability Test FAILED/i);
    });

    it('verifies PointsPage ledger supports per-member and team-wide bonus/penalty history filtering', () => {
      const pagePath = path.resolve(__dirname, '../src/pages/dashboard/PointsPage.jsx');
      expect(fs.existsSync(pagePath)).toBe(true);
      const pageCode = fs.readFileSync(pagePath, 'utf-8');

      expect(pageCode).toContain('selectedMemberId');
      expect(pageCode).toContain('memberOptions');
      expect(pageCode).toContain('myTypeFilter');
      expect(pageCode).toContain('effectiveUserId');
      expect(pageCode).toContain('displayedScore');
    });
  });
});

