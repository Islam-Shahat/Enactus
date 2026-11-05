// supabase/functions/_shared/ratelimit.ts

// Lightweight structural interface for Supabase client across Deno, Edge, and test environments
export interface RateLimitClient {
  from: (table: string) => {
    select: (columns?: string, options?: { count?: string; head?: boolean }) => {
      eq: (column: string, value: unknown) => {
        gte: (column: string, value: unknown) => Promise<{ count: number | null; error: unknown }>;
      };
    };
  };
  [key: string]: any;
}

export type SupabaseClient = RateLimitClient;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  release?: () => void;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface InFlightReservation {
  count: number;
  expiresAt: number;
}

// In-memory bucket store for sliding window rate limiting
const memoryRateLimitStore = new Map<string, RateLimitBucket>();

// In-memory atomic reservation store to eliminate race conditions between check and insert
const inFlightStore = new Map<string, InFlightReservation>();

// Disallowed insecure or sample salt values
const INSECURE_DEFAULT_SALTS = new Set([
  'enactus-qena-default-ip-salt-2026',
  'change-me',
  'default',
  'secret',
  'password',
  'test',
]);

function pruneExpiredBuckets(now: number): void {
  if (memoryRateLimitStore.size > 2000) {
    for (const [key, bucket] of memoryRateLimitStore.entries()) {
      if (now >= bucket.resetAt) {
        memoryRateLimitStore.delete(key);
      }
    }
  }
}

function pruneExpiredReservations(now: number): void {
  for (const [key, res] of inFlightStore.entries()) {
    if (now >= res.expiresAt || res.count <= 0) {
      inFlightStore.delete(key);
    }
  }
}

/**
 * Validates and retrieves the IP hash secret salt.
 * Requires a securely configured secret (minimum 16 characters) and rejects hard-coded/insecure defaults.
 * Never leaks the secret value in thrown error messages.
 */
export function getSalt(options?: { salt?: string }): string {
  const salt =
    options?.salt ||
    (typeof Deno !== 'undefined'
      ? Deno.env?.get('IP_HASH_SALT')
      : typeof process !== 'undefined'
      ? process.env?.IP_HASH_SALT
      : undefined);

  if (!salt || typeof salt !== 'string' || salt.trim().length === 0) {
    throw new Error('IP_HASH_SALT secret is required and must be properly configured');
  }

  const trimmed = salt.trim();
  if (trimmed.length < 16) {
    throw new Error('IP_HASH_SALT secret must be at least 16 characters long');
  }

  if (INSECURE_DEFAULT_SALTS.has(trimmed.toLowerCase())) {
    throw new Error('Insecure or placeholder IP_HASH_SALT is not permitted');
  }

  return trimmed;
}

/**
 * Hashes an IP address using SHA-256 with a required secret salt for GDPR/privacy compliance.
 * Never logs raw IP addresses or secret values.
 */
export async function hashIp(ip: string, options?: { salt?: string }): Promise<string> {
  const salt = getSalt(options);
  const clientIp = (ip || '127.0.0.1').trim();
  const data = new TextEncoder().encode(clientIp + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks database-backed rate limit for tables that persist an `ip_hash` column
 * (e.g. applications, contact_messages).
 *
 * Uses an atomic in-memory reservation mechanism to eliminate TOCTOU race conditions
 * between checking request counts and inserting new records.
 *
 * Under transient database errors, fails open to prevent denial-of-service for legitimate users,
 * but still enforces in-memory throttling to protect against active floods.
 *
 * Never logs raw IP addresses or secret values.
 */
export async function checkRateLimit(
  supabase: RateLimitClient | any,
  table: 'applications' | 'contact_messages' | string,
  ipHash: string,
  maxAllowed = 3,
  windowHours = 24
): Promise<RateLimitResult> {
  if (!ipHash || typeof ipHash !== 'string') {
    return { allowed: false, count: 0 };
  }

  const now = Date.now();
  pruneExpiredReservations(now);

  const reservationKey = `${table}:${ipHash}`;
  const existingRes = inFlightStore.get(reservationKey);
  const currentInFlight = existingRes && now < existingRes.expiresAt ? existingRes.count : 0;

  // Immediate in-memory rejection if pending concurrent requests alone hit maxAllowed
  if (currentInFlight >= maxAllowed) {
    return { allowed: false, count: currentInFlight };
  }

  // Atomically claim 1 in-flight slot (30-second TTL prevents permanent lockout if request crashes)
  const newInFlightCount = currentInFlight + 1;
  inFlightStore.set(reservationKey, {
    count: newInFlightCount,
    expiresAt: now + 30000,
  });

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const cur = inFlightStore.get(reservationKey);
    if (cur) {
      cur.count = Math.max(0, cur.count - 1);
      if (cur.count === 0) {
        inFlightStore.delete(reservationKey);
      }
    }
  };

  const since = new Date(now - windowHours * 60 * 60 * 1000).toISOString();

  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);

    if (error) {
      const safeMsg = (error as any)?.message ? String((error as any).message) : 'Database check error';
      // Sanitized log: table name only, NO raw IP and NO secret
      console.error(`[ratelimit] Database error checking ${table}: ${safeMsg}`);

      // Fail-open for single requests to prevent legitimate DoS, but block active in-flight floods
      const allowedUnderError = newInFlightCount <= maxAllowed;
      if (!allowedUnderError) {
        release();
      }
      return { allowed: allowedUnderError, count: newInFlightCount, release };
    }

    const dbCount = count || 0;
    // Total effective count: committed DB rows + concurrent in-flight requests (including this one)
    const effectiveCount = dbCount + newInFlightCount;

    if (effectiveCount > maxAllowed) {
      release();
      return {
        allowed: false,
        count: effectiveCount,
      };
    }

    return {
      allowed: true,
      count: effectiveCount,
      release,
    };
  } catch (err: any) {
    const safeMsg = err?.message ? String(err.message) : 'Exception during rate limit check';
    console.error(`[ratelimit] Unexpected exception checking ${table}: ${safeMsg}`);

    const allowedUnderError = newInFlightCount <= maxAllowed;
    if (!allowedUnderError) {
      release();
    }
    return { allowed: allowedUnderError, count: newInFlightCount, release };
  }
}

