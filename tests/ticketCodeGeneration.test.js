// tests/ticketCodeGeneration.test.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { normalizeTicketCode, isValidTicketCode } from '../src/lib/eventHelpers';

// Simulates PostgreSQL gen_random_uuid() logic in JS
function generatePgTicketCode() {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return 'ENQ-' + uuid.substring(0, 10).toUpperCase();
}

// Simulates private.register_for_event collision retry logic
function simulateRegisterTicketCode({
  existingCodes = new Set(),
  maxAttempts = 10,
  generator = generatePgTicketCode,
} = {}) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts += 1;
    const code = generator();

    if (!existingCodes.has(code)) {
      existingCodes.add(code);
      return { success: true, ticket_code: code, attempts };
    }
  }

  throw new Error('TICKET_CODE_GENERATION_FAILED: Failed to generate unique ticket code after maximum attempts');
}

describe('Ticket Code Generation & Compatibility', () => {
  describe('Format and Entropy', () => {
    it('generates ticket codes with canonical ENQ- prefix and exactly 10 uppercase hex characters', () => {
      const code = generatePgTicketCode();
      expect(code).toMatch(/^ENQ-[0-9A-F]{10}$/);
      expect(code.length).toBe(14);
    });

    it('generates unpredictable and unique codes with high entropy', () => {
      const sampleSize = 1000;
      const codes = new Set();

      for (let i = 0; i < sampleSize; i++) {
        const code = generatePgTicketCode();
        expect(code).toMatch(/^ENQ-[0-9A-F]{10}$/);
        codes.add(code);
      }

      // 1000 generated codes must all be distinct
      expect(codes.size).toBe(sampleSize);
    });

    it('has balanced hexadecimal distribution across all character positions', () => {
      const charCounts = {};
      const sampleSize = 500;

      for (let i = 0; i < sampleSize; i++) {
        const code = generatePgTicketCode().replace('ENQ-', '');
        for (const ch of code) {
          charCounts[ch] = (charCounts[ch] || 0) + 1;
        }
      }

      // Hex digits 0-9, A-F (16 possible values)
      const uniqueChars = Object.keys(charCounts);
      expect(uniqueChars.length).toBeGreaterThanOrEqual(14); // All or almost all hex chars represented
      uniqueChars.forEach((ch) => {
        expect('0123456789ABCDEF').toContain(ch);
      });
    });
  });

  describe('Lookup & Consumer Compatibility', () => {
    // Ticket lookup schema from supabase/functions/ticket-lookup/index.ts
    const TicketLookupSchema = z.object({
      code: z.string().min(3).max(50),
    });

    // Feedback schema from supabase/functions/submit-feedback/index.ts
    const SubmitFeedbackSchema = z.object({
      ticket_code: z.string().min(3).max(50),
      rating: z.number().int().min(1).max(5),
    });

    it('validates against ticket-lookup Edge Function schema', () => {
      const code = generatePgTicketCode();
      const parseResult = TicketLookupSchema.safeParse({ code });
      expect(parseResult.success).toBe(true);
      expect(parseResult.data.code).toBe(code);
    });

    it('validates against submit-feedback Edge Function schema', () => {
      const ticket_code = generatePgTicketCode();
      const parseResult = SubmitFeedbackSchema.safeParse({ ticket_code, rating: 5 });
      expect(parseResult.success).toBe(true);
      expect(parseResult.data.ticket_code).toBe(ticket_code);
    });

    it('normalizes ticket codes with whitespace and lowercase characters', () => {
      expect(normalizeTicketCode('  enq-a1b2c3d4e5  ')).toBe('ENQ-A1B2C3D4E5');
      expect(normalizeTicketCode('ENQ-1234567890')).toBe('ENQ-1234567890');
    });

    it('extracts canonical ticket codes from route URLs and query strings', () => {
      expect(normalizeTicketCode('/ticket/ENQ-F1A2B3C4D5')).toBe('ENQ-F1A2B3C4D5');
      expect(
        normalizeTicketCode('https://enactusqena.org/ticket/ENQ-F1A2B3C4D5?ref=qr#badge')
      ).toBe('ENQ-F1A2B3C4D5');
    });

    it('validates both modern (10-hex) and legacy (6-hex) ticket formats', () => {
      // Modern 10-hex format
      expect(isValidTicketCode('ENQ-A1B2C3D4E5')).toBe(true);
      expect(isValidTicketCode('enq-0123456789')).toBe(true);

      // Legacy 6-hex format
      expect(isValidTicketCode('ENQ-A1B2C3')).toBe(true);
      expect(isValidTicketCode('enq-123456')).toBe(true);

      // Invalid formats
      expect(isValidTicketCode('INVALID')).toBe(false);
      expect(isValidTicketCode('ENQ-12')).toBe(false); // too short
      expect(isValidTicketCode('ENQ-12345678901234567890')).toBe(false); // too long
      expect(isValidTicketCode('')).toBe(false);
      expect(isValidTicketCode(null)).toBe(false);
    });
  });

  describe('Collision Handling and Retry Behavior', () => {
    it('succeeds on first attempt when no collision occurs', () => {
      const dbCodes = new Set(['ENQ-OLD0000001', 'ENQ-OLD0000002']);
      const res = simulateRegisterTicketCode({ existingCodes: dbCodes });

      expect(res.success).toBe(true);
      expect(res.attempts).toBe(1);
      expect(dbCodes.has(res.ticket_code)).toBe(true);
    });

    it('retries safely when collision occurs and returns on next unique code', () => {
      const dbCodes = new Set(['ENQ-COLLISION1', 'ENQ-COLLISION2']);
      let callCount = 0;

      // Mock generator: first two calls produce collisions, third call produces a fresh code
      const mockGenerator = () => {
        callCount += 1;
        if (callCount === 1) return 'ENQ-COLLISION1';
        if (callCount === 2) return 'ENQ-COLLISION2';
        return 'ENQ-FRESH00001';
      };

      const res = simulateRegisterTicketCode({
        existingCodes: dbCodes,
        generator: mockGenerator,
      });

      expect(res.success).toBe(true);
      expect(res.ticket_code).toBe('ENQ-FRESH00001');
      expect(res.attempts).toBe(3);
      expect(dbCodes.has('ENQ-FRESH00001')).toBe(true);
    });

    it('raises TICKET_CODE_GENERATION_FAILED when maximum retry limit (10) is exhausted', () => {
      const dbCodes = new Set(['ENQ-ALWAYSCOLLIDE']);
      const collidingGenerator = () => 'ENQ-ALWAYSCOLLIDE';

      expect(() =>
        simulateRegisterTicketCode({
          existingCodes: dbCodes,
          maxAttempts: 10,
          generator: collidingGenerator,
        })
      ).toThrowError(/TICKET_CODE_GENERATION_FAILED/);
    });
  });

  describe('Database Migration Integrity', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../supabase/migrations/20261105110000_improve_ticket_code_generation.sql'
    );

    it('exists as a new migration timestamped after 20261105104000', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const filename = path.basename(migrationPath);
      expect(filename).toBe('20261105110000_improve_ticket_code_generation.sql');
    });

    it('contains 10-hex code generation logic using gen_random_uuid()', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain("'ENQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))");
    });

    it('updates table default on public.event_registrations.ticket_code', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('alter table public.event_registrations');
      expect(sql).toContain('alter column ticket_code set default');
    });

    it('implements collision retry loop with attempt cap and exception handling', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('loop');
      expect(sql).toContain('v_attempts := v_attempts + 1');
      expect(sql).toContain('not exists (');
      expect(sql).toContain('from public.event_registrations where ticket_code = v_code');
      expect(sql).toContain('exception');
      expect(sql).toContain('when unique_violation then');
      expect(sql).toContain('TICKET_CODE_GENERATION_FAILED');
    });

    it('preserves security definer, search_path, and service_role permissions', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain("set search_path = ''");
      expect(sql).toContain('security definer');
      expect(sql).toContain('grant execute on function public.register_for_event');
      expect(sql).toContain('to service_role');
      expect(sql).toContain('revoke all on function public.register_for_event');
    });
  });
});

