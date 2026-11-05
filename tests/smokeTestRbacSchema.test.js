// tests/smokeTestRbacSchema.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('smoke_test_rbac.sql Schema and Integrity Validation', () => {
  const filePath = path.resolve(__dirname, '../supabase/tests/smoke_test_rbac.sql');
  const sql = fs.readFileSync(filePath, 'utf-8');

  it('file exists and is enclosed in a strict transactional block', () => {
    expect(sql).toBeTruthy();
    const uncommented = sql.replace(/--.*$/gm, '').trim().toLowerCase();
    expect(uncommented.startsWith('begin;')).toBe(true);
    expect(uncommented.endsWith('rollback;')).toBe(true);
  });

  it('satisfies foreign-key constraints with auth.users before profiles', () => {
    expect(sql).toContain('insert into auth.users');
    expect(sql).toContain('insert into public.profiles');
    expect(sql).toContain('insert into public.profile_private');
    expect(sql).toContain('insert into public.user_roles');
    expect(sql).toContain('insert into public.memberships');
  });

  it('uses actual schema columns and eliminates obsolete columns', () => {
    // Companies: name_ar instead of obsolete name
    expect(sql).toContain('name_ar');
    expect(sql).not.toMatch(/insert\s+into\s+public\.companies\s*\([^)]*\bname\b(?!\w)/i);

    // Agreements: total_value instead of obsolete total_amount, valid status ('active' instead of 'signed')
    expect(sql).toContain('total_value');
    expect(sql).not.toMatch(/\btotal_amount\b/);
    expect(sql).not.toMatch(/insert\s+into\s+public\.agreements\s*\([^)]*\)\s*values\s*\([^)]*'signed'/i);

    // Applications: first_choice_id instead of non-existent committee_id column
    expect(sql).toContain('first_choice_id');
    expect(sql).not.toMatch(/insert\s+into\s+public\.applications\s*\([^)]*\bcommittee_id\b/i);
    expect(sql).not.toMatch(/select\s+count\(\*\)\s+into\s+v_count\s+from\s+public\.applications\s+where\s+committee_id\s*=/i);

    // Committees: no non-existent code or is_media_team columns
    expect(sql).not.toMatch(/insert\s+into\s+public\.committees\s*\([^)]*\bcode\b/i);
    expect(sql).not.toMatch(/insert\s+into\s+public\.committees\s*\([^)]*\bis_media_team\b/i);
  });

  it('uses valid payment statuses complying with check constraints', () => {
    // Payments status check in ('pending', 'paid', 'overdue', 'cancelled')
    expect(sql).not.toMatch(/update\s+public\.payments\s+set\s+status\s*=\s*'confirmed'/i);
    expect(sql).toMatch(/update\s+public\.payments\s+set\s+status\s*=\s*'paid',\s*paid_at\s*=\s*now\(\)/i);
  });

  it('aborts with a non-zero SQL error if any recorded result is FAIL', () => {
    expect(sql).toContain('from test_results');
    expect(sql).toContain("where status = 'FAIL'");
    expect(sql).toMatch(/raise\s+exception\s+.*RBAC smoke test FAILED/i);
  });
});
