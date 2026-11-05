import { supabase } from '../lib/supabase';
import { unwrap, withFallback } from './helpers';
import { eventFromRow } from './adapters';
import { localizeEventsMock } from './mockLocalization';

// Upcoming events first (soonest first), then past events (most recent first).
export function sortEvents(events) {
  const isUpcoming = (e) =>
    e.status === 'upcoming' ||
    e.status === 'published' ||
    e.status === 'ongoing' ||
    (e.status !== 'past' && e.status !== 'completed' && e.status !== 'cancelled');

  const upcoming = events
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.startsAt || a.starts_at || 0) - new Date(b.startsAt || b.starts_at || 0));

  const past = events
    .filter((e) => !isUpcoming(e))
    .sort((a, b) => new Date(b.startsAt || b.starts_at || 0) - new Date(a.startsAt || a.starts_at || 0));

  return [...upcoming, ...past];
}

export const listPublicEvents = (mock = [], lang = 'ar') => {
  const localizedFallback = localizeEventsMock(mock, lang);
  return withFallback(
    async () => sortEvents((await supabase.from('events').select('*').then(unwrap)).map((r) => eventFromRow(r, lang))),
    localizedFallback,
  );
};

export const getEventBySlug = (slug, mock = [], lang = 'ar') => {
  const localizedFallback = localizeEventsMock(mock, lang);
  return withFallback(async () => {
    const row = await supabase.from('events').select('*').eq('slug', slug).maybeSingle().then(unwrap);
    return row ? eventFromRow(row, lang) : null;
  }, localizedFallback.find((e) => e.slug === slug) ?? null);
};
