// tests/markdownEditorSecurity.test.jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import {
  isSafeUrl,
  safeParseInline,
  renderMarkdown,
} from '../src/components/dashboard/cms/MarkdownEditor.jsx';

/**
 * Recursively inspects a React element tree to verify no element has dangerouslySetInnerHTML
 * or dangerous tag types (like <script>).
 */
function inspectElementTree(node, callback) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((child) => inspectElementTree(child, callback));
    return;
  }
  if (React.isValidElement(node)) {
    callback(node);
    if (node.props?.children) {
      inspectElementTree(node.props.children, callback);
    }
  }
}

describe('MarkdownEditor Security & XSS Prevention', () => {
  describe('1. URL Validation (isSafeUrl)', () => {
    it('accepts valid safe URLs and protocols', () => {
      expect(isSafeUrl('https://enactus-qena.org')).toBe(true);
      expect(isSafeUrl('http://localhost:5173/about')).toBe(true);
      expect(isSafeUrl('/dashboard/site-cms')).toBe(true);
      expect(isSafeUrl('#section-agenda')).toBe(true);
      expect(isSafeUrl('mailto:info@enactus-qena.org')).toBe(true);
      expect(isSafeUrl('tel:+201000000000')).toBe(true);
    });

    it('rejects javascript: URLs in various casing and spacing', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert(document.cookie)')).toBe(false);
      expect(isSafeUrl('  javascript:void(0)')).toBe(false);
      expect(isSafeUrl('javascript:/*--></title></style></script></xmp><svg/onload=alert(1)>')).toBe(false);
    });

    it('rejects data: and vbscript: URIs', () => {
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
    });

    it('rejects attribute injection attempts with quotes or whitespace', () => {
      expect(isSafeUrl('https://example.com" onmouseover="alert(1)')).toBe(false);
      expect(isSafeUrl("https://example.com' onclick='alert(1)")).toBe(false);
      expect(isSafeUrl('https://example.com<script>')).toBe(false);
    });

    it('rejects empty or non-string inputs', () => {
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl('   ')).toBe(false);
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
    });
  });

  describe('2. Inline Parsing Security (safeParseInline)', () => {
    it('treats raw script tags strictly as text without executing or creating <script> elements', () => {
      const input = 'Check this: <script>alert("XSS")</script>';
      const parsed = safeParseInline(input);

      // Verify no dangerouslySetInnerHTML exists anywhere
      inspectElementTree(parsed, (el) => {
        expect(el.props?.dangerouslySetInnerHTML).toBeUndefined();
        expect(el.type).not.toBe('script');
      });

      // The string is preserved safely as text
      const renderedText = JSON.stringify(parsed);
      expect(renderedText).toContain('<script>alert(\\"XSS\\")</script>');
    });

    it('treats event-handler attributes (onerror, onload, onclick) strictly as text', () => {
      const input = 'Image test: <img src="x" onerror="alert(1)" onload="alert(2)" />';
      const parsed = safeParseInline(input);

      inspectElementTree(parsed, (el) => {
        expect(el.props?.dangerouslySetInnerHTML).toBeUndefined();
        expect(el.type).not.toBe('img');
        expect(el.props?.onError).toBeUndefined();
        expect(el.props?.onLoad).toBeUndefined();
      });

      const renderedText = JSON.stringify(parsed);
      expect(renderedText).toContain('onerror=');
    });

    it('disallows javascript: links and renders them as safe text', () => {
      const input = '[Click for prize](javascript:alert(document.domain))';
      const parsed = safeParseInline(input);

      inspectElementTree(parsed, (el) => {
        expect(el.props?.dangerouslySetInnerHTML).toBeUndefined();
        if (el.type === 'a') {
          expect(el.props.href).not.toMatch(/^javascript:/i);
        }
      });

      // It should render as a safe span or text rather than an anchor with a javascript URL
      const elements = Array.isArray(parsed) ? parsed : [parsed];
      const hasAnchor = elements.some((el) => React.isValidElement(el) && el.type === 'a');
      expect(hasAnchor).toBe(false);
    });

    it('renders valid https: markdown links with target="_blank" and rel="noopener noreferrer"', () => {
      const input = 'Visit our [official website](https://enactus-qena.org) today';
      const parsed = safeParseInline(input);

      const elements = Array.isArray(parsed) ? parsed : [parsed];
      const anchor = elements.find((el) => React.isValidElement(el) && el.type === 'a');

      expect(anchor).toBeDefined();
      expect(anchor.props.href).toBe('https://enactus-qena.org');
      expect(anchor.props.target).toBe('_blank');
      expect(anchor.props.rel).toBe('noopener noreferrer');
    });

    it('renders valid bold, italic, and inline code formatting correctly', () => {
      const input = 'This is **bold**, *italic*, and `code snippet`';
      const parsed = safeParseInline(input);

      const elements = Array.isArray(parsed) ? parsed : [parsed];
      const strong = elements.find((el) => React.isValidElement(el) && el.type === 'strong');
      const em = elements.find((el) => React.isValidElement(el) && el.type === 'em');
      const code = elements.find((el) => React.isValidElement(el) && el.type === 'code');

      expect(strong).toBeDefined();
      expect(strong.props.children).toBe('bold');

      expect(em).toBeDefined();
      expect(em.props.children).toBe('italic');

      expect(code).toBeDefined();
      expect(code.props.children).toBe('code snippet');
    });
  });

  describe('3. Block Markdown Rendering Security (renderMarkdown)', () => {
    it('renders headings, quotes, and lists with zero dangerouslySetInnerHTML usage', () => {
      const markdown = `
# Main Title
## Subheading
### Small Heading
> A quote from leadership
- Item one
- Item two with **bold**
* Item three
Paragraph text with [Link](https://example.com)
      `.trim();

      const elements = renderMarkdown(markdown);
      expect(Array.isArray(elements)).toBe(true);

      inspectElementTree(elements, (el) => {
        expect(el.props?.dangerouslySetInnerHTML).toBeUndefined();
      });

      const types = elements.filter(React.isValidElement).map((el) => el.type);
      expect(types).toContain('h1');
      expect(types).toContain('h2');
      expect(types).toContain('h3');
      expect(types).toContain('blockquote');
      expect(types).toContain('ul');
      expect(types).toContain('p');
    });

    it('sanitizes script tags and event handlers embedded inside headings and blockquotes', () => {
      const maliciousMarkdown = `
# Title <script>alert(1)</script>
> Quote <svg onload=alert(2)>
- List item <body onload=alert(3)>
[Malicious Link](javascript:alert(4))
      `.trim();

      const elements = renderMarkdown(maliciousMarkdown);

      inspectElementTree(elements, (el) => {
        expect(el.props?.dangerouslySetInnerHTML).toBeUndefined();
        expect(el.type).not.toBe('script');
        expect(el.type).not.toBe('svg');
        expect(el.type).not.toBe('body');
        if (el.type === 'a') {
          expect(el.props.href).not.toMatch(/^javascript:/i);
        }
      });
    });

    it('returns empty placeholder paragraph when markdown is empty', () => {
      const emptyResult = renderMarkdown('');
      expect(React.isValidElement(emptyResult)).toBe(true);
      expect(emptyResult.type).toBe('p');
    });
  });
});

