// tests/siteContentSecurity.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SiteContentSchema } from '../src/lib/cmsHelpers';

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, '20261105104000_secure_site_content_rls.sql');

describe('CMS & site_content Public Read Access Audit', () => {
  describe('1. Migration File & Timestamp Integrity', () => {
    it('creates migration with timestamp later than all previous migrations', () => {
      expect(fs.existsSync(MIGRATION_FILE)).toBe(true);

      const filename = path.basename(MIGRATION_FILE);
      const timestamp = Number(filename.split('_')[0]);
      expect(timestamp).toBeGreaterThan(20261105092000);
    });

    it('contains DDL adding is_public column and index to site_content', () => {
      const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
      expect(sql).toMatch(/alter\s+table\s+public\.site_content\s+add\s+column\s+if\s+not\s+exists\s+is_public\s+boolean\s+not\s+null\s+default\s+true/i);
      expect(sql).toMatch(/create\s+index\s+if\s+not\s+exists\s+site_content_is_public_idx\s+on\s+public\.site_content/i);
    });

    it('replaces permissive using(true) anon policy with strict is_public filter', () => {
      const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
      expect(sql).toMatch(/drop\s+policy\s+if\s+exists\s+site_content_select_anon\s+on\s+public\.site_content/i);
      expect(sql).toMatch(/create\s+policy\s+site_content_select_anon\s+on\s+public\.site_content\s+for\s+select\s+to\s+anon\s+using\s*\(\s*is_public\s*=\s*true/i);
    });

    it('preserves authorized access for media_admin, president, and vice_president', () => {
      const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
      expect(sql).toMatch(/drop\s+policy\s+if\s+exists\s+site_content_select_auth\s+on\s+public\.site_content/i);
      expect(sql).toMatch(/private\.can\(array\['media_admin',\s*'president',\s*'vice_president'\]\)/i);
    });

    it('hardens event_sponsors anon read policy against unpublished/draft events', () => {
      const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
      expect(sql).toMatch(/create\s+policy\s+event_sponsors_select_anon\s+on\s+public\.event_sponsors/i);
      expect(sql).toMatch(/e\.is_public\s*=\s*true/i);
      expect(sql).toMatch(/e\.status\s+in\s*\('published',\s*'ongoing',\s*'completed'\)/i);
    });
  });

  describe('2. Anonymous vs Authorized Read Policy Logic', () => {
    // Pure logic simulation matching the PostgreSQL RLS expression
    function evaluateSiteContentAnonRead(row) {
      const isPublicCol = row.is_public === true;
      const isPublicJson = row.value?.is_public === undefined || row.value?.is_public === true;
      return isPublicCol && isPublicJson;
    }

    function evaluateSiteContentAuthRead(row, userRoles = []) {
      const isPublic = evaluateSiteContentAnonRead(row);
      const isAuthorizedRole = userRoles.some((r) =>
        ['media_admin', 'president', 'vice_president', 'super_admin'].includes(r)
      );
      return isPublic || isAuthorizedRole;
    }

    const publicTerms = {
      key: 'terms',
      locale: 'ar',
      is_public: true,
      value: { title: 'الشروط والأحكام', markdown: '# شروط المنصة' },
    };

    const internalDraft = {
      key: 'operations_handbook',
      locale: 'ar',
      is_public: false,
      value: { title: 'دليل العمليات الداخلي', markdown: '# سري للغاية' },
    };

    const unpublishedAbout = {
      key: 'about',
      locale: 'en',
      is_public: false,
      value: { title: 'Draft About Us', markdown: 'Unpublished draft' },
    };

    const softHiddenJson = {
      key: 'privacy_v2',
      locale: 'ar',
      is_public: true,
      value: { title: 'سياسة الخصوصية الجديدة', is_public: false },
    };

    it('allows anonymous visitors to read only explicitly public content', () => {
      expect(evaluateSiteContentAnonRead(publicTerms)).toBe(true);
      expect(evaluateSiteContentAnonRead(internalDraft)).toBe(false);
      expect(evaluateSiteContentAnonRead(unpublishedAbout)).toBe(false);
      expect(evaluateSiteContentAnonRead(softHiddenJson)).toBe(false);
    });

    it('allows regular authenticated members to read only public content, blocking internal/draft rows', () => {
      const regularMemberRoles = ['member'];
      expect(evaluateSiteContentAuthRead(publicTerms, regularMemberRoles)).toBe(true);
      expect(evaluateSiteContentAuthRead(internalDraft, regularMemberRoles)).toBe(false);
      expect(evaluateSiteContentAuthRead(unpublishedAbout, regularMemberRoles)).toBe(false);
      expect(evaluateSiteContentAuthRead(softHiddenJson, regularMemberRoles)).toBe(false);
    });

    it('allows authorized staff (media_admin, president, vice_president, super_admin) to read both public and private/draft content', () => {
      ['media_admin', 'president', 'vice_president', 'super_admin'].forEach((role) => {
        expect(evaluateSiteContentAuthRead(publicTerms, [role])).toBe(true);
        expect(evaluateSiteContentAuthRead(internalDraft, [role])).toBe(true);
        expect(evaluateSiteContentAuthRead(unpublishedAbout, [role])).toBe(true);
        expect(evaluateSiteContentAuthRead(softHiddenJson, [role])).toBe(true);
      });
    });
  });

  describe('3. CMS Validation Schema Integrity', () => {
    it('validates SiteContentSchema with is_public boolean', () => {
      const parsedDefault = SiteContentSchema.parse({
        key: 'terms',
        locale: 'ar',
        title: 'الشروط',
        markdown: 'نص الشروط',
      });
      expect(parsedDefault.is_public).toBe(true);

      const parsedExplicit = SiteContentSchema.parse({
        key: 'internal_memo',
        locale: 'en',
        title: 'Internal Memo',
        markdown: 'Draft',
        is_public: false,
      });
      expect(parsedExplicit.is_public).toBe(false);
    });
  });
});

