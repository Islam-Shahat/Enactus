import { supabase } from '../lib/supabase';
import { unwrap, withFallback } from './helpers';
import {
  alumniFromRow, boardMemberFromRow, committeeFromRow, faqFromRow, newsFromRow,
  partnerFromRow, statFromRow, tierFromRow,
} from './adapters';
import { localizeNewsMock, localizeBoardMock } from './mockLocalization';

// Every function returns data in the SAME shape as src/data/enactusData.js.
// Pass the old mock array as the first argument; it is used as a fallback.

const table = (name) => supabase.from(name);

// ---------------------------------------------------------------- committees
async function fetchCommittees(lang) {
  const [rows, heads] = await Promise.all([
    table('committees').select('*').order('sort_order').then(unwrap),
    table('team_public').select('*').eq('kind', 'head').order('sort_order').then(unwrap),
  ]);
  const headByCommittee = new Map(heads.map((h) => [h.committee_id, h]));
  return rows.map((row) => committeeFromRow(row, headByCommittee.get(row.id), lang));
}
export const listCommittees = (mock = [], lang = 'ar') => withFallback(() => fetchCommittees(lang), mock);
export const getCommittee = (slug, mock = [], lang = 'ar') =>
  withFallback(async () => (await fetchCommittees(lang)).find((c) => c.slug === slug) ?? null, mock.find((c) => c.slug === slug) ?? null);

// ---------------------------------------------------------------------- team
export const listBoard = (mock = [], lang = 'ar') => {
  const fallback = localizeBoardMock(mock, lang);
  return withFallback(
    async () => (await table('team_public').select('*').eq('kind', 'board').order('sort_order').then(unwrap)).map((r) => boardMemberFromRow(r, lang)),
    fallback,
  );
};
export const listAlumni = (mock = [], lang = 'ar') =>
  withFallback(
    async () => (await table('team_public').select('*').eq('kind', 'alumni').order('sort_order').then(unwrap)).map((r) => alumniFromRow(r, lang)),
    mock,
  );

// ------------------------------------------------------------------ faq / tiers
export const listFaqs = (mock = [], lang = 'ar') =>
  withFallback(async () => (await table('faqs').select('*').order('sort_order').then(unwrap)).map((r) => faqFromRow(r, lang)), mock);

export const listSponsorshipTiers = (mock = [], lang = 'ar') =>
  withFallback(
    async () => (await table('sponsorship_packages').select('*').order('sort_order').then(unwrap)).map((r) => tierFromRow(r, lang)),
    mock,
  );

// ---------------------------------------------------------------------- news
export const listNews = (mock = [], lang = 'ar') => {
  const fallback = localizeNewsMock(mock, lang);
  return withFallback(
    async () => (await table('news_posts').select('*').order('published_at', { ascending: false }).then(unwrap)).map((r) => newsFromRow(r, lang)),
    fallback,
  );
};

export const getNewsArticle = (slug, mock = [], lang = 'ar') => {
  const fallback = localizeNewsMock(mock, lang);
  return withFallback(async () => {
    const row = await table('news_posts').select('*').eq('slug', slug).maybeSingle().then(unwrap);
    return row ? newsFromRow(row, lang) : null;
  }, fallback.find((a) => a.slug === slug) ?? null);
};

// ------------------------------------------------- partners / stats / gallery
export const listPartners = (mock = [], lang = 'ar') =>
  withFallback(async () => (await table('partners').select('*').order('sort_order').then(unwrap)).map((r) => partnerFromRow(r, lang)), mock);
export const listStats = (mock = [], lang = 'ar') =>
  withFallback(async () => (await table('site_stats').select('*').order('sort_order').then(unwrap)).map((r) => statFromRow(r, lang)), mock);
export const listGallery = (mock = []) =>
  withFallback(async () => table('gallery_items').select('*').order('sort_order').then(unwrap), mock);

/** Is the Join Us form open? Controlled by HR from the dashboard (settings.applications_open). */
export const getApplicationsOpen = (fallback = true) =>
  withFallback(async () => {
    const row = await table('settings').select('value').eq('key', 'applications_open').maybeSingle().then(unwrap);
    return row ? (row.value === true || row.value === 'true') : fallback;
  }, fallback);
