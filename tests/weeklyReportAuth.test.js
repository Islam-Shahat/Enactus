// tests/weeklyReportAuth.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateWeeklyReportAuth } from '../supabase/functions/weekly-report/index.ts';
import { checkOrigin, handleCors, getCorsHeaders } from '../supabase/functions/_shared/cors.ts';

describe('Weekly Report Edge Function: Authentication, Origin & Scheduling Consistency', () => {
  const configTomlPath = path.resolve(__dirname, '../supabase/config.toml');
  const cronSqlPath = path.resolve(__dirname, '../supabase/optional/cron.sql');
  const weeklyReportPath = path.resolve(__dirname, '../supabase/functions/weekly-report/index.ts');

  const configTomlContent = fs.readFileSync(configTomlPath, 'utf-8');
  const cronSqlContent = fs.readFileSync(cronSqlPath, 'utf-8');
  const weeklyReportSource = fs.readFileSync(weeklyReportPath, 'utf-8');

  // Sample secrets for testing
  const mockCronSecret = 'test_cron_secret_k8d9f1234567890abcdef';
  const mockServiceRoleKey = 'test_service_role_key_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

  describe('1. Gateway Configuration (supabase/config.toml)', () => {
    it('sets verify_jwt = false for weekly-report so scheduled requests with x-cron-secret reach the handler', () => {
      // Must match [functions.weekly-report] followed by verify_jwt = false
      const weeklyReportSectionRegex = /\[functions\.weekly-report\][\s\S]*?verify_jwt\s*=\s*(false|true)/i;
      const match = configTomlContent.match(weeklyReportSectionRegex);

      expect(match).not.toBeNull();
      expect(match[1].toLowerCase()).toBe('false');
    });
  });

  describe('2. Scheduled Job & Vault Documentation (supabase/optional/cron.sql)', () => {
    it('documents secret storage using Supabase Vault without hardcoded keys', () => {
      expect(cronSqlContent).toContain('vault.create_secret');
      expect(cronSqlContent).toContain('vault.decrypted_secrets');
      expect(cronSqlContent).not.toMatch(/eyJ[a-zA-Z0-9_-]{20,}/); // No plain JWT strings
    });

    it('schedules weekly report with pg_cron and pg_net targeting /functions/v1/weekly-report', () => {
      expect(cronSqlContent).toContain('weekly-operations-report');
      expect(cronSqlContent).toContain('net.http_post');
      expect(cronSqlContent).toContain('/functions/v1/weekly-report');
      expect(cronSqlContent).toContain('x-cron-secret');
    });

    it('uses Thursday 06:00 UTC schedule (08:00 Cairo time)', () => {
      expect(cronSqlContent).toMatch(/0\s+6\s+\*\s+\*\s+4/);
    });
  });

  describe('3. Origin Validation & CORS Preflight', () => {
    const originalSiteOrigins = process.env.SITE_ORIGINS;

    afterEach(() => {
      if (originalSiteOrigins !== undefined) {
        process.env.SITE_ORIGINS = originalSiteOrigins;
      } else {
        delete process.env.SITE_ORIGINS;
      }
    });

    it('handles OPTIONS preflight cleanly and allows x-cron-secret in headers', () => {
      const optionsReq = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'OPTIONS',
      });

      const corsRes = handleCors(optionsReq);
      expect(corsRes).not.toBeNull();
      expect(corsRes?.status).toBe(200);

      const headers = getCorsHeaders(optionsReq);
      const allowedHeaders = headers['Access-Control-Allow-Headers'] || '';
      expect(allowedHeaders).toContain('x-cron-secret');
    });

    it('allows server-to-server / cron requests without Origin header', () => {
      process.env.SITE_ORIGINS = 'https://enactus-qena.org,https://portal.enactus-qena.org';
      const cronReq = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
      });

      const originError = checkOrigin(cronReq);
      expect(originError).toBeNull(); // No error: allowed
    });

    it('rejects cross-origin requests from untrusted origins with 403', async () => {
      process.env.SITE_ORIGINS = 'https://enactus-qena.org,https://portal.enactus-qena.org';
      const maliciousReq = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
        headers: {
          Origin: 'https://malicious-attacker.com',
        },
      });

      const originError = checkOrigin(maliciousReq);
      expect(originError).not.toBeNull();
      expect(originError?.status).toBe(403);

      const json = await originError?.json();
      expect(json?.error).toContain('Origin not allowed');
    });

    it('allows requests from approved SITE_ORIGINS', () => {
      process.env.SITE_ORIGINS = 'https://enactus-qena.org,https://portal.enactus-qena.org';
      const validReq = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
        headers: {
          Origin: 'https://enactus-qena.org',
        },
      });

      const originError = checkOrigin(validReq);
      expect(originError).toBeNull();
    });
  });

  describe('4. Authorization Paths in validateWeeklyReportAuth', () => {
    const env = {
      CRON_SECRET: mockCronSecret,
      SUPABASE_SERVICE_ROLE_KEY: mockServiceRoleKey,
    };

    it('authorizes requests with matching x-cron-secret header', () => {
      const req = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
        headers: {
          'x-cron-secret': mockCronSecret,
        },
      });

      const result = validateWeeklyReportAuth(req, env);
      expect(result.authorized).toBe(true);
      expect(result.status).toBe(200);
      expect(result.caller).toBe('cron');
    });

    it('authorizes requests with matching Bearer CRON_SECRET token', () => {
      const req = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockCronSecret}`,
        },
      });

      const result = validateWeeklyReportAuth(req, env);
      expect(result.authorized).toBe(true);
      expect(result.status).toBe(200);
      expect(result.caller).toBe('cron');
    });

    it('authorizes requests with matching service_role key in Authorization header', () => {
      const req = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockServiceRoleKey}`,
        },
      });

      const result = validateWeeklyReportAuth(req, env);
      expect(result.authorized).toBe(true);
      expect(result.status).toBe(200);
      expect(result.caller).toBe('service_role');
    });

    it('authorizes requests with matching service_role key in apikey header', () => {
      const req = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
        headers: {
          apikey: mockServiceRoleKey,
        },
      });

      const result = validateWeeklyReportAuth(req, env);
      expect(result.authorized).toBe(true);
      expect(result.status).toBe(200);
      expect(result.caller).toBe('service_role');
    });

    it('rejects requests with incorrect x-cron-secret header', () => {
      const req = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
        headers: {
          'x-cron-secret': 'invalid_secret_token_12345',
        },
      });

      const result = validateWeeklyReportAuth(req, env);
      expect(result.authorized).toBe(false);
      expect(result.status).toBe(401);
      expect(result.code).toBe('UNAUTHORIZED');
    });

    it('rejects requests with incorrect service_role key', () => {
      const req = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer invalid_service_role_key_value',
        },
      });

      const result = validateWeeklyReportAuth(req, env);
      expect(result.authorized).toBe(false);
      expect(result.status).toBe(401);
    });

    it('rejects requests with no authorization headers at all', () => {
      const req = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
      });

      const result = validateWeeklyReportAuth(req, env);
      expect(result.authorized).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toContain('Unauthorized routine trigger');
    });

    it('rejects requests when secrets are missing from environment', () => {
      const req = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
        headers: {
          'x-cron-secret': mockCronSecret,
        },
      });

      // Empty environment
      const result = validateWeeklyReportAuth(req, {});
      expect(result.authorized).toBe(false);
      expect(result.status).toBe(401);
    });

    it('does not match empty string secrets against empty headers', () => {
      const req = new Request('https://api.test/functions/v1/weekly-report', {
        method: 'POST',
        headers: {
          'x-cron-secret': '',
        },
      });

      const result = validateWeeklyReportAuth(req, {
        CRON_SECRET: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
      });
      expect(result.authorized).toBe(false);
      expect(result.status).toBe(401);
    });
  });
});

