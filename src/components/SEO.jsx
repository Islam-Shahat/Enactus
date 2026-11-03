import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, image, url }) {
  const siteTitle = 'إيناكوس قنا | Enactus Qena';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const defaultDesc =
    'الموقع الرسمي لكتيبة إيناكوس قنا - جامعة جنوب الوادي. مشاريع ريادة أعمال مجتمعية، لجان فرعونية، وأثر حقيقي في صعيد مصر.';
  const desc = description || defaultDesc;
  const defaultImg = '/assets/E2.jpg';
  const img = image || defaultImg;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}

