import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SEO & Search Engine Discoverability Audit', () => {
  const rootDir = path.resolve(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');

  it('verifies robots.txt exists and protects private routes while allowing public crawling', () => {
    const robotsPath = path.join(publicDir, 'robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);

    const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
    expect(robotsContent).toContain('User-agent: *');
    expect(robotsContent).toContain('Allow: /');
    expect(robotsContent).toContain('Disallow: /dashboard');
    expect(robotsContent).toContain('Disallow: /reset-password');
    expect(robotsContent).toContain('Sitemap: https://enactus-qena.org/sitemap.xml');
  });

  it('verifies sitemap.xml exists, is valid XML, and covers core public routes with hreflang', () => {
    const sitemapPath = path.join(publicDir, 'sitemap.xml');
    expect(fs.existsSync(sitemapPath)).toBe(true);

    const sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset');
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');

    const expectedRoutes = [
      'https://enactus-qena.org/',
      'https://enactus-qena.org/about',
      'https://enactus-qena.org/committees',
      'https://enactus-qena.org/team',
      'https://enactus-qena.org/events',
      'https://enactus-qena.org/news',
      'https://enactus-qena.org/impact',
      'https://enactus-qena.org/join',
      'https://enactus-qena.org/partners',
      'https://enactus-qena.org/sponsor',
      'https://enactus-qena.org/gallery',
      'https://enactus-qena.org/faq',
      'https://enactus-qena.org/alumni',
      'https://enactus-qena.org/contact',
      'https://enactus-qena.org/terms',
    ];

    for (const route of expectedRoutes) {
      expect(sitemap).toContain(`<loc>${route}</loc>`);
    }

    expect(sitemap).toContain('hreflang="ar"');
    expect(sitemap).toContain('hreflang="en"');
  });

  it('verifies site.webmanifest exists and contains valid PWA/browser metadata', () => {
    const manifestPath = path.join(publicDir, 'site.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifestContent.name).toContain('Enactus Qena');
    expect(manifestContent.short_name).toBe('Enactus Qena');
    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.start_url).toBe('/');
    expect(manifestContent.theme_color).toBe('#ffb800');
    expect(Array.isArray(manifestContent.icons)).toBe(true);
    expect(manifestContent.icons.length).toBeGreaterThan(0);
  });

  it('verifies index.html has comprehensive meta tags, canonical fallback, and Schema.org JSON-LD', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    // Title and Description
    expect(indexHtml).toContain('<title>');
    expect(indexHtml).toContain('Enactus Qena');
    expect(indexHtml).toContain('name="description"');
    expect(indexHtml).toContain('name="keywords"');
    expect(indexHtml).toContain('name="robots"');

    // Canonical & Manifest
    expect(indexHtml).toContain('rel="canonical"');
    expect(indexHtml).toContain('rel="manifest" href="/site.webmanifest"');
    expect(indexHtml).toContain('rel="apple-touch-icon"');

    // OpenGraph & Twitter
    expect(indexHtml).toContain('property="og:site_name"');
    expect(indexHtml).toContain('property="og:image"');
    expect(indexHtml).toContain('name="twitter:card"');

    // Schema.org Structured Data
    expect(indexHtml).toContain('type="application/ld+json"');
    expect(indexHtml).toContain('"@type": "EducationalOrganization"');
    expect(indexHtml).toContain('"@type": "WebSite"');
  });
});

