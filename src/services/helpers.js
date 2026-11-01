import { isSupabaseConfigured } from '../lib/supabase';

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
    if (Array.isArray(rows) && rows.length === 0 && Array.isArray(fallback)) return fallback;
    return rows ?? fallback;
  } catch (err) {
    console.error('[services] falling back to mock data:', err);
    return fallback;
  }
}

/** Pick the right language column: pick(row, 'title', 'ar') -> row.title_ar ?? row.title_en */
export function pick(row, field, lang) {
  if (!row) return '';
  const other = lang === 'ar' ? 'en' : 'ar';
  return row[`${field}_${lang}`] ?? row[`${field}_${other}`] ?? '';
}
