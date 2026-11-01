import React, { useState } from 'react';
import { Eye, Image as ImageIcon, Sparkles, X, ZoomIn } from 'lucide-react';

export default function VisualGallery() {
  const [activeImage, setActiveImage] = useState(null);

  const galleryItems = [
    {
      src: '/assets/E9.jpg',
      title: 'قميص معبد دندرة 2026',
      tag: 'From Qena to the World',
      category: 'Official Kit & National Competition',
      caption: 'حيث كُتب التاريخ على الحجر، نحمل رؤيتنا لنعبر بها الحدود ونمثل صعيد مصر في المسابقة الوطنية.',
    },
    {
      src: '/assets/E6.jpg',
      title: 'كتيبة الفراعنة: فريق واحد، هدف واحد',
      tag: 'One Team • One Legacy',
      category: 'Team & Committees',
      caption: 'الشخصيات الكرتونية الفرعونية ثلاثية الأبعاد التي تمثل لجان PR, Multimedia, PM, OC, HR, Presentation.',
    },
    {
      src: '/assets/E7.jpg',
      title: 'شفرة المستقبل المدفونة',
      tag: 'The Future Was Found',
      category: 'Recruitment & Legacy',
      caption: 'البشر.. الأفكار.. والأثر. اكتشاف بطاقة العضوية التاريخية لإيناكوس قنا بين آثار الماضي العريق.',
    },
    {
      src: '/assets/E8.jpg',
      title: 'حملة استقطاب قادة السوشيال ميديا',
      tag: 'Head of Social Media',
      category: 'Creatives & Voice',
      caption: 'We don\'t just post, we purpose! صناعة الأثر وإيصال الرسالة بإبداع الطائرات الورقية الذهبية.',
    },
    {
      src: '/assets/E5.jpg',
      title: 'العد التنازلي: اترك أثرك',
      tag: 'Leave Your Mark',
      caption: 'Don\'t just apply, leave your mark! الفرعون الصغير يدعو طلاب قنا لعدم تفويت الفرصة.',
      category: 'Campaign Deadline',
    },
    {
      src: '/assets/partner_arab_union.png',
      title: 'إعلان الشراكة مع الاتحاد العربي للتدريب والتنمية',
      tag: 'Arab Union Partnership',
      category: 'Strategic Alliance',
      caption: 'Together, We Create Greater Impact! بروتوكول تعاون تدريبي وتأهيلي رائد لدعم كوادر طلاب قنا.',
    },
    {
      src: '/assets/sponsors_list.png',
      title: 'رعاة إيناكوس قنا الرسميون (Meet Our Sponsors)',
      tag: 'Official Sponsors',
      category: 'Sponsorship Network',
      caption: 'باقة الرعاة الرسميين: فراندة (VERANDA)، الاتحاد العربي للتدريب والتنمية، الأوائل لتنمية المهارات، ومكتبات الرضا.',
    },
    {
      src: '/assets/E4.jpg',
      title: 'شراكة إيناكوس قنا مع يافا للتسويق',
      tag: 'Together for a Bigger Impact',
      category: 'Strategic Partnership',
      caption: 'شراكة استراتيجية تفتح آفاقاً رحبة للمشاريع الريادية بالتعاون مع YAFFA E-Marketing.',
    },
    {
      src: '/assets/E1.jpg',
      title: 'بانوراما قنا: دندرة والجامع والنيل',
      tag: 'Qena Heritage Panorama',
      category: 'City & Culture',
      caption: 'توليفة بديعة تجمع معبد دندرة، مسجد سيدي عبد الرحيم القنائي، ونيل قنا الخالد.',
    },
    {
      src: '/assets/E3.jpg',
      title: 'شعار إيناكوس جامعة جنوب الوادي',
      tag: 'Stone Engraving Mockup',
      category: 'Identity & Stone',
      caption: 'محفور في ذاكرة الجامعة.. Enactus South Valley University بكل فخر واعتزاز.',
    },
  ];

  return (
    <section id="gallery" style={{ padding: '100px 0', position: 'relative' }}>
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3.5rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge-gold">
              <ImageIcon size={14} />
              VISUAL IDENTITY VAULT
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 3.6vw, 3rem)', fontWeight: 900, marginBottom: '1rem' }}>
            معرض الهوية البصرية: <span className="gold-gradient-text">إبداع فرعوني معاصر</span>
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#b5b5c6', lineHeight: 1.8 }}>
            استكشف التحف البصرية التي تميز هوية إيناكوس قنا. مزيج ساحر يجمع بين عبق الآثار المصرية ولمسات الديزاين العالمي الحديث.
          </p>
        </div>

        {/* Gallery Grid */}
        <div
          className="gallery-main-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '1.25rem',
          }}
        >
          {galleryItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => setActiveImage(item)}
              className="glass-panel gold-glow-hover card-shine"
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="gallery-card-img-box" style={{ height: '320px', overflow: 'hidden', position: 'relative', background: '#0a0a0f' }}>
                <img
                  src={item.src}
                  alt={item.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(8, 8, 12, 0.8)',
                    backdropFilter: 'blur(8px)',
                    padding: '0.3rem 0.7rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 184, 0, 0.3)',
                    fontSize: '0.72rem',
                    color: '#ffd54f',
                    fontWeight: 700,
                  }}
                >
                  {item.tag}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255, 184, 0, 0.9)',
                    color: '#08080a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(255, 184, 0, 0.4)',
                  }}
                >
                  <ZoomIn size={18} />
                </div>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#ffb800', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {item.category}
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#a0a0b2', margin: 0, lineHeight: 1.5 }}>
                  {item.caption}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox Modal */}
        {activeImage && (
          <div
            onClick={() => setActiveImage(null)}
            className="modal-overlay-responsive"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5, 5, 8, 0.94)',
              backdropFilter: 'blur(20px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-panel gold-border-glow modal-dialog-responsive"
              style={{
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                borderRadius: '24px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                background: '#0d0d14',
              }}
            >
              {/* Top Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid rgba(255, 184, 0, 0.2)',
                  background: 'rgba(15, 16, 24, 0.8)',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {activeImage.title}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#ffd54f' }}>
                    {activeImage.tag}
                  </span>
                </div>

                <button
                  onClick={() => setActiveImage(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Image View */}
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', background: '#07070a' }}>
                <img
                  src={activeImage.src}
                  alt={activeImage.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    objectFit: 'contain',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(12, 13, 20, 0.95)' }}>
                <p style={{ margin: 0, color: '#d0d0df', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {activeImage.caption}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .gallery-card-img-box {
            height: 240px !important;
          }
        }
      `}</style>
    </section>
  );
}
