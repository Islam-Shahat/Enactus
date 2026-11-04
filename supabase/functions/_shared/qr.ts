// supabase/functions/_shared/qr.ts
// Pure HMAC-SHA256, rotating window, base64url, and base32 code helpers.

export const QR_WINDOW_SECONDS = 30;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Returns the current time window bucket index.
 */
export function getCurrentWindow(
  timestampMs: number = Date.now(),
  windowSeconds: number = QR_WINDOW_SECONDS
): number {
  return Math.floor(timestampMs / 1000 / windowSeconds);
}

/**
 * Returns the expiration epoch timestamp (in ms) for a given window index.
 */
export function getWindowExpiresAtMs(
  window: number,
  windowSeconds: number = QR_WINDOW_SECONDS
): number {
  return (window + 1) * windowSeconds * 1000;
}

/**
 * Encodes ASCII string to base64url format.
 */
export function base64UrlEncode(str: string): string {
  const b64 = globalThis.btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes base64url string to ASCII string.
 */
export function base64UrlDecode(base64UrlStr: string): string {
  let b64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  return globalThis.atob(b64);
}

/**
 * Computes HMAC-SHA256 of data using the secret key via Web Crypto API.
 */
export async function computeHmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data));
  return new Uint8Array(signature);
}

/**
 * Converts Uint8Array bytes to lowercase hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derives an uppercase base32 code (default 8 chars) from HMAC bytes.
 * 8 chars * 5 bits = 40 bits = 5 bytes.
 */
export function deriveBase32Code(hmacBytes: Uint8Array, length: number = 8): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < hmacBytes.length && output.length < length; i++) {
    value = (value << 8) | hmacBytes[i];
    bits += 8;

    while (bits >= 5 && output.length < length) {
      bits -= 5;
      const index = (value >>> bits) & 0x1f;
      output += BASE32_ALPHABET[index];
    }
  }

  return output;
}

/**
 * Constant-time string comparison to defend against timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Generates the rotating QR token and manual entry 8-character code.
 */
export async function generateQrTokenAndCode(
  sessionId: string,
  secret: string,
  timestampMs: number = Date.now(),
  windowSeconds: number = QR_WINDOW_SECONDS
): Promise<{ token: string; code: string; expiresAt: string; window: number }> {
  const window = getCurrentWindow(timestampMs, windowSeconds);
  const data = `${sessionId}.${window}`;
  const hmacBytes = await computeHmacSha256(secret, data);
  const hmacHex = bytesToHex(hmacBytes);

  // token = base64url(session_id + '.' + window + '.' + HMAC-SHA256)
  const token = base64UrlEncode(`${sessionId}.${window}.${hmacHex}`);
  const code = deriveBase32Code(hmacBytes, 8);
  const expiresAt = new Date(getWindowExpiresAtMs(window, windowSeconds)).toISOString();

  return { token, code, expiresAt, window };
}

/**
 * Verifies a QR token against the current and previous windows (allowing clock skew / boundary transitions).
 */
export async function verifyQrToken(
  token: string,
  secret: string,
  timestampMs: number = Date.now(),
  windowSeconds: number = QR_WINDOW_SECONDS
): Promise<{ valid: boolean; sessionId?: string; window?: number; error?: string }> {
  try {
    const decoded = base64UrlDecode(token.trim());
    const parts = decoded.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token structure' };
    }

    const [sessionId, windowStr, signatureHex] = parts;
    const tokenWindow = parseInt(windowStr, 10);
    if (Number.isNaN(tokenWindow)) {
      return { valid: false, error: 'Invalid window value' };
    }

    const currentWindow = getCurrentWindow(timestampMs, windowSeconds);
    // Accept only current and previous window
    if (tokenWindow !== currentWindow && tokenWindow !== currentWindow - 1) {
      return { valid: false, error: 'Token has expired' };
    }

    // Verify HMAC
    const data = `${sessionId}.${tokenWindow}`;
    const expectedHmacBytes = await computeHmacSha256(secret, data);
    const expectedHmacHex = bytesToHex(expectedHmacBytes);

    if (!timingSafeEqual(signatureHex.toLowerCase(), expectedHmacHex.toLowerCase())) {
      return { valid: false, error: 'Invalid token signature' };
    }

    return { valid: true, sessionId, window: tokenWindow };
  } catch {
    return { valid: false, error: 'Malformed token' };
  }
}

/**
 * Verifies a manual 8-character code against current and previous windows.
 */
export async function verifyManualCode(
  sessionId: string,
  code: string,
  secret: string,
  timestampMs: number = Date.now(),
  windowSeconds: number = QR_WINDOW_SECONDS
): Promise<{ valid: boolean; window?: number; error?: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.length !== 8) {
    return { valid: false, error: 'Code must be 8 characters' };
  }

  const currentWindow = getCurrentWindow(timestampMs, windowSeconds);
  const candidateWindows = [currentWindow, currentWindow - 1];

  for (const w of candidateWindows) {
    const data = `${sessionId}.${w}`;
    const hmacBytes = await computeHmacSha256(secret, data);
    const candidateCode = deriveBase32Code(hmacBytes, 8);

    if (timingSafeEqual(cleanCode, candidateCode)) {
      return { valid: true, window: w };
    }
  }

  return { valid: false, error: 'Invalid or expired code' };
}

