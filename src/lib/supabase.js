import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** False until .env.local is filled in. Services use it to fall back to mock data. */
export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Using mock data.');
}

// Placeholders keep the app from crashing before configuration.
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  key ?? 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
