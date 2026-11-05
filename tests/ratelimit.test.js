// tests/ratelimit.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hashIp,
  checkRateLimit,
  isRateLimited,
  getSalt,
  _clearRateLimitStore,
  _getRateLimitStoreSize,
  _getInFlightStoreSize,
} from '../supabase/functions/_shared/ratelimit.ts';
import { z } from 'zod';

const VALID_TEST_SALT = 'super-secret-salt-for-enactus-portal-tests-2026';

// Replicate schemas from the edge functions to test runtime validation logic
const RegisterSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().max(25).optional().nullable(),
  turnstile_token: z.string().min(1),
});

const LookupSchema = z.object({
  code: z.string().min(3).max(50),
});

const FeedbackSchema = z.object({
  ticket_code: z.string().min(3).max(50),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

describe('Rate Limiting & Security in Supabase Edge Functions', () => {
  beforeEach(() => {
    process.env.IP_HASH_SALT = VALID_TEST_SALT;
    _clearRateLimitStore();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.IP_HASH_SALT = VALID_TEST_SALT;
  });

  describe('Secret Configuration & hashIp Validation', () => {
    it('produces a deterministic 64-character hex SHA-256 hash when secret is configured', async () => {
      const hash1 = await hashIp('192.168.1.100');
      const hash2 = await hashIp('192.168.1.100');
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces distinct hashes for distinct IP addresses', async () => {
      const hashA = await hashIp('10.0.0.1');
      const hashB = await hashIp('10.0.0.2');
      expect(hashA).not.toBe(hashB);
    });

    it('falls back gracefully to default IP when empty or missing', async () => {
      const hashEmpty = await hashIp('');
      const hashNull = await hashIp(null);
      const hashDefault = await hashIp('127.0.0.1');
      expect(hashEmpty).toBe(hashDefault);
      expect(hashNull).toBe(hashDefault);
    });

    it('throws when IP_HASH_SALT secret is missing or empty', async () => {
      delete process.env.IP_HASH_SALT;

      await expect(hashIp('192.168.1.1')).rejects.toThrow(/IP_HASH_SALT secret is required/i);
      expect(() => getSalt()).toThrow(/IP_HASH_SALT secret is required/i);
    });

    it('throws when IP_HASH_SALT secret is shorter than 16 characters', async () => {
      process.env.IP_HASH_SALT = 'too-short';

      await expect(hashIp('192.168.1.1')).rejects.toThrow(/must be at least 16 characters/i);
    });

    it('rejects hard-coded or known placeholder salts', async () => {
      process.env.IP_HASH_SALT = 'enactus-qena-default-ip-salt-2026';

      await expect(hashIp('192.168.1.1')).rejects.toThrow(/Insecure or placeholder IP_HASH_SALT is not permitted/i);

      process.env.IP_HASH_SALT = 'change-me';
      await expect(hashIp('192.168.1.1')).rejects.toThrow(/must be at least 16 characters/i);
    });

    it('fails safely and blocks requests in isRateLimited when secret is missing', async () => {
      delete process.env.IP_HASH_SALT;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Calling with a raw IP when secret is missing should fail safely (return true = rate-limited/blocked)
      const blocked = await isRateLimited(null, '192.168.1.99', 'event_registrations', 10, 60);
      expect(blocked).toBe(true);

      // Verify that console error was logged without leaking raw IP
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ratelimit] Rate limiting failed safely: IP_HASH_SALT missing or misconfigured')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('192.168.1.99'));
    });
  });

  describe('isRateLimited (In-Memory & Sliding Window Protection)', () => {
    it('allows requests up to the specified limit', async () => {
      const ip = '172.16.0.5';
      const key = 'event_registrations';
      const limit = 3;
      const windowSec = 60;

      // 1st request -> allowed (false)
      expect(await isRateLimited(null, ip, key, limit, windowSec)).toBe(false);
      // 2nd request -> allowed (false)
      expect(await isRateLimited(null, ip, key, limit, windowSec)).toBe(false);
      // 3rd request -> allowed (false, count is now 3)
      expect(await isRateLimited(null, ip, key, limit, windowSec)).toBe(false);

      // 4th request -> blocked (true, exceeded limit of 3)
      expect(await isRateLimited(null, ip, key, limit, windowSec)).toBe(true);
      // 5th request -> still blocked
      expect(await isRateLimited(null, ip, key, limit, windowSec)).toBe(true);
    });

    it('isolates different client IPs so one client reaching limit does not block another', async () => {
      const ipA = '192.168.10.1';
      const ipB = '192.168.10.2';
      const key = 'event_feedback';
      const limit = 2;

      expect(await isRateLimited(null, ipA, key, limit, 60)).toBe(false);
      expect(await isRateLimited(null, ipA, key, limit, 60)).toBe(false);
      expect(await isRateLimited(null, ipA, key, limit, 60)).toBe(true); // IP A blocked

      // IP B has its own bucket and is allowed
      expect(await isRateLimited(null, ipB, key, limit, 60)).toBe(false);
      expect(await isRateLimited(null, ipB, key, limit, 60)).toBe(false);
      expect(await isRateLimited(null, ipB, key, limit, 60)).toBe(true); // IP B now blocked
    });

    it('isolates different action keys and windows for the same IP', async () => {
      const ip = '10.20.30.40';

      // 10 registrations per 3600s
      for (let i = 0; i < 10; i++) {
        expect(await isRateLimited(null, ip, 'event_registrations', 10, 3600)).toBe(false);
      }
      // 11th registration -> blocked
      expect(await isRateLimited(null, ip, 'event_registrations', 10, 3600)).toBe(true);

      // Ticket lookups for the same IP has a different window (300s) and limit (30) -> allowed
      expect(await isRateLimited(null, ip, 'event_registrations', 30, 300)).toBe(false);

      // Feedback for the same IP has key 'event_feedback' -> allowed
      expect(await isRateLimited(null, ip, 'event_feedback', 10, 600)).toBe(false);
    });

    it('resets and allows requests after window expires', async () => {
      const ip = '192.168.1.50';
      const key = 'test_expiry';
      const limit = 1;
      const windowSec = 1; // 1 second window

      expect(await isRateLimited(null, ip, key, limit, windowSec)).toBe(false);
      expect(await isRateLimited(null, ip, key, limit, windowSec)).toBe(true);

      // Advance time beyond window
      const realNow = Date.now;
      try {
        Date.now = () => realNow() + 1500;
        expect(await isRateLimited(null, ip, key, limit, windowSec)).toBe(false);
      } finally {
        Date.now = realNow;
      }
    });

    it('immediately blocks when limit <= 0', async () => {
      expect(await isRateLimited(null, '1.2.3.4', 'test', 0, 60)).toBe(true);
      expect(await isRateLimited(null, '1.2.3.4', 'test', -1, 60)).toBe(true);
    });

    it('handles already-hashed 64-char hex strings without double hashing', async () => {
      const rawIp = '8.8.8.8';
      const preHashed = await hashIp(rawIp);

      expect(await isRateLimited(null, rawIp, 'test_hash', 1, 60)).toBe(false);
      // Calling with preHashed should hit the same bucket and get rate-limited
      expect(await isRateLimited(null, preHashed, 'test_hash', 1, 60)).toBe(true);
    });
  });

  describe('checkRateLimit & Database Error Handling', () => {
    it('returns allowed: true when count < maxAllowed', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 2, error: null }),
            }),
          }),
        }),
      };

      const res = await checkRateLimit(mockSupabase, 'applications', 'some-hash-value-123', 3, 24);
      expect(res.allowed).toBe(true);
      expect(res.count).toBe(3); // 2 DB records + 1 current in-flight request
    });

    it('returns allowed: false when count >= maxAllowed', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 3, error: null }),
            }),
          }),
        }),
      };

      const res = await checkRateLimit(mockSupabase, 'applications', 'some-hash-value-456', 3, 24);
      expect(res.allowed).toBe(false);
      expect(res.count).toBe(4);
    });

    it('fails open on single database error to protect legitimate user availability', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: null, error: { message: 'db connection failed' } }),
            }),
          }),
        }),
      };

      const res = await checkRateLimit(mockSupabase, 'contact_messages', 'legit-hash-value', 5, 24);
      expect(res.allowed).toBe(true);
      expect(res.count).toBe(1);

      // Ensure error was logged safely without leaking raw IP or secrets
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ratelimit] Database error checking contact_messages: db connection failed')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining(VALID_TEST_SALT));
    });

    it('throttles rapid floods even when database continues to fail', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: null, error: { message: 'db timeout' } }),
            }),
          }),
        }),
      };

      const hash = 'flooding-client-hash';
      const maxAllowed = 3;

      // 1st request -> allowed under error
      const r1 = await checkRateLimit(mockSupabase, 'applications', hash, maxAllowed, 24);
      expect(r1.allowed).toBe(true);

      // 2nd request -> allowed
      const r2 = await checkRateLimit(mockSupabase, 'applications', hash, maxAllowed, 24);
      expect(r2.allowed).toBe(true);

      // 3rd request -> allowed
      const r3 = await checkRateLimit(mockSupabase, 'applications', hash, maxAllowed, 24);
      expect(r3.allowed).toBe(true);

      // 4th request while DB still failing -> blocked by in-flight/in-memory limiter
      const r4 = await checkRateLimit(mockSupabase, 'applications', hash, maxAllowed, 24);
      expect(r4.allowed).toBe(false);
    });

    it('handles unexpected exceptions safely without crashing', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSupabase = {
        from: vi.fn().mockImplementation(() => {
          throw new Error('Fatal network partition');
        }),
      };

      const res = await checkRateLimit(mockSupabase, 'contact_messages', 'exception-hash', 3, 24);
      expect(res.allowed).toBe(true);
    });
  });

  describe('Race Condition & Concurrent Requests (Atomic Reservations)', () => {
    it('prevents race conditions: allows only 1 request when DB is 1 under limit during concurrent surge', async () => {
      // Simulated DB that delays response so concurrent requests overlap
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockImplementation(
                () =>
                  new Promise((resolve) => {
                    setTimeout(() => resolve({ count: 2, error: null }), 20);
                  })
              ),
            }),
          }),
        }),
      };

      const testHash = 'concurrent-user-hash-1';
      const maxAllowed = 3;

      // Dispatch 5 concurrent requests from the exact same IP hash simultaneously
      const results = await Promise.all([
        checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24),
        checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24),
        checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24),
        checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24),
        checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24),
      ]);

      const allowedCount = results.filter((r) => r.allowed).length;
      const blockedCount = results.filter((r) => !r.allowed).length;

      // With DB count = 2 and limit = 3, EXACTLY 1 concurrent request can be allowed!
      expect(allowedCount).toBe(1);
      expect(blockedCount).toBe(4);
    });

    it('allows exactly maxAllowed concurrent requests when starting with 0 records', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockImplementation(
                () =>
                  new Promise((resolve) => {
                    setTimeout(() => resolve({ count: 0, error: null }), 15);
                  })
              ),
            }),
          }),
        }),
      };

      const testHash = 'concurrent-user-hash-from-zero';
      const maxAllowed = 3;

      const results = await Promise.all([
        checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24),
        checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24),
        checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24),
        checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24),
        checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24),
      ]);

      const allowedCount = results.filter((r) => r.allowed).length;
      const blockedCount = results.filter((r) => !r.allowed).length;

      expect(allowedCount).toBe(3);
      expect(blockedCount).toBe(2);
    });

    it('frees in-flight reservation immediately when release() is called', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 2, error: null }),
            }),
          }),
        }),
      };

      const testHash = 'release-test-hash';
      const maxAllowed = 3;

      // Request 1 takes the 3rd and final slot
      const r1 = await checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24);
      expect(r1.allowed).toBe(true);

      // Immediate subsequent request is blocked
      const r2 = await checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24);
      expect(r2.allowed).toBe(false);

      // Caller releases r1 (e.g. form validation or Turnstile failed before insert)
      r1.release();

      // Subsequent request is now allowed because slot was freed
      const r3 = await checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24);
      expect(r3.allowed).toBe(true);
    });

    it('auto-expires reservations after TTL so legitimate users are never permanently blocked', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 2, error: null }),
            }),
          }),
        }),
      };

      const testHash = 'ttl-test-hash';
      const maxAllowed = 3;

      const r1 = await checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24);
      expect(r1.allowed).toBe(true);

      // Advance time past 30-second TTL
      const realNow = Date.now;
      try {
        Date.now = () => realNow() + 35000;
        const r2 = await checkRateLimit(mockSupabase, 'applications', testHash, maxAllowed, 24);
        expect(r2.allowed).toBe(true);
      } finally {
        Date.now = realNow;
      }
    });
  });

  describe('Edge Functions Expected Rate Limits & Schema Validation', () => {
    it('enforces register-event: max 10 registrations per IP per hour', async () => {
      const ip = '198.51.100.1';
      for (let i = 0; i < 10; i++) {
        const limited = await isRateLimited(null, ip, 'event_registrations', 10, 3600);
        expect(limited).toBe(false);
      }
      const eleventh = await isRateLimited(null, ip, 'event_registrations', 10, 3600);
      expect(eleventh).toBe(true);
    });

    it('enforces ticket-lookup: max 30 lookups per IP per 5 minutes', async () => {
      const ip = '198.51.100.2';
      for (let i = 0; i < 30; i++) {
        const limited = await isRateLimited(null, ip, 'event_registrations', 30, 300);
        expect(limited).toBe(false);
      }
      const thirtyFirst = await isRateLimited(null, ip, 'event_registrations', 30, 300);
      expect(thirtyFirst).toBe(true);
    });

    it('enforces submit-feedback: max 10 submissions per IP per 10 minutes', async () => {
      const ip = '198.51.100.3';
      for (let i = 0; i < 10; i++) {
        const limited = await isRateLimited(null, ip, 'event_feedback', 10, 600);
        expect(limited).toBe(false);
      }
      const eleventh = await isRateLimited(null, ip, 'event_feedback', 10, 600);
      expect(eleventh).toBe(true);
    });

    it('validates register-event input schema correctly', () => {
      const valid = {
        event_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'أحمد محمود',
        email: 'ahmed@example.com',
        phone: '01012345678',
        turnstile_token: 'cf-turnstile-token-12345',
      };
      expect(RegisterSchema.safeParse(valid).success).toBe(true);

      const invalidEmail = { ...valid, email: 'not-an-email' };
      expect(RegisterSchema.safeParse(invalidEmail).success).toBe(false);

      const missingToken = { ...valid, turnstile_token: '' };
      expect(RegisterSchema.safeParse(missingToken).success).toBe(false);
    });

    it('validates ticket-lookup input schema correctly', () => {
      expect(LookupSchema.safeParse({ code: 'ENQ-ABC123' }).success).toBe(true);
      expect(LookupSchema.safeParse({ code: 'AB' }).success).toBe(false); // min 3
      expect(LookupSchema.safeParse({ code: '' }).success).toBe(false);
    });

    it('validates submit-feedback input schema correctly', () => {
      const valid = {
        ticket_code: 'ENQ-XYZ789',
        rating: 5,
        comment: 'فعالية ممتازة وتنظيم رائع!',
      };
      expect(FeedbackSchema.safeParse(valid).success).toBe(true);

      const invalidRatingLow = { ...valid, rating: 0 };
      expect(FeedbackSchema.safeParse(invalidRatingLow).success).toBe(false);

      const invalidRatingHigh = { ...valid, rating: 6 };
      expect(FeedbackSchema.safeParse(invalidRatingHigh).success).toBe(false);
    });
  });
});
