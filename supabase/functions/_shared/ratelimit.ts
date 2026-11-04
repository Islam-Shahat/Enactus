// supabase/functions/_shared/ratelimit.ts
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get('IP_HASH_SALT') || 'enactus-qena-default-ip-salt-2026';
  const data = new TextEncoder().encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  table: 'applications' | 'contact_messages',
  ipHash: string,
  maxAllowed = 3,
  windowHours = 24
): Promise<{ allowed: boolean; count: number }> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);

  if (error) {
    console.error(`[ratelimit] error checking ${table}:`, error);
    // On unexpected database error, fail open to avoid rejecting legitimate traffic
    return { allowed: true, count: 0 };
  }

  const currentCount = count || 0;
  return {
    allowed: currentCount < maxAllowed,
    count: currentCount,
  };
}

