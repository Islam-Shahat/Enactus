import { supabase } from '../lib/supabase';
import { unwrap, withFallback } from './helpers';

// Example of the pattern every public page follows.
// 1) import your old mock:  import mockEvents from '../data/events';
// 2) keep the same shape the components expect (map here if the column names differ).

export function listPublicEvents(mockEvents = []) {
  return withFallback(async () => {
    const rows = unwrap(
      await supabase
        .from('events')
        .select('id, slug, title_ar, title_en, description_ar, description_en, venue_ar, venue_en, starts_at, ends_at, cover_url, status, registration_open')
        .order('starts_at', { ascending: false }),
    );
    return rows; // RLS already limits anonymous visitors to public, published events
  }, mockEvents);
}

export function getEventBySlug(slug, mockEvents = []) {
  return withFallback(async () => {
    const row = unwrap(await supabase.from('events').select('*').eq('slug', slug).maybeSingle());
    return row;
  }, mockEvents.find((e) => e.slug === slug) ?? null);
}
