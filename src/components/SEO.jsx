import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../context/LanguageContext';

export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords,
  noindex = false,
  schema,
  publishedTime,
  modifiedTime,
  author = 'Enactus Qena',
}) {
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const siteTitle = isAr ? 'إيناكتوس قنا | Enactus Qena' : 'Enactus Qena | South Valley University';
  const fullTitle = title ? `${title} | ${siteTitle}` : (isAr ? 'إيناكوس قنا | Enactus Qena - ريادة الأعمال المجتمعية' : 'Enactus Qena - Empowering Change & Innovation');

  const defaultDesc = isAr
    ? 'الموقع الرسمي لكتيبة إيناكوس قنا - جامعة جنوب الوادي. مشاريع ريادة أعمال مجتمعية، لجان فرعونية، وأثر حقيقي في صعيد مصر.'
    : 'Official website of Enactus Qena - South Valley University. Social entrepreneurship ventures, Pharaonic committees, and sustainable impact in Upper Egypt.';
  const desc = description || defaultDesc;

  // Resolve absolute origin for social share previews (WhatsApp, Facebook, LinkedIn, X)
  const defaultOrigin = 'https://enactus-qena.org';
  const siteOrigin =
    (typeof window !== 'undefined' && window.location.origin) ||
    import.meta.env.VITE_SITE_URL ||
    defaultOrigin;

  // Resolve absolute image URL
  const defaultImg = '/assets/E2.jpg';
  const rawImg = image || defaultImg;
  const absoluteImg =
    rawImg.startsWith('http://') || rawImg.startsWith('https://')
      ? rawImg
      : `${siteOrigin}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;

  // Resolve canonical URL
  const rawPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const canonicalUrl = url
    ? url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${siteOrigin}${url.startsWith('/') ? '' : '/'}${url}`
    : `${siteOrigin}${rawPath}`;

  // Resolve keywords
  const defaultKeywords = isAr
    ? 'إيناكوس, إيناكوس قنا, Enactus Qena, جامعة جنوب الوادي, SVU, ريادة أعمال, تنمية مستدامة, صعيد مصر, قنا, أنشطة طلابية'
    : 'Enactus, Enactus Qena, South Valley University, SVU, Social Entrepreneurship, Upper Egypt, Qena, Student Activities, SDGs';
  const keywordsContent = Array.isArray(keywords)
    ? keywords.join(', ')
    : (keywords || defaultKeywords);

  return (
    <Helmet>
      {/* HTML Language & Direction Attributes */}
      <html lang={lang} dir={dir} />

      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={desc} />
      <meta name="keywords" content={keywordsContent} />
      <meta name="author" content={author} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Search Engine Robots Indexing */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:site_name" content="Enactus Qena | إيناكوس قنا" />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={absoluteImg} />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content={isAr ? 'ar_EG' : 'en_US'} />
      <meta property="og:locale:alternate" content={isAr ? 'en_US' : 'ar_EG'} />

      {/* Article specific metadata */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && (
        <meta property="article:author" content={author} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={absoluteImg} />
      <meta name="twitter:image:alt" content={fullTitle} />

      {/* JSON-LD Structured Data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
