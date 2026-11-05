// tests/eventRegistrationRecovery.test.js
import { describe, it, expect } from 'vitest';
import {
  generateTicketRecoveryToken,
  verifyTicketRecoveryToken,
  base64UrlEncode,
  base64UrlDecode,
  timingSafeEqual,
} from '../supabase/functions/_shared/recovery.ts';
import {
  RegisterSchema,
  formatRegistrationResponse,
} from '../supabase/functions/register-event/index.ts';

describe('Event Registration Security & Ticket Recovery Flow', () => {
  const secretKey = 'test-secret-recovery-key-for-hmac-sha256-signing';
  const eventId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const attendeeEmail = 'attendee@enactusqena.org';
  const ticketCode = 'ENQ-ABC123';

  describe('Cryptographic Recovery Token Helpers', () => {
    it('generates and verifies a valid recovery token for matching event and email', async () => {
      const token = await generateTicketRecoveryToken(eventId, attendeeEmail, secretKey);
      expect(typeof token).toBe('string');
      expect(token.includes('.')).toBe(true);

      const verification = await verifyTicketRecoveryToken(token, eventId, attendeeEmail, secretKey);
      expect(verification.valid).toBe(true);
      expect(verification.payload?.eventId).toBe(eventId.toLowerCase());
      expect(verification.payload?.email).toBe(attendeeEmail.toLowerCase());
    });

    it('handles email and event ID case insensitivity and whitespace', async () => {
      const token = await generateTicketRecoveryToken(
        ' ' + eventId.toUpperCase() + ' ',
        ' Attendee@EnactusQena.ORG ',
        secretKey
      );

      const verification = await verifyTicketRecoveryToken(
        token,
        eventId.toLowerCase(),
        'attendee@enactusqena.org',
        secretKey
      );
      expect(verification.valid).toBe(true);
    });

    it('rejects tampered tokens with invalid signature', async () => {
      const token = await generateTicketRecoveryToken(eventId, attendeeEmail, secretKey);
      const [data, sig] = token.split('.');
      
      // Tamper signature by changing last character
      const tamperedSig = sig.slice(0, -1) + (sig.slice(-1) === 'a' ? 'b' : 'a');
      const tamperedToken = `${data}.${tamperedSig}`;

      const res = await verifyTicketRecoveryToken(tamperedToken, eventId, attendeeEmail, secretKey);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Invalid token signature');
    });

    it('rejects tokens signed with a different secret', async () => {
      const token = await generateTicketRecoveryToken(eventId, attendeeEmail, 'wrong-secret');
      const res = await verifyTicketRecoveryToken(token, eventId, attendeeEmail, secretKey);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Invalid token signature');
    });

    it('rejects expired tokens', async () => {
      // Create a token expired 10 seconds ago
      const token = await generateTicketRecoveryToken(eventId, attendeeEmail, secretKey, -10000);
      const res = await verifyTicketRecoveryToken(token, eventId, attendeeEmail, secretKey);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Recovery token has expired');
    });

    it('rejects token when attempting to use for a different attendee email', async () => {
      const token = await generateTicketRecoveryToken(eventId, attendeeEmail, secretKey);
      const res = await verifyTicketRecoveryToken(token, eventId, 'attacker@example.com', secretKey);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Token email mismatch');
    });

    it('rejects token when attempting to use for a different event', async () => {
      const otherEventId = '11111111-2222-3333-4444-555555555555';
      const token = await generateTicketRecoveryToken(eventId, attendeeEmail, secretKey);
      const res = await verifyTicketRecoveryToken(token, otherEventId, attendeeEmail, secretKey);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Token event mismatch');
    });

    it('rejects malformed tokens', async () => {
      expect((await verifyTicketRecoveryToken(null, eventId, attendeeEmail, secretKey)).valid).toBe(false);
      expect((await verifyTicketRecoveryToken('', eventId, attendeeEmail, secretKey)).valid).toBe(false);
      expect((await verifyTicketRecoveryToken('not-a-token', eventId, attendeeEmail, secretKey)).valid).toBe(false);
      expect((await verifyTicketRecoveryToken('a.b.c', eventId, attendeeEmail, secretKey)).valid).toBe(false);
    });

    it('base64Url encoding roundtrip and timingSafeEqual correctness', () => {
      const original = JSON.stringify({ hello: 'world', special: '+=/!@#' });
      const encoded = base64UrlEncode(original);
      expect(encoded).not.toMatch(/[+/=]/);
      const decoded = base64UrlDecode(encoded);
      expect(decoded).toBe(original);

      expect(timingSafeEqual('abcdef', 'abcdef')).toBe(true);
      expect(timingSafeEqual('abcdef', 'abcdeg')).toBe(false);
      expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    });
  });

  describe('formatRegistrationResponse - Information Leakage Prevention', () => {
    it('unverified existing attendee does NOT receive ticket_code', () => {
      // Scenario: A caller knowing only the email and event registers or checks an existing attendee
      const response = formatRegistrationResponse({
        result: {
          ticket_code: null, // As returned by the secured DB function
          status: 'registered',
          is_existing: true,
        },
        hasVerifiedEmailOwnership: false,
      });

      expect(response.success).toBe(true);
      expect(response.is_existing).toBe(true);
      expect(response.requires_verification).toBe(true);
      expect(response.ticket_code).toBeUndefined();
      expect(response.message).toContain('تم تسجيلك مسبقاً');
    });

    it('unverified existing attendee response omits ticket_code even if DB returned one', () => {
      // Defense in depth: Even if database row had ticket_code, Edge Function must NEVER leak it without proof
      const response = formatRegistrationResponse({
        result: {
          ticket_code: ticketCode,
          status: 'registered',
          is_existing: true,
        },
        hasVerifiedEmailOwnership: false,
      });

      expect(response.success).toBe(true);
      expect(response.is_existing).toBe(true);
      expect(response.requires_verification).toBe(true);
      expect(response.ticket_code).toBeUndefined();
    });

    it('verified existing attendee recovers their ticket_code', () => {
      // Scenario: Attendee clicked email recovery link or provided valid HMAC token
      const response = formatRegistrationResponse({
        result: {
          ticket_code: ticketCode,
          status: 'registered',
          is_existing: true,
        },
        hasVerifiedEmailOwnership: true,
      });

      expect(response.success).toBe(true);
      expect(response.is_existing).toBe(true);
      expect(response.verified).toBe(true);
      expect(response.ticket_code).toBe(ticketCode);
      expect(response.status).toBe('registered');
      expect(response.message).toContain('تم استرداد التذكرة بنجاح');
    });

    it('brand-new attendee registration returns ticket_code directly', () => {
      // Scenario: First-time registration
      const response = formatRegistrationResponse({
        result: {
          ticket_code: ticketCode,
          status: 'registered',
          is_existing: false,
        },
        hasVerifiedEmailOwnership: false,
      });

      expect(response.success).toBe(true);
      expect(response.is_existing).toBe(false);
      expect(response.ticket_code).toBe(ticketCode);
      expect(response.status).toBe('registered');
      expect(response.requires_verification).toBeUndefined();
    });
  });

  describe('RegisterSchema Validation', () => {
    it('validates a standard registration payload', () => {
      const parsed = RegisterSchema.safeParse({
        event_id: eventId,
        name: 'Sarah Mohamed',
        email: 'sarah@example.com',
        phone: '01098765432',
        turnstile_token: 'valid-turnstile-token',
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.event_id).toBe(eventId);
        expect(parsed.data.email).toBe('sarah@example.com');
        expect(parsed.data.name).toBe('Sarah Mohamed');
      }
    });

    it('validates a ticket recovery payload with recovery_token', () => {
      const parsed = RegisterSchema.safeParse({
        event_id: eventId,
        email: 'sarah@example.com',
        recovery_token: 'payload.signature',
        action: 'recover',
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.recovery_token).toBe('payload.signature');
        expect(parsed.data.action).toBe('recover');
      }
    });

    it('rejects invalid email or invalid event UUID', () => {
      const invalidEmail = RegisterSchema.safeParse({
        event_id: eventId,
        email: 'not-an-email',
      });
      expect(invalidEmail.success).toBe(false);

      const invalidUuid = RegisterSchema.safeParse({
        event_id: 'not-a-uuid',
        email: 'valid@example.com',
      });
      expect(invalidUuid.success).toBe(false);
    });
  });
});

