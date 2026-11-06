// tests/publicFormsAccessibility.test.jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Helper to extract labels (htmlFor, text) and form controls (tag, id, type, aria-hidden)
 * from file contents using regex.
 */
function extractFormAccessibilityData(fileContent) {
  const labelRegex = /<label\b([^>]*)>([\s\S]*?)<\/label>/gi;
  const inputRegex = /<(input|select|textarea)\b([^>]*)\/?>/gi;

  const labels = [];
  let match;
  while ((match = labelRegex.exec(fileContent)) !== null) {
    const attrs = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    const htmlForMatch = attrs.match(/htmlFor=(?:["']([^"']+)["']|\{["']([^"']+)["']\})/);
    const htmlFor = htmlForMatch ? (htmlForMatch[1] || htmlForMatch[2]) : null;
    labels.push({ htmlFor, text, rawAttrs: attrs });
  }

  const controls = [];
  while ((match = inputRegex.exec(fileContent)) !== null) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    const idMatch = attrs.match(/id=(?:["']([^"']+)["']|\{["']([^"']+)["']\})/);
    const id = idMatch ? (idMatch[1] || idMatch[2]) : null;
    const isAriaHidden = /aria-hidden=(?:["']true["']|\{true\})/.test(attrs);
    const isHoneypot = /honeypot/.test(attrs);
    const typeMatch = attrs.match(/type=["']([^"']+)["']/);
    const type = typeMatch ? typeMatch[1] : (tag === 'textarea' ? 'textarea' : (tag === 'select' ? 'select' : 'text'));

    controls.push({ tag, id, type, isAriaHidden, isHoneypot, rawAttrs: attrs });
  }

  return { labels, controls };
}

describe('Public Forms Accessibility (WCAG Label-Input Associations)', () => {
  const formFiles = [
    { name: 'LoginPage.jsx', relPath: 'src/pages/LoginPage.jsx' },
    { name: 'ContactPage.jsx', relPath: 'src/pages/ContactPage.jsx' },
    { name: 'RecruitmentModal.jsx', relPath: 'src/components/RecruitmentModal.jsx' },
    { name: 'EventRegistrationSection.jsx', relPath: 'src/components/events/EventRegistrationSection.jsx' },
    { name: 'ForgotPasswordPage.jsx', relPath: 'src/pages/ForgotPasswordPage.jsx' },
    { name: 'ResetPasswordPage.jsx', relPath: 'src/pages/ResetPasswordPage.jsx' },
    { name: 'BecomeSponsorPage.jsx', relPath: 'src/pages/BecomeSponsorPage.jsx' },
    { name: 'JoinUsPage.jsx', relPath: 'src/pages/JoinUsPage.jsx' },
    { name: 'EventFeedbackSection.jsx', relPath: 'src/components/events/EventFeedbackSection.jsx' },
  ];

  describe('1. Label-Control 1-to-1 Association Audit', () => {
    formFiles.forEach(({ name, relPath }) => {
      it(`verifies every user-facing input in ${name} has a matching htmlFor/id label`, () => {
        const fullPath = path.join(ROOT_DIR, relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { labels, controls } = extractFormAccessibilityData(content);

        // Filter user-facing controls (ignore honeypots or aria-hidden anti-bot fields)
        const userFacingControls = controls.filter((c) => !c.isAriaHidden && !c.isHoneypot);

        expect(userFacingControls.length).toBeGreaterThan(0);

        // Every user-facing control must have an id
        userFacingControls.forEach((control) => {
          expect(
            control.id,
            `Expected ${control.tag} [type="${control.type}"] in ${name} to have an id attribute`
          ).toBeTruthy();

          // And there must be a label with matching htmlFor
          const matchingLabel = labels.find((l) => l.htmlFor === control.id);
          expect(
            matchingLabel,
            `Expected a <label htmlFor="${control.id}"> matching the control in ${name}`
          ).toBeDefined();

          // Ensure the matching label has non-empty text or accessible description
          expect(
            matchingLabel.text.length,
            `Label htmlFor="${control.id}" in ${name} should have meaningful text`
          ).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('2. Specific Form Attributes & Accessible Names', () => {
    it('LoginPage.jsx pairs login-email and login-password with labels', () => {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/LoginPage.jsx'), 'utf-8');
      const { labels, controls } = extractFormAccessibilityData(content);

      const emailControl = controls.find((c) => c.id === 'login-email');
      const passControl = controls.find((c) => c.id === 'login-password');
      expect(emailControl).toBeDefined();
      expect(passControl).toBeDefined();

      const emailLabel = labels.find((l) => l.htmlFor === 'login-email');
      const passLabel = labels.find((l) => l.htmlFor === 'login-password');
      expect(emailLabel).toBeDefined();
      expect(passLabel).toBeDefined();
    });

    it('ContactPage.jsx pairs all 5 contact fields with labels', () => {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/ContactPage.jsx'), 'utf-8');
      const { labels, controls } = extractFormAccessibilityData(content);

      const expectedIds = ['contact-full-name', 'contact-email', 'contact-phone', 'contact-subject', 'contact-message'];
      expectedIds.forEach((id) => {
        expect(controls.find((c) => c.id === id)).toBeDefined();
        const label = labels.find((l) => l.htmlFor === id);
        expect(label).toBeDefined();
        expect(label.text.length).toBeGreaterThan(0);
      });
    });

    it('RecruitmentModal.jsx pairs all 8 form controls including CV upload', () => {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'src/components/RecruitmentModal.jsx'), 'utf-8');
      const { labels, controls } = extractFormAccessibilityData(content);

      const expectedIds = [
        'recruitment-fullName',
        'recruitment-email',
        'recruitment-phone',
        'recruitment-faculty',
        'recruitment-studyYear',
        'recruitment-committee',
        'recruitment-impactGoal',
        'recruitment-cvFile',
      ];
      expectedIds.forEach((id) => {
        expect(controls.find((c) => c.id === id), `Missing control id="${id}"`).toBeDefined();
        expect(labels.find((l) => l.htmlFor === id), `Missing label htmlFor="${id}"`).toBeDefined();
      });
    });

    it('EventRegistrationSection.jsx pairs registration inputs with labels', () => {
      const content = fs.readFileSync(
        path.join(ROOT_DIR, 'src/components/events/EventRegistrationSection.jsx'),
        'utf-8'
      );
      const { labels, controls } = extractFormAccessibilityData(content);

      const expectedIds = ['event-reg-fullName', 'event-reg-email', 'event-reg-phone'];
      expectedIds.forEach((id) => {
        expect(controls.find((c) => c.id === id)).toBeDefined();
        const label = labels.find((l) => l.htmlFor === id);
        expect(label).toBeDefined();
        expect(label.text.length).toBeGreaterThan(0);
      });
    });

    it('ForgotPasswordPage.jsx pairs forgot-email with label', () => {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/ForgotPasswordPage.jsx'), 'utf-8');
      const { labels, controls } = extractFormAccessibilityData(content);

      expect(controls.find((c) => c.id === 'forgot-email')).toBeDefined();
      expect(labels.find((l) => l.htmlFor === 'forgot-email')).toBeDefined();
    });

    it('ResetPasswordPage.jsx pairs reset-password and reset-confirmPassword with labels', () => {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/ResetPasswordPage.jsx'), 'utf-8');
      const { labels, controls } = extractFormAccessibilityData(content);

      expect(controls.find((c) => c.id === 'reset-password')).toBeDefined();
      expect(labels.find((l) => l.htmlFor === 'reset-password')).toBeDefined();
      expect(controls.find((c) => c.id === 'reset-confirmPassword')).toBeDefined();
      expect(labels.find((l) => l.htmlFor === 'reset-confirmPassword')).toBeDefined();
    });

    it('BecomeSponsorPage.jsx pairs all 6 sponsorship fields with labels', () => {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/BecomeSponsorPage.jsx'), 'utf-8');
      const { labels, controls } = extractFormAccessibilityData(content);

      const expectedIds = [
        'sponsor-companyName',
        'sponsor-contactPerson',
        'sponsor-email',
        'sponsor-phone',
        'sponsor-tier',
        'sponsor-message',
      ];
      expectedIds.forEach((id) => {
        expect(controls.find((c) => c.id === id), `Missing control id="${id}"`).toBeDefined();
        expect(labels.find((l) => l.htmlFor === id), `Missing label htmlFor="${id}"`).toBeDefined();
      });
    });

    it('JoinUsPage.jsx pairs all 8 membership application fields with labels', () => {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/JoinUsPage.jsx'), 'utf-8');
      const { labels, controls } = extractFormAccessibilityData(content);

      const expectedIds = [
        'join-fullName',
        'join-email',
        'join-phone',
        'join-faculty',
        'join-studyYear',
        'join-committee',
        'join-impactGoal',
        'join-cvFile',
      ];
      expectedIds.forEach((id) => {
        expect(controls.find((c) => c.id === id), `Missing control id="${id}"`).toBeDefined();
        expect(labels.find((l) => l.htmlFor === id), `Missing label htmlFor="${id}"`).toBeDefined();
      });
    });
  });

  describe('3. Rendered HTML Verification (React DOM Output)', () => {
    it('renders JSX with valid HTML "for" matching input "id"', () => {
      const markup = renderToStaticMarkup(
        <form>
          <label htmlFor="test-input">Test Label</label>
          <input id="test-input" type="text" />
        </form>
      );
      expect(markup).toContain('for="test-input"');
      expect(markup).toContain('id="test-input"');
    });
  });
});

