// tests/qr.test.js
import { describe, it, expect } from 'vitest';
import {
  getCurrentWindow,
  getWindowExpiresAtMs,
  base64UrlEncode,
  base64UrlDecode,
  generateQrTokenAndCode,
  verifyQrToken,
  verifyManualCode,
  timingSafeEqual,
  QR_WINDOW_SECONDS,
} from '../supabase/functions/_shared/qr.ts';

describe('Phase 8 QR Token & Rotating Window Helpers', () => {
  const sessionId = '11111111-2222-3333-4444-555555555555';
  const secret = 'super-secret-random-hex-string-for-session';

  describe('Base64URL encoding/decoding', () => {
    it('round-trips arbitrary strings safely', () => {
      const original = 'test.string-with_symbols+and/slashes==';
      const encoded = base64UrlEncode(original);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
      expect(base64UrlDecode(encoded)).toBe(original);
    });
  });

  describe('Window calculations', () => {
    it('computes 30-second windows monotonically', () => {
      const t0 = 30000 * 100; // Exact window boundary: 3,000,000 ms
      const w0 = getCurrentWindow(t0, 30);
      const w1 = getCurrentWindow(t0 + 29000, 30);
      const w2 = getCurrentWindow(t0 + 31000, 30);

      expect(w0).toBe(w1);
      expect(w2).toBe(w0 + 1);
    });

    it('returns future expiry epoch ms', () => {
      const t = Date.now();
      const w = getCurrentWindow(t, 30);
      const expiry = getWindowExpiresAtMs(w, 30);
      expect(expiry).toBeGreaterThan(t);
      expect(expiry - t).toBeLessThanOrEqual(30 * 1000);
    });
  });

  describe('Token and Code Generation & Verification', () => {
    it('generates a valid base64url token and an 8-character uppercase base32 code', async () => {
      const now = 1700000000000;
      const result = await generateQrTokenAndCode(sessionId, secret, now);

      expect(result.token).toBeDefined();
      expect(result.code).toHaveLength(8);
      expect(result.code).toMatch(/^[A-Z2-7]{8}$/);
      expect(result.expiresAt).toBeDefined();

      // Verify the generated token
      const verification = await verifyQrToken(result.token, secret, now);
      expect(verification.valid).toBe(true);
      expect(verification.sessionId).toBe(sessionId);
      expect(verification.window).toBe(result.window);

      // Verify the manual code
      const codeVerification = await verifyManualCode(sessionId, result.code, secret, now);
      expect(codeVerification.valid).toBe(true);
      expect(codeVerification.window).toBe(result.window);
    });

    it('accepts tokens and codes from the immediately previous window (skew allowance)', async () => {
      const windowMs = QR_WINDOW_SECONDS * 1000;
      const t1 = 1700000000000;
      const result = await generateQrTokenAndCode(sessionId, secret, t1);

      // Check in during next window (e.g. t1 + 35s)
      const t2 = t1 + windowMs + 5000;
      const tokenVerification = await verifyQrToken(result.token, secret, t2);
      expect(tokenVerification.valid).toBe(true);

      const codeVerification = await verifyManualCode(sessionId, result.code, secret, t2);
      expect(codeVerification.valid).toBe(true);
    });

    it('rejects expired tokens and codes (2 windows / 60+ seconds later)', async () => {
      const windowMs = QR_WINDOW_SECONDS * 1000;
      const t1 = 1700000000000;
      const result = await generateQrTokenAndCode(sessionId, secret, t1);

      // 2 windows later (e.g. t1 + 65s)
      const tExpired = t1 + 2 * windowMs + 5000;
      const tokenVerification = await verifyQrToken(result.token, secret, tExpired);
      expect(tokenVerification.valid).toBe(false);
      expect(tokenVerification.error).toMatch(/expired/i);

      const codeVerification = await verifyManualCode(sessionId, result.code, secret, tExpired);
      expect(codeVerification.valid).toBe(false);
    });

    it('rejects tampered tokens with invalid signature or wrong secret', async () => {
      const now = 1700000000000;
      const result = await generateQrTokenAndCode(sessionId, secret, now);

      // 1. Wrong secret
      const wrongSecretCheck = await verifyQrToken(result.token, 'wrong-secret', now);
      expect(wrongSecretCheck.valid).toBe(false);

      // 2. Modified payload
      const decoded = base64UrlDecode(result.token);
      const tamperedDecoded = decoded.replace(sessionId, '99999999-9999-9999-9999-999999999999');
      const tamperedToken = base64UrlEncode(tamperedDecoded);

      const tamperedCheck = await verifyQrToken(tamperedToken, secret, now);
      expect(tamperedCheck.valid).toBe(false);
    });

    it('timingSafeEqual correctly compares equal and non-equal strings', () => {
      expect(timingSafeEqual('ABCDEF12', 'ABCDEF12')).toBe(true);
      expect(timingSafeEqual('ABCDEF12', 'ABCDEF13')).toBe(false);
      expect(timingSafeEqual('ABCDEF12', 'SHORT')).toBe(false);
      expect(timingSafeEqual('', '')).toBe(true);
    });
  });
});
