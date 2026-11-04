// src/lib/formatters.js

const LOCALES = {
  ar: 'ar-EG-u-nu-latn', // Arabic locale with Latin numerals (0-9)
  en: 'en-US',
};

/**
 * Format a date with Cairo timezone and Latin numerals.
 */
export function formatDate(dateInput, lang = 'ar', options = {}) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const defaultOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Cairo',
    ...options,
  };

  const locale = LOCALES[lang] || LOCALES.ar;
  return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
}

/**
 * Format date and time.
 */
export function formatDateTime(dateInput, lang = 'ar') {
  return formatDate(dateInput, lang, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format time range.
 */
export function formatTimeRange(startsAt, endsAt, lang = 'ar') {
  if (!startsAt) return '';
  const startStr = formatDate(startsAt, lang, { hour: '2-digit', minute: '2-digit', hour12: true });
  if (!endsAt) return startStr;
  const endStr = formatDate(endsAt, lang, { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${startStr} - ${endStr}`;
}

/**
 * Format currency in Egyptian Pounds (EGP) with Latin numerals.
 */
export function formatCurrency(amount, lang = 'ar') {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString(LOCALES[lang] || LOCALES.ar, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return lang === 'ar' ? `${formatted} ج.م` : `${formatted} EGP`;
}

/**
 * Format regular number with Latin numerals.
 */
export function formatNumber(num, lang = 'ar', options = {}) {
  const val = Number(num) || 0;
  return val.toLocaleString(LOCALES[lang] || LOCALES.ar, options);
}

/**
 * Relative time helper (e.g. "منذ ساعتين" / "2 hours ago").
 */
export function formatRelativeTime(dateInput, lang = 'ar') {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffInSeconds = Math.round((date.getTime() - now) / 1000);
  const locale = LOCALES[lang] || LOCALES.ar;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const absDiff = Math.abs(diffInSeconds);

  if (absDiff < 60) {
    return rtf.format(diffInSeconds, 'second');
  }
  const diffInMinutes = Math.round(diffInSeconds / 60);
  if (Math.abs(diffInMinutes) < 60) {
    return rtf.format(diffInMinutes, 'minute');
  }
  const diffInHours = Math.round(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) {
    return rtf.format(diffInHours, 'hour');
  }
  const diffInDays = Math.round(diffInHours / 24);
  if (Math.abs(diffInDays) < 30) {
    return rtf.format(diffInDays, 'day');
  }
  const diffInMonths = Math.round(diffInDays / 30);
  if (Math.abs(diffInMonths) < 12) {
    return rtf.format(diffInMonths, 'month');
  }
  const diffInYears = Math.round(diffInDays / 365);
  return rtf.format(diffInYears, 'year');
}

