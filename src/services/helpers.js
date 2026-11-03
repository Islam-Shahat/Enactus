import { isSupabaseConfigured } from '../lib/supabase';

// Set VITE_USE_MOCK_FALLBACK=false in production so an intentionally empty table
// shows an empty page instead of silently showing the old mock content.
const ALLOW_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false';

/** Throw on Supabase errors so React Query can surface them. */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/**
 * Strangler pattern: try Supabase first, fall back to the old mock data so pages
 * keep working while tables are still empty or the project is not configured.
 *   withFallback(() => fetchFromDb(), mockEvents)
 */
export async function withFallback(fetcher, fallback) {
  if (!isSupabaseConfigured) return fallback;
  try {
    const rows = await fetcher();
    if (ALLOW_FALLBACK && Array.isArray(rows) && rows.length === 0 && Array.isArray(fallback)) return fallback;
    return rows ?? fallback;
  } catch (err) {
    console.error('[services] request failed:', err?.message ?? err);
    if (ALLOW_FALLBACK) return fallback;
    throw err;
  }
}

export { pick } from './adapters';
