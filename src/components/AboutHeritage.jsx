import React from 'react';
import { Landmark, Lightbulb, Users, Globe2, Sparkles, ChevronLeft } from 'lucide-react';

export default function AboutHeritage({ onOpenJoinModal }) {
  const pillars = [
    {
      icon: Landmark,
      title: 'إرث دندرة والصعيد',
      english: 'ANCIENT HERITAGE',
      description: 'نستمد شموخنا من معبد دندرة وعظمة حضارة وادي النيل بقنا. كما شيّد أجدادنا مجداً خالداً بالحجر، نبني نحن مجداً مستداماً بالأثر الإنساني.',
      tag: 'الجذور الراسخة',
    },
    {
      icon: Lightbulb,
      title: 'ريادة الأعمال المجتمعية',
      english: 'SOCIAL INNOVATION',
      description: 'لا نقدم حلولاً مؤقتة؛ بل نبتكر مشاريع تجارية وبيئية مستدامة تحل مشاكل الطاقة، تدوير المخلفات، وتمكين الأسر الأكثر احتياجاً في صعيد مصر.',
      tag: 'حلول اقتصادية',
    },
    {
      icon: Users,
      title: 'تمكين الإنسان وصناعة القادة',
      english: 'PEOPLE FIRST',
      description: 'نؤمن أن أعظم استثمار هو الاستثمار في عقول شباب جامعة جنوب الوادي، وتزويدهم بمهارات القيادة، التقنية، وإدارة الأعمال العالمية.',
      tag: 'بناء الكفاءات',
    },
    {
      icon: Globe2,
      title: 'من قنا إلى كأس العالم',
      english: 'TO THE WORLD STAGE',
      description: 'هدفنا ليس فقط التميز المحلي، بل خوض غمار المسابقة الوطنية المصرية Enactus Egypt NC ومواصلة الطريق لتمثيل مصر في Enactus World Cup.',
      tag: 'المنافسة العالمية',
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
              هويتنا ورسالتنا
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)', fontWeight: 900, marginBottom: '1.25rem' }}>
            شفرة دندرة.. <span className="gold-gradient-text">تاريخ كُتب على الحجر</span>
            <br />
            ومستقبل نصنعه بالأثر!
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#b5b5c6', lineHeight: 1.8 }}>
            في <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong> ندمج بين جينات الإبداع المصري القديم وحماس ريادة الأعمال الحديثة. نحن مجتمع طلابي شغوف في جامعة جنوب الوادي يؤمن بأن الأفكار الحقيقية هي التي تغير حياة الناس على أرض الواقع.
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

                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
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

        {/* Cinematic Heritage Panorama Banner (E1.jpg) */}
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
            <span className="badge-gold" style={{ marginBottom: '1rem' }}>
              QENA HERITAGE & INNOVATION
            </span>
            <h3 style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', lineHeight: 1.3 }}>
              من ضفاف النيل وبهاء دندرة ومسجد سيدي عبد الرحيم القنائي
            </h3>
            <p style={{ color: '#e0e0ec', fontSize: '1rem', lineHeight: 1.7, margin: 0 }}>
              ننطلق بفخر من هوية قنا الأصيلة. هدفنا ليس مجرد نشاط طلابي عادي؛ بل حركة شبابية تنموية تُثبت للعالم أجمع أن صعيد مصر يمتلك العقول، العزيمة، والموهبة لقيادة المستقبل.
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '300px' }}>
            <button
              onClick={onOpenJoinModal}
              className="btn-primary"
              style={{ fontSize: '1.05rem', padding: '0.9rem 2rem', width: '100%', justifyContent: 'center' }}
            >
              <span>كن جزءاً من الحكاية</span>
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
