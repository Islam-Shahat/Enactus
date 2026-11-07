import React, { useState } from 'react';
import { Image as ImageIcon, X, ZoomIn } from 'lucide-react';
import { useGallery } from '../hooks/usePublicContent';
import { useLanguage } from '../context/LanguageContext';

export default function VisualGallery() {
  const [activeImage, setActiveImage] = useState(null);
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { data: dbGallery } = useGallery();

  const defaultGalleryItems = [
    {
      src: '/assets/E9.jpg',
      title: isAr ? 'قميص معبد دندرة 2026' : 'Dendera Temple Kit 2026',
      tag: 'From Qena to the World',
      category: 'Official Kit & National Competition',
      caption: isAr
        ? 'حيث كُتب التاريخ على الحجر، نحمل رؤيتنا لنعبر بها الحدود ونمثل صعيد مصر في المسابقة الوطنية.'
        : 'Where history was carved in stone, we carry our vision across borders to represent Upper Egypt.',
    },
    {
      src: '/assets/E6.jpg',
      title: isAr ? 'كتيبة الفراعنة: فريق واحد، هدف واحد' : 'Pharaohs: One Team, One Goal',
      tag: 'One Team • One Legacy',
      category: 'Team & Committees',
      caption: isAr
        ? 'الشخصيات الكرتونية الفرعونية ثلاثية الأبعاد التي تمثل لجان PR, Multimedia, PM, OC, HR, Presentation.'
        : 'The 3D Pharaonic mascot characters representing PR, Multimedia, PM, OC, HR, Presentation committees.',
    },
    {
      src: '/assets/E7.jpg',
      title: isAr ? 'شفرة المستقبل المدفونة' : 'Buried Code of the Future',
      tag: 'The Future Was Found',
      category: 'Recruitment & Legacy',
      caption: isAr
        ? 'البشر.. الأفكار.. والأثر. اكتشاف بطاقة العضوية التاريخية لإيناكوس قنا بين آثار الماضي العريق.'
        : 'People, ideas, and real impact. The historic membership discovery among the ancient heritage of Qena.',
    },
    {
      src: '/assets/E8.jpg',
      title: isAr ? 'حملة استقطاب قادة السوشيال ميديا' : 'Social Media Recruitment',
      tag: 'Head of Social Media',
      category: 'Creatives & Voice',
      caption: isAr
        ? 'We don\'t just post, we purpose! صناعة الأثر وإيصال الرسالة بإبداع الطائرات الورقية الذهبية.'
        : 'We don\'t just post, we purpose! Delivering inspiration through creative storytelling.',
    },
    {
      src: '/assets/E5.jpg',
      title: isAr ? 'العد التنازلي: اترك أثرك' : 'Countdown: Leave Your Mark',
      tag: 'Leave Your Mark',
      caption: isAr
        ? 'Don\'t just apply, leave your mark! الفرعون الصغير يدعو طلاب قنا لعدم تفويت الفرصة.'
        : 'Don\'t just apply, leave your mark! The young Pharaoh invites SVU students to step forward.',
      category: 'Campaign Deadline',
    },
    {
      src: '/assets/partner_arab_union.png',
      title: isAr ? 'الشراكة مع الاتحاد العربي للتدريب' : 'Arab Union Partnership',
      tag: 'Arab Union Partnership',
      category: 'Strategic Alliance',
      caption: isAr
        ? 'Together, We Create Greater Impact! بروتوكول تعاون تدريبي وتأهيلي رائد لدعم كوادر طلاب قنا.'
        : 'Together, We Create Greater Impact! Pioneering youth training and certifications protocol.',
    },
    {
      src: '/assets/sponsors_list.png',
      title: isAr ? 'رعاة إيناكوس قنا الرسميون' : 'Official Sponsors',
      tag: 'Official Sponsors',
      category: 'Sponsorship Network',
      caption: isAr
        ? 'باقة الرعاة الرسميين: فراندة (VERANDA)، الاتحاد العربي للتدريب والتنمية، الأوائل لتنمية المهارات، ومكتبات الرضا.'
        : 'Official sponsors cohort: VERANDA, Arab Union for Training, Al-Awael, and Al-Reda Printing.',
    },
    {
      src: '/assets/E4.jpg',
      title: isAr ? 'شراكة إيناكوس قنا مع يافا للتسويق' : 'Yafa Marketing Alliance',
      tag: 'Together for a Bigger Impact',
      category: 'Strategic Partnership',
      caption: isAr
        ? 'شراكة استراتيجية تفتح آفاقاً رحبة للمشاريع الريادية بالتعاون مع YAFFA E-Marketing.'
        : 'Strategic collaboration opening wide horizons for startup ventures in Upper Egypt.',
    },
    {
      src: '/assets/E1.jpg',
      title: isAr ? 'بانوراما قنا: دندرة والجامع والنيل' : 'Qena Heritage Panorama',
      tag: 'Qena Heritage Panorama',
      category: 'City & Culture',
      caption: isAr
        ? 'توليفة بديعة تجمع معبد دندرة، مسجد سيدي عبد الرحيم القنائي، ونيل قنا الخالد.'
        : 'A breathtaking panorama uniting Dendera Temple, Sidi Abdelrahim Mosque, and the eternal Nile.',
    },
    {
      src: '/assets/E3.jpg',
      title: isAr ? 'شعار إيناكوس جامعة جنوب الوادي' : 'Enactus SVU Emblem',
      tag: 'Stone Engraving Mockup',
      category: 'Identity & Stone',
      caption: isAr
        ? 'محفور في ذاكرة الجامعة.. Enactus South Valley University بكل فخر واعتزاز.'
        : 'Carved into the memory of the university.. Enactus South Valley University with pride.',
    },
  ];

  const galleryItems =
    dbGallery && Array.isArray(dbGallery) && dbGallery.length > 0
      ? dbGallery
          .filter((item) => item.is_visible !== false)
          .map((item, idx) => {
            const fallback = defaultGalleryItems[idx] || {};
            const caption = isAr
              ? (item.caption_ar || item.caption || fallback.caption || '')
              : (item.caption_en || item.caption || fallback.caption || '');
            const title =
              caption.length > 40
                ? caption.slice(0, 38) + '...'
                : (caption || fallback.title || (isAr ? `صورة ${idx + 1}` : `Asset ${idx + 1}`));
            return {
              id: item.id || idx,
              src: item.media_url || item.url || fallback.src || '',
              title,
              caption,
              tag: fallback.tag || (item.kind === 'video' ? 'VIDEO' : 'VISUAL VAULT'),
              category: fallback.category || (isAr ? 'معرض الهوية البصرية' : 'Visual Identity'),
            };
          })
      : defaultGalleryItems;

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
            {isAr ? (
              <>
                معرض الهوية البصرية: <span className="gold-gradient-text">إبداع فرعوني معاصر</span>
              </>
            ) : (
              <>
                Visual Identity Gallery: <span className="gold-gradient-text">Modern Pharaonic Art</span>
              </>
            )}
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#b5b5c6', lineHeight: 1.8 }}>
            {isAr
              ? 'استكشف التحف البصرية التي تميز هوية إيناكوس قنا. مزيج ساحر يجمع بين عبق الآثار المصرية ولمسات الديزاين العالمي الحديث.'
              : 'Explore the visual assets defining Enactus Qena. An inspiring fusion of ancient Egyptian heritage and modern digital aesthetic.'}
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
                textAlign: isAr ? 'right' : 'left',
              }}
            >
              <div className="gallery-card-img-box" style={{ height: '320px', overflow: 'hidden', position: 'relative', background: '#0a0a0f' }}>
                <img
                  src={item.src}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.4s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: isAr ? '12px' : 'auto',
                    left: isAr ? 'auto' : '12px',
                    zIndex: 2,
                  }}
                >
                  <span className="badge-gold font-cinzel" style={{ fontSize: '0.68rem', background: 'rgba(8, 8, 12, 0.85)', backdropFilter: 'blur(8px)' }}>
                    {item.tag}
                  </span>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(8, 8, 12, 0.35)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffb800',
                  }}
                  className="gallery-zoom-overlay"
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(255, 184, 0, 0.25)',
                      border: '1.5px solid #ffb800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <ZoomIn size={22} color="#fff" />
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#ffb800', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {item.category}
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#a5a5b8', lineHeight: 1.5, margin: 0 }}>
                  {item.caption}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox Modal */}
        {activeImage && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(5, 5, 8, 0.94)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
            }}
            onClick={() => setActiveImage(null)}
          >
            <div
              style={{
                position: 'relative',
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '24px',
                overflow: 'hidden',
                background: '#0e0f16',
                border: '1.5px solid rgba(255, 184, 0, 0.4)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.95), 0 0 50px rgba(255, 184, 0, 0.25)',
                textAlign: isAr ? 'right' : 'left',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveImage(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: isAr ? 'auto' : '16px',
                  left: isAr ? '16px' : 'auto',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(8, 8, 12, 0.85)',
                  border: '1px solid rgba(255, 184, 0, 0.4)',
                  color: '#ffb800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                <X size={20} />
              </button>

              <div style={{ flex: 1, minHeight: '300px', maxHeight: '65vh', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={activeImage.src}
                  alt={activeImage.title}
                  style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }}
                />
              </div>

              <div style={{ padding: '1.5rem', background: '#0e0f16', borderTop: '1px solid rgba(255, 184, 0, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span className="badge-gold font-cinzel" style={{ fontSize: '0.72rem' }}>
                    {activeImage.tag}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#ffb800' }}>
                    {activeImage.category}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginBottom: '0.4rem' }}>
                  {activeImage.title}
                </h3>
                <p style={{ color: '#b5b5c6', fontSize: '0.92rem', margin: 0, lineHeight: 1.6 }}>
                  {activeImage.caption}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
