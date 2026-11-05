// src/lib/eventHelpers.js
// Pure business logic and status configurations for events, tickets, volunteers, and capacity.

export const EVENT_STATUSES = [
  { key: 'draft', label: { ar: 'مسودة', en: 'Draft' }, color: 'rgba(156, 163, 175, 0.2)', text: '#9ca3af' },
  { key: 'published', label: { ar: 'منشور', en: 'Published' }, color: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
  { key: 'ongoing', label: { ar: 'جارية الآن', en: 'In Progress' }, color: 'rgba(234, 179, 8, 0.2)', text: '#facc15' },
  { key: 'completed', label: { ar: 'منتهية', en: 'Completed' }, color: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' },
  { key: 'cancelled', label: { ar: 'ملغاة', en: 'Cancelled' }, color: 'rgba(239, 68, 68, 0.2)', text: '#f87171' },
];

export const REGISTRATION_STATUSES = [
  { key: 'registered', label: { ar: 'مسجل ومؤكد', en: 'Registered' }, color: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
  { key: 'waitlist', label: { ar: 'قائمة الانتظار', en: 'Waitlist' }, color: 'rgba(234, 179, 8, 0.2)', text: '#facc15' },
  { key: 'attended', label: { ar: 'حضر الفعالية', en: 'Attended' }, color: 'rgba(147, 51, 234, 0.2)', text: '#c084fc' },
  { key: 'cancelled', label: { ar: 'ملغي', en: 'Cancelled' }, color: 'rgba(239, 68, 68, 0.2)', text: '#f87171' },
];

export const VOLUNTEER_STATUSES = [
  { key: 'requested', label: { ar: 'طلب انضمام', en: 'Requested' }, color: 'rgba(234, 179, 8, 0.2)', text: '#facc15' },
  { key: 'confirmed', label: { ar: 'مقبول رسمياً', en: 'Confirmed' }, color: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
  { key: 'declined', label: { ar: 'معتذر', en: 'Declined' }, color: 'rgba(239, 68, 68, 0.2)', text: '#f87171' },
];

/**
 * Computes event capacity details.
 */
export function calculateEventCapacity(capacity, registeredCount = 0) {
  const reg = Math.max(0, parseInt(registeredCount, 10) || 0);
  if (!capacity || capacity <= 0) {
    return {
      capacity: null,
      registeredCount: reg,
      remaining: null,
      isFull: false,
      percentage: 0,
    };
  }

  const cap = parseInt(capacity, 10);
  const remaining = Math.max(0, cap - reg);
  const percentage = Math.min(100, Math.round((reg / cap) * 100));

  return {
    capacity: cap,
    registeredCount: reg,
    remaining,
    isFull: reg >= cap,
    percentage,
  };
}

/**
 * Calculates average rating and distribution from feedback list.
 */
export function calculateAverageRating(feedbackList = []) {
  if (!feedbackList || feedbackList.length === 0) {
    return { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }

  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  feedbackList.forEach((fb) => {
    const r = Math.min(5, Math.max(1, parseInt(fb.rating, 10) || 5));
    dist[r] = (dist[r] || 0) + 1;
    sum += r;
  });

  const avg = Math.round((sum / feedbackList.length) * 10) / 10;

  return {
    average: avg,
    count: feedbackList.length,
    distribution: dist,
  };
}

/**
 * Generates URL-friendly slug from title.
 */
export function generateEventSlug(title = '') {
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, '-')
    .replace(/[^\u0621-\u064Aa-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '') || `event-${Date.now()}`;
}

/**
 * Formats bilingual schedule times and dates.
 */
export function formatEventDateTime(startsAt, endsAt, lang = 'ar') {
  if (!startsAt) return '';
  const isAr = lang === 'ar';
  const startObj = new Date(startsAt);
  const dateStr = startObj.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = startObj.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!endsAt) return `${dateStr} • ${timeStr}`;

  const endObj = new Date(endsAt);
  const endTimeStr = endObj.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateStr} • ${timeStr} - ${endTimeStr}`;
}

/**
 * Normalizes user or scanner input to a canonical ticket code.
 * Handles full URLs (e.g. /ticket/ENQ-1234567890), query strings, and whitespace.
 */
export function normalizeTicketCode(input = '') {
  if (typeof input !== 'string') return '';
  let clean = input.trim();
  if (clean.includes('/ticket/')) {
    const parts = clean.split('/ticket/');
    clean = parts[parts.length - 1].split('?')[0].split('#')[0];
  }
  return clean.toUpperCase().trim();
}

/**
 * Validates whether a string matches supported ticket code formats.
 * Accepts legacy 6-hex (ENQ-A1B2C3), modern 10-hex (ENQ-A1B2C3D4E5), or standard alphanumeric tickets.
 */
export function isValidTicketCode(code = '') {
  const normalized = normalizeTicketCode(code);
  return /^ENQ-[0-9A-Z]{6,16}$/.test(normalized);
}


