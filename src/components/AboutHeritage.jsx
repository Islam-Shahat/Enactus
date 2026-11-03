import React from 'react';
import { Landmark, Lightbulb, Users, Globe2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function AboutHeritage({ onOpenJoinModal }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ChevronIcon = isAr ? ChevronLeft : ChevronRight;

  const pillars = [
    {
      icon: Landmark,
      title: isAr ? 'إرث دندرة والصعيد' : 'Dendera Heritage & Upper Egypt',
      english: 'ANCIENT HERITAGE',
      description: isAr
        ? 'نستمد شموخنا من معبد دندرة وعظمة حضارة وادي النيل بقنا. كما شيّد أجدادنا مجداً خالداً بالحجر، نبني نحن مجداً مستداماً بالأثر الإنساني.'
        : 'Inspired by the majesty of Dendera Temple and ancient Nile civilization. Just as our ancestors carved eternal glory in stone, we build lasting impact through social entrepreneurship.',
      tag: isAr ? 'الجذور الراسخة' : 'Enduring Roots',
    },
    {
      icon: Lightbulb,
      title: isAr ? 'ريادة الأعمال المجتمعية' : 'Social Entrepreneurship',
      english: 'SOCIAL INNOVATION',
      description: isAr
        ? 'لا نقدم حلولاً مؤقتة؛ بل نبتكر مشاريع تجارية وبيئية مستدامة تحل مشاكل الطاقة، تدوير المخلفات، وتمكين الأسر الأكثر احتياجاً في صعيد مصر.'
        : 'We do not offer temporary relief; we pioneer viable business and environmental ventures addressing clean energy, agricultural waste upcycling, and family empowerment in Upper Egypt.',
      tag: isAr ? 'حلول اقتصادية' : 'Economic Solutions',
    },
    {
      icon: Users,
      title: isAr ? 'تمكين الإنسان وصناعة القادة' : 'People-First Leadership',
      english: 'PEOPLE FIRST',
      description: isAr
        ? 'نؤمن أن أعظم استثمار هو الاستثمار في عقول شباب جامعة جنوب الوادي، وتزويدهم بمهارات القيادة، التقنية، وإدارة الأعمال العالمية.'
        : 'We believe our highest return is investing in the youth of South Valley University, arming them with world-class leadership, technical skills, and management capabilities.',
      tag: isAr ? 'بناء الكفاءات' : 'Capacity Building',
    },
    {
      icon: Globe2,
      title: isAr ? 'من قنا إلى كأس العالم' : 'From Qena to World Stage',
      english: 'TO THE WORLD STAGE',
      description: isAr
        ? 'هدفنا ليس فقط التميز المحلي، بل خوض غمار المسابقة الوطنية المصرية Enactus Egypt NC ومواصلة الطريق لتمثيل مصر في Enactus World Cup.'
        : 'Our ambition transcends local excellence; we compete boldly at the Enactus Egypt National Competition and aim to proudly represent Egypt on the global World Cup stage.',
      tag: isAr ? 'المنافسة العالمية' : 'Global Arena',
    },
  ];

  return (
    <section id="story" style={{ padding: '100px 0', position: 'relative' }}>
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 4rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge-gold">
              <Sparkles size={14} />
              {isAr ? 'هويتنا ورسالتنا' : 'Identity & Mission'}
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)', fontWeight: 900, marginBottom: '1.25rem' }}>
            {isAr ? (
              <>
                شفرة دندرة.. <span className="gold-gradient-text">تاريخ كُتب على الحجر</span>
                <br />
                ومستقبل نصنعه بالأثر!
              </>
            ) : (
              <>
                The Dendera Code.. <span className="gold-gradient-text">History Written in Stone</span>
                <br />
                And a Future Forged by Impact!
              </>
            )}
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#b5b5c6', lineHeight: 1.8 }}>
            {isAr ? (
              <>
                في <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong> ندمج بين جينات الإبداع المصري القديم وحماس ريادة الأعمال الحديثة. نحن مجتمع طلابي شغوف في جامعة جنوب الوادي يؤمن بأن الأفكار الحقيقية هي التي تغير حياة الناس على أرض الواقع.
              </>
            ) : (
              <>
                At <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong>, we blend ancient Egyptian creative DNA with modern social enterprise. We are a passionate student community at South Valley University proving that real ideas transform communities on the ground.
              </>
            )}
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid-4" style={{ marginBottom: '4.5rem' }}>
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="glass-panel gold-glow-hover card-shine responsive-card-p"
                style={{
                  borderRadius: '20px',
                  padding: '2rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.2), rgba(212, 136, 0, 0.05))',
                        border: '1px solid rgba(255, 184, 0, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffb800',
                      }}
                    >
                      <Icon size={26} />
                    </div>
                    <span className="badge-gold font-cinzel" style={{ fontSize: '0.7rem' }}>
                      {pillar.english}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
                    {pillar.title}
                  </h3>

                  <p style={{ fontSize: '0.92rem', color: '#a5a5b8', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                    {pillar.description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#ffd54f', fontWeight: 600 }}>
                    {pillar.tag}
                  </span>
                  <span style={{ color: 'rgba(255, 184, 0, 0.6)', fontSize: '1.1rem' }}>
                    ☥
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cinematic Heritage Panorama Banner */}
        <div
          className="glass-panel gold-border-glow card-shine responsive-panel-p"
          style={{
            borderRadius: '24px',
            overflow: 'hidden',
            position: 'relative',
            padding: '3rem 2rem',
            backgroundImage: 'linear-gradient(to right, rgba(8, 8, 12, 0.92) 0%, rgba(8, 8, 12, 0.7) 50%, rgba(8, 8, 12, 0.92) 100%), url("/assets/E1.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '2rem',
          }}
        >
          <div style={{ maxWidth: '640px' }}>
            <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
              QENA HERITAGE & INNOVATION
            </span>
            <h3 style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', lineHeight: 1.3 }}>
              {isAr
                ? 'من ضفاف النيل وبهاء دندرة ومسجد سيدي عبد الرحيم القنائي'
                : 'From the Banks of the Nile & the Enduring Splendor of Dendera'}
            </h3>
            <p style={{ color: '#e0e0ec', fontSize: '1rem', lineHeight: 1.7, margin: 0 }}>
              {isAr
                ? 'ننطلق بفخر من هوية قنا الأصيلة. هدفنا ليس مجرد نشاط طلابي عادي؛ بل حركة شبابية تنموية تُثبت للعالم أجمع أن صعيد مصر يمتلك العقول، العزيمة، والموهبة لقيادة المستقبل.'
                : 'We proudly rise from the profound heritage of Upper Egypt. We prove to the entire world that Upper Egypt possesses the talent, intellect, and resolve to shape the future of sustainable enterprise.'}
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '300px' }}>
            <button
              onClick={onOpenJoinModal}
              className="btn-primary"
              style={{ fontSize: '1.05rem', padding: '0.9rem 2rem', width: '100%', justifyContent: 'center' }}
            >
              <span>{isAr ? 'كن جزءاً من الحكاية' : 'Join the Story'}</span>
              <ChevronIcon size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