/**
 * Checks whether a client IP has exceeded the allowed rate limit for a given key/action.
 * Returns true if the rate limit is EXCEEDED, or false if the request is ALLOWED.
 *
 * @param supabase - Optional SupabaseClient instance (used for DB checks when table has ip_hash)
 * @param clientIp - IP address or pre-hashed IP identifier
 * @param keyOrTable - Key or table name (e.g. 'event_registrations', 'event_feedback')
 * @param limit - Maximum requests allowed in the window (default 10)
 * @param windowSeconds - Window duration in seconds (default 60)
 */
export async function isRateLimited(
  supabase: unknown,
  clientIp: string,
  keyOrTable: string,
  limit = 10,
  windowSeconds = 60
): Promise<boolean> {
  if (limit <= 0) return true;

  let ipHash: string;
  if (clientIp && clientIp.length === 64 && /^[0-9a-f]{64}$/i.test(clientIp)) {
    ipHash = clientIp.toLowerCase();
  } else {
    try {
      ipHash = await hashIp(clientIp || '127.0.0.1');
    } catch {
      // Secret is missing or misconfigured: fail closed/safely without leaking
      console.error('[ratelimit] Rate limiting failed safely: IP_HASH_SALT missing or misconfigured');
      return true;
    }
  }

  // Key is scoped by keyOrTable, windowSeconds, and hashed IP so different windows do not conflict
  const bucketKey = `${keyOrTable}:${windowSeconds}:${ipHash}`;
  const now = Date.now();

  pruneExpiredBuckets(now);

  const bucket = memoryRateLimitStore.get(bucketKey);
  if (!bucket || now >= bucket.resetAt) {
    memoryRateLimitStore.set(bucketKey, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
  } else {
    if (bucket.count >= limit) {
      return true; // Exceeded in-memory threshold
    }
    bucket.count++;
  }

  // If supabase is provided and the table is known to persist ip_hash in postgres
  // (e.g. applications, contact_messages), also cross-check persistent database records.
  if (
    supabase &&
    typeof (supabase as any)?.from === 'function' &&
    (keyOrTable === 'applications' || keyOrTable === 'contact_messages')
  ) {
    const windowHours = Math.max(1, Math.ceil(windowSeconds / 3600));
    const dbCheck = await checkRateLimit(supabase as any, keyOrTable, ipHash, limit, windowHours);
    if (!dbCheck.allowed) {
      return true;
    }
  }

  return false;
}

/**
 * Test helper to clear memory rate limit store and in-flight reservation store.
 */
export function _clearRateLimitStore(): void {
  memoryRateLimitStore.clear();
  inFlightStore.clear();
}

/**
 * Test helper to read store size.
 */
export function _getRateLimitStoreSize(): number {
  return memoryRateLimitStore.size;
}

/**
 * Test helper to read in-flight reservation store size.
 */
export function _getInFlightStoreSize(): number {
  return inFlightStore.size;
}
