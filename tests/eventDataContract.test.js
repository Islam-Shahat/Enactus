// tests/eventDataContract.test.js
import { describe, it, expect } from 'vitest';
import { eventFromRow } from '../src/services/adapters';
import { sortEvents } from '../src/services/events';

describe('Event Data Contract: adapters, EventRegistrationSection & EventDetailsPage', () => {
  const futureIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const pastIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const mockDbRow = {
    id: 'e1111111-2222-3333-4444-555555555555',
    slug: 'annual-summit-2026',
    title_ar: 'القمة السنوية للابتكار 2026',
    title_en: 'Annual Innovation Summit 2026',
    status: 'published',
    starts_at: futureIso,
    ends_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    registration_open: true,
    capacity: 250,
    cover_url: 'https://cdn.example.com/events/summit.jpg',
    venue_ar: 'قاعة المؤتمرات الكبرى',
    venue_en: 'Grand Conference Hall',
    category_ar: 'مؤتمرات رسمية',
    category_en: 'Official Conferences',
    brief_ar: 'نبذة عن القمة',
    brief_en: 'Summit brief',
    description_ar: 'الوصف الكامل للقمة السنوية',
    description_en: 'Full description of the annual summit',
    partner_names: ['VERANDA', 'YAFFA'],
    schedule: [
      { time_ar: '10:00 ص', time_en: '10:00 AM', activity_ar: 'الافتتاح', activity_en: 'Opening' },
    ],
  };

  describe('1. eventFromRow Normalization Contract', () => {
    it('preserves id, slug, raw status, and camelCase + snake_case aliases', () => {
      const event = eventFromRow(mockDbRow, 'ar');

      // Identifier and routing
      expect(event.id).toBe(mockDbRow.id);
      expect(event.slug).toBe(mockDbRow.slug);

      // Raw database status preserved (not collapsed to 'past' or 'upcoming')
      expect(event.status).toBe('published');

      // Registration flags (both camelCase and snake_case alias)
      expect(event.registrationOpen).toBe(true);
      expect(event.registration_open).toBe(true);

      // Timestamps (both camelCase and snake_case alias)
      expect(event.startsAt).toBe(mockDbRow.starts_at);
      expect(event.starts_at).toBe(mockDbRow.starts_at);
      expect(event.endsAt).toBe(mockDbRow.ends_at);
      expect(event.ends_at).toBe(mockDbRow.ends_at);

      // Localized fields
      expect(event.title).toBe(mockDbRow.title_ar);
      expect(event.englishTitle).toBe(mockDbRow.title_en);
      expect(event.location).toBe(mockDbRow.venue_ar);
      expect(event.category).toBe(mockDbRow.category_ar);
      expect(event.image).toBe(mockDbRow.cover_url);
      expect(event.brief).toBe(mockDbRow.brief_ar);
      expect(event.description).toBe(mockDbRow.description_ar);
      expect(event.partnersInvolved).toEqual(['VERANDA', 'YAFFA']);
    });

    it('preserves status completed without mangling to past', () => {
      const completedRow = { ...mockDbRow, status: 'completed' };
      const event = eventFromRow(completedRow, 'ar');
      expect(event.status).toBe('completed');
    });

    it('preserves status cancelled without mangling to past', () => {
      const cancelledRow = { ...mockDbRow, status: 'cancelled' };
      const event = eventFromRow(cancelledRow, 'ar');
      expect(event.status).toBe('cancelled');
    });

    it('localizes fields into English when requested', () => {
      const event = eventFromRow(mockDbRow, 'en');
      expect(event.title).toBe(mockDbRow.title_en);
      expect(event.location).toBe(mockDbRow.venue_en);
      expect(event.category).toBe(mockDbRow.category_en);
      expect(event.brief).toBe(mockDbRow.brief_en);
      expect(event.description).toBe(mockDbRow.description_en);
    });

    it('returns null for falsy row inputs', () => {
      expect(eventFromRow(null)).toBeNull();
      expect(eventFromRow(undefined)).toBeNull();
    });
  });

  describe('2. Event Registration Section Eligibility Logic', () => {
    // Pure model of the eligibility evaluation from EventRegistrationSection.jsx
    function computeIsRegistrationOpen(event, now = new Date()) {
      const endsAt = event?.endsAt || event?.ends_at;
      const isConcluded = endsAt ? new Date(endsAt) < now : false;
      return (
        Boolean(event?.registrationOpen ?? event?.registration_open) &&
        !isConcluded &&
        event?.status !== 'completed' &&
        event?.status !== 'cancelled' &&
        event?.status !== 'past'
      );
    }

    it('allows registration for an open future published event', () => {
      const event = eventFromRow(mockDbRow, 'ar');
      const isOpen = computeIsRegistrationOpen(event);

      expect(isOpen).toBe(true);
      expect(event.id).toBe(mockDbRow.id); // Valid UUID available for submit payload
    });

    it('allows registration when event uses camelCase registrationOpen or snake_case registration_open', () => {
      const camelCaseEvent = {
        id: '123',
        status: 'published',
        registrationOpen: true,
        endsAt: futureIso,
      };
      const snakeCaseEvent = {
        id: '123',
        status: 'published',
        registration_open: true,
        ends_at: futureIso,
      };

      expect(computeIsRegistrationOpen(camelCaseEvent)).toBe(true);
      expect(computeIsRegistrationOpen(snakeCaseEvent)).toBe(true);
    });

    it('rejects registration when registrationOpen is false', () => {
      const closedEvent = eventFromRow({ ...mockDbRow, registration_open: false }, 'ar');
      expect(computeIsRegistrationOpen(closedEvent)).toBe(false);
    });

    it('rejects registration when event has concluded (ends_at is in past)', () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      const concludedEvent = eventFromRow(
        { ...mockDbRow, starts_at: pastIso, ends_at: pastDate, registration_open: true },
        'ar'
      );
      expect(computeIsRegistrationOpen(concludedEvent)).toBe(false);
    });

    it('rejects registration when status is completed', () => {
      const completedEvent = eventFromRow(
        { ...mockDbRow, status: 'completed', registration_open: true },
        'ar'
      );
      expect(computeIsRegistrationOpen(completedEvent)).toBe(false);
    });

    it('rejects registration when status is cancelled', () => {
      const cancelledEvent = eventFromRow(
        { ...mockDbRow, status: 'cancelled', registration_open: true },
        'ar'
      );
      expect(computeIsRegistrationOpen(cancelledEvent)).toBe(false);
    });
  });

  describe('3. EventDetailsPage Display Conditions', () => {
    // Pure model of visibility gates from EventDetailsPage.jsx
    function computeDetailsSections(event) {
      const showRegistration = event.status !== 'cancelled' && event.status !== 'draft';
      const showFeedback = event.status === 'completed' || event.status === 'past';
      const isUpcomingBadge =
        event.status === 'published' || event.status === 'upcoming' || event.status === 'ongoing';

      return { showRegistration, showFeedback, isUpcomingBadge };
    }

    it('open future event shows registration section and does NOT show feedback section', () => {
      const futureEvent = eventFromRow(mockDbRow, 'ar');
      const sections = computeDetailsSections(futureEvent);

      expect(sections.showRegistration).toBe(true);
      expect(sections.showFeedback).toBe(false);
      expect(sections.isUpcomingBadge).toBe(true);
    });

    it('completed event shows feedback section correctly', () => {
      const completedEvent = eventFromRow({ ...mockDbRow, status: 'completed' }, 'ar');
      const sections = computeDetailsSections(completedEvent);

      expect(sections.showFeedback).toBe(true);
      expect(sections.showRegistration).toBe(true); // Section rendered in closed state
      expect(sections.isUpcomingBadge).toBe(false);
    });

    it('past mock event shows feedback section correctly', () => {
      const pastMockEvent = {
        slug: 'dendera-fair',
        status: 'past',
        registrationOpen: false,
      };
      const sections = computeDetailsSections(pastMockEvent);

      expect(sections.showFeedback).toBe(true);
      expect(sections.isUpcomingBadge).toBe(false);
    });

    it('cancelled event hides registration section and hides feedback section', () => {
      const cancelledEvent = eventFromRow({ ...mockDbRow, status: 'cancelled' }, 'ar');
      const sections = computeDetailsSections(cancelledEvent);

      expect(sections.showRegistration).toBe(false);
      expect(sections.showFeedback).toBe(false);
      expect(sections.isUpcomingBadge).toBe(false);
    });

    it('draft event hides registration section and hides feedback section', () => {
      const draftEvent = eventFromRow({ ...mockDbRow, status: 'draft' }, 'ar');
      const sections = computeDetailsSections(draftEvent);

      expect(sections.showRegistration).toBe(false);
      expect(sections.showFeedback).toBe(false);
    });
  });

  describe('4. sortEvents with Normalized Statuses', () => {
    it('sorts published, ongoing, and upcoming events before completed and past events', () => {
      const event1 = {
        slug: 'ev-1',
        status: 'completed',
        startsAt: new Date('2026-09-01T10:00:00Z').toISOString(),
      };
      const event2 = {
        slug: 'ev-2',
        status: 'published',
        startsAt: new Date('2026-11-20T10:00:00Z').toISOString(),
      };
      const event3 = {
        slug: 'ev-3',
        status: 'upcoming',
        startsAt: new Date('2026-11-10T10:00:00Z').toISOString(),
      };
      const event4 = {
        slug: 'ev-4',
        status: 'ongoing',
        startsAt: new Date('2026-11-05T10:00:00Z').toISOString(),
      };

      const sorted = sortEvents([event1, event2, event3, event4]);

      // Upcoming/active events come first (sorted soonest first: ev-4, ev-3, ev-2)
      expect(sorted[0].slug).toBe('ev-4');
      expect(sorted[1].slug).toBe('ev-3');
      expect(sorted[2].slug).toBe('ev-2');

      // Completed/past events come last
      expect(sorted[3].slug).toBe('ev-1');
    });
  });
});

