import { supabase } from '../lib/supabase';
import { unwrap, withFallback } from './helpers';

export const listStats = (mock = []) =>
  withFallback(
    async () => unwrap(await supabase.from('site_stats').select('*').order('sort_order')),
    mock,
  );

export const listPartners = (mock = []) =>
  withFallback(
    async () => unwrap(await supabase.from('partners').select('*').order('sort_order')),
    mock,
  );

export const listTeam = (mock = []) =>
  withFallback(
    async () => unwrap(await supabase.from('team_public').select('*').order('sort_order')),
    mock,
  );

export const listCommittees = (mock = []) =>
  withFallback(
    async () => unwrap(await supabase.from('committees').select('*').order('sort_order')),
    mock,
  );

export const listNews = (mock = []) =>
  withFallback(
    async () => unwrap(await supabase.from('news_posts').select('*').order('published_at', { ascending: false })),
    mock,
  );

export const listGallery = (mock = []) =>
  withFallback(
    async () => unwrap(await supabase.from('gallery_items').select('*').order('sort_order')),
    mock,
  );

/** Is the Join Us form open? Controlled by HR from the dashboard (settings.applications_open). */
export async function getApplicationsOpen(fallback = true) {
  return withFallback(async () => {
    const row = unwrap(await supabase.from('settings').select('value').eq('key', 'applications_open').maybeSingle());
    return row ? row.value === true : fallback;
  }, fallback);
}
