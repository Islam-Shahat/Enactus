// src/lib/sentry.js
import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [],
    // Low trace sample rate in production for performance
    tracesSampleRate: 0.1,
    // Strict privacy filter: strip any personal data, auth tokens, or passwords
    beforeSend(event) {
      if (!event) return null;

      // 1. Strip user identity
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }

      // 2. Strip sensitive request headers
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.authorization;
        delete event.request.headers.apikey;
        delete event.request.headers['x-api-key'];
      }

      // 3. Redact secret-looking strings from breadcrumbs and messages
      const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str
          .replace(/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[REDACTED_JWT]')
          .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
          .replace(/(01[0125][0-9]{8})/g, '[REDACTED_PHONE]');
      };

      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => {
          if (b.message) b.message = sanitizeString(b.message);
          return b;
        });
      }

      if (event.message) {
        event.message = sanitizeString(event.message);
      }

      return event;
    },
  });
}

export { Sentry };

