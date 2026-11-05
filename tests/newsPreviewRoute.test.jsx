// tests/newsPreviewRoute.test.jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AuthProvider } from '../src/context/AuthContext';
import App from '../src/App.jsx';
import { getPreviewUrl } from '../src/lib/cmsHelpers';
import { newsArticles } from '../src/data/enactusData';

function renderAppAtUrl(initialUrl) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return renderToStaticMarkup(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialUrl]}>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('CMS News Preview on Site Route', () => {
  it('generates the expected preview url from getPreviewUrl', () => {
    const item = { slug: 'partnership-arab-union-announced' };
    const previewUrl = getPreviewUrl('news', item);
    expect(previewUrl).toBe('/news/partnership-arab-union-announced');
  });

  it('resolves /news/:slug to NewsPage with the intended article and NOT the 404 page', () => {
    const article = newsArticles[0]; // 'partnership-arab-union-announced'
    const previewUrl = getPreviewUrl('news', article);

    const html = renderAppAtUrl(previewUrl);

    // Verify it did NOT render the 404 error page
    expect(html).not.toMatch(/<h1[^>]*>404<\/h1>/);
    expect(html).not.toContain('Page Not Found');
    expect(html).not.toContain('الصفحة غير موجودة');

    // Verify it rendered the intended article title and content in the reader modal
    expect(html).toContain(article.title);
    expect(html).toContain(article.category);
    expect(html).toContain('NEWSROOM &amp; PRESS RELEASES');
  });

  it('resolves a second news article preview url without 404', () => {
    const article = newsArticles[1]; // 'sponsors-cohort-2026-revealed'
    const previewUrl = getPreviewUrl('news', article);

    const html = renderAppAtUrl(previewUrl);

    expect(html).not.toMatch(/<h1[^>]*>404<\/h1>/);
    expect(html).not.toContain('Page Not Found');
    expect(html).not.toContain('الصفحة غير موجودة');
    expect(html).toContain(article.title);
  });

  it('still renders 404 Page Not Found for an unmatched random route', () => {
    const html = renderAppAtUrl('/non-existent-arbitrary-page-xyz');
    expect(html).toMatch(/<h1[^>]*>404<\/h1>/);
    expect(html).toContain('الصفحة غير موجودة');
  });
});
