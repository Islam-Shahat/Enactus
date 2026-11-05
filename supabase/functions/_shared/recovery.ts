// supabase/functions/_shared/recovery.ts
// Cryptographic token generation and verification for proof of email ownership in ticket recovery.

export function base64UrlEncode(str: string): string {
  const b64 = globalThis.btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(base64UrlStr: string): string {
  let b64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  return globalThis.atob(b64);
}

export async function computeHmacSha256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface TicketRecoveryPayload {
  eventId: string;
  email: string;
  exp: number; // epoch timestamp in ms
}

/**
 * Generates an HMAC-signed ticket recovery token proving email ownership.
 *
 * @param eventId - Target event UUID
 * @param email - Attendee email address
 * @param secret - Secret key (JWT secret, service role key, or recovery salt)
 * @param expiresInMs - Validity duration (default: 24 hours)
 */
export async function generateTicketRecoveryToken(
  eventId: string,
  email: string,
  secret: string,
  expiresInMs: number = 24 * 60 * 60 * 1000
): Promise<string> {
  const payload: TicketRecoveryPayload = {
    eventId: eventId.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    exp: Date.now() + expiresInMs,
  };
  const payloadStr = JSON.stringify(payload);
  const data = base64UrlEncode(payloadStr);
  const sig = await computeHmacSha256(secret, data);
  return `${data}.${sig}`;
}

/**
 * Verifies a ticket recovery token against event ID, email, expiration, and HMAC signature.
 */
export async function verifyTicketRecoveryToken(
  token: string | undefined | null,
  eventId: string,
  email: string,
  secret: string
): Promise<{ valid: boolean; error?: string; payload?: TicketRecoveryPayload }> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Recovery token is required' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, error: 'Malformed recovery token structure' };
  }

  const [data, sig] = parts;

  // 1. Verify HMAC signature with constant-time equality
  const expectedSig = await computeHmacSha256(secret, data);
  if (!timingSafeEqual(sig, expectedSig)) {
    return { valid: false, error: 'Invalid token signature' };
  }

  // 2. Decode and parse payload
  let payload: TicketRecoveryPayload;
  try {
    const jsonStr = base64UrlDecode(data);
    payload = JSON.parse(jsonStr);
  } catch {
    return { valid: false, error: 'Corrupted token payload' };
  }

  // 3. Verify expiration
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
    return { valid: false, error: 'Recovery token has expired' };
  }

  // 4. Verify event binding
  if (payload.eventId !== eventId.toLowerCase().trim()) {
    return { valid: false, error: 'Token event mismatch' };
  }

  // 5. Verify email binding
  if (payload.email !== email.toLowerCase().trim()) {
    return { valid: false, error: 'Token email mismatch' };
  }

  return { valid: true, payload };
}

