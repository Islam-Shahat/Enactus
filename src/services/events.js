import { supabase } from '../lib/supabase';
import { unwrap, withFallback } from './helpers';
import { eventFromRow } from './adapters';
import { localizeEventsMock } from './mockLocalization';

// Upcoming events first (soonest first), then past events (most recent first).
export function sortEvents(events) {
  const upcoming = events.filter((e) => e.status === 'upcoming').sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const past = events.filter((e) => e.status !== 'upcoming').sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));
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
