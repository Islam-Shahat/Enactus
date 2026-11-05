// Maps Supabase rows to the SAME shapes the public pages already consume from
// src/data/enactusData.js, so components do not need to change.
// All functions are pure. `lang` is 'ar' (default) or 'en'; a missing translation
// falls back to the other language so a page is never empty.

const FALLBACK_LANG = { ar: 'en', en: 'ar' };

/** pick(row, 'title', 'en') -> row.title_en ?? row.title_ar */
export function pick(row, field, lang = 'ar') {
  if (!row) return '';
  return row[`${field}_${lang}`] ?? row[`${field}_${FALLBACK_LANG[lang]}`] ?? '';
}

const contentOf = (content, lang) => {
  const primary = content?.[lang] ?? {};
  const other = content?.[FALLBACK_LANG[lang]] ?? {};
  return new Proxy(primary, { get: (t, k) => (t[k] != null && t[k] !== '' && !(Array.isArray(t[k]) && !t[k].length) ? t[k] : other[k]) });
};

const LOCALES = { ar: 'ar-EG-u-nu-latn', en: 'en-GB' };

/** '15 نوفمبر 2026' (ar) / '15 November 2026' (en), always in Cairo time. */
export function formatDate(value, lang = 'ar') {
  if (!value) return '';
  return new Intl.DateTimeFormat(LOCALES[lang] ?? LOCALES.ar, {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo',
  }).format(new Date(value));
}

function formatTimeRange(row, lang) {
  const label = pick(row, 'time_label', lang);
  if (label) return label;
  const startsAt = row.starts_at || row.startsAt;
  if (!startsAt) return '';
  const fmt = new Intl.DateTimeFormat(LOCALES[lang] ?? LOCALES.ar, {
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
  });
  const endsAt = row.ends_at || row.endsAt;
  return endsAt ? `${fmt.format(new Date(startsAt))} - ${fmt.format(new Date(endsAt))}` : fmt.format(new Date(startsAt));
}

// ---------------------------------------------------------------- committees
/** committee row (+ optional head row from team_public) -> committeesData item */
export function committeeFromRow(row, head, lang = 'ar') {
  const c = contentOf(row.content, lang);
  return {
    slug: row.slug,
    code: row.code ?? '',
    name: row.name_en,
    arabicName: row.name_ar,
    mascotDesc: c.mascot ?? '',
    headName: head ? pick(head, 'name', lang) : '',
    headRole: head ? head.position_en ?? head.position_ar ?? '' : '',
    headAvatar: head?.photo_url ?? '',
    brief: c.brief ?? '',
    description: pick(row, 'description', lang),
    duties: c.duties ?? [],
    skillsRequired: c.skillsRequired ?? [],
    skillsGained: c.skillsGained ?? [],
    activeProjects: c.activeProjects ?? [],
    quote: c.quote ?? '',
    color: row.color,
    icon: row.icon,
  };
}

// -------------------------------------------------------------------- events
export function eventFromRow(row, lang = 'ar') {
  if (!row) return null;

  const startsAt = row.starts_at ?? row.startsAt ?? null;
  const endsAt = row.ends_at ?? row.endsAt ?? null;
  const registrationOpen = Boolean(row.registration_open ?? row.registrationOpen);
  const rawStatus = row.status ?? 'published';

  return {
    id: row.id ?? null,
    slug: row.slug ?? '',
    title: pick(row, 'title', lang) || row.title || '',
    englishTitle: row.title_en ?? row.englishTitle ?? '',
    status: rawStatus,
    date: row.date ?? (startsAt ? formatDate(startsAt, lang) : ''),
    time: row.time ?? formatTimeRange(row, lang),
    location: pick(row, 'venue', lang) || row.location || '',
    category: pick(row, 'category', lang) || row.category || '',
    image: row.cover_url ?? row.image ?? '',
    brief: pick(row, 'brief', lang) || row.brief || '',
    description: pick(row, 'description', lang) || row.description || '',
    schedule: Array.isArray(row.schedule)
      ? row.schedule.map((s) => ({
          time: pick(s, 'time', lang) || s.time || '',
          activity: pick(s, 'activity', lang) || s.activity || '',
        }))
      : [],
    partnersInvolved: row.partner_names ?? row.partnersInvolved ?? [],
    startsAt,
    endsAt,
    registrationOpen,
    // snake_case aliases for seamless compatibility
    starts_at: startsAt,
    ends_at: endsAt,
    registration_open: registrationOpen,
  };
}

// ---------------------------------------------------------------------- news
export function newsFromRow(row, lang = 'ar') {
  return {
    slug: row.slug,
    title: pick(row, 'title', lang),
    date: formatDate(row.published_at, lang),
    category: pick(row, 'category', lang),
    image: row.cover_url ?? '',
    excerpt: pick(row, 'excerpt', lang),
    content: pick(row, 'body', lang),
  };
}

// ------------------------------------------------------------ team / alumni
export function boardMemberFromRow(row, lang = 'ar') {
  return {
    name: pick(row, 'name', lang),
    role: row.position_ar ?? row.position_en ?? '',
    englishRole: row.position_en ?? '',
    faculty: pick(row, 'faculty', lang),
    image: row.photo_url ?? '',
    bio: pick(row, 'bio', lang),
    linkedin: row.links?.linkedin ?? '',
    facebook: row.links?.facebook ?? '',
  };
}

export function alumniFromRow(row, lang = 'ar') {
  return {
    name: pick(row, 'name', lang),
    formerRole: pick(row, 'position', lang),
    currentPosition: pick(row, 'current_position', lang),
    image: row.photo_url ?? '',
    quote: pick(row, 'quote', lang),
  };
}

// ----------------------------------------------------------------------- faq
export const faqFromRow = (row, lang = 'ar') => ({ q: pick(row, 'question', lang), a: pick(row, 'answer', lang) });

// ------------------------------------------------------- sponsorship tiers
export function tierFromRow(row, lang = 'ar') {
  return {
    name: pick(row, 'name', lang),
    englishName: row.name_en ?? '',
    price: pick(row, 'tagline', lang),
    badge: pick(row, 'badge', lang),
    featured: Boolean(row.is_featured),
    perks: row[`benefits_${lang}`]?.length ? row[`benefits_${lang}`] : row[`benefits_${FALLBACK_LANG[lang]}`] ?? [],
  };
}

// ------------------------------------------------------ partners / stats
export const partnerFromRow = (row, lang = 'ar') => ({
  id: row.id,
  name: pick(row, 'name', lang),
  kind: row.kind,
  tier: row.tier,
  logo: row.logo_url ?? '',
  cover: row.cover_url ?? '',
  website: row.website ?? '',
  description: pick(row, 'description', lang),
  announcedAt: row.announced_at ?? null,
});

export const statFromRow = (row, lang = 'ar') => ({
  key: row.key,
  value: Number(row.value),
  suffix: row.suffix ?? '',
  label: pick(row, 'label', lang),
});
