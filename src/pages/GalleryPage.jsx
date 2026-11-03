import React from 'react';
import VisualGallery from '../components/VisualGallery';
import SEO from '../components/SEO';

export default function GalleryPage() {
  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title="معرض الصور والوسائط"
        description="معرض الوسائط والهوية البصرية لكتيبة إيناكوس قنا: كواليس الحملات وتوثيق لحظات المجد."
      />
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            MEDIA & VISUAL VAULT
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            معرض الوسائط <span className="gold-gradient-text">والهوية البصرية</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            شاهد كواليس الحملات الإعلانية، تصميمات معبد دندرة، وتوثيق لحظات المجد والنزول الميداني لأبطال إيناكوس قنا.
          </p>
        </div>

        {/* Visual Gallery Component with full lightbox & zoom */}
        <VisualGallery />
      </div>
    </div>
  );
}
