import React from 'react';
import { TrendingUp, Users, Sprout, Palette, Sun, Award, ArrowUpRight } from 'lucide-react';

export default function ProjectsImpact({ onOpenJoinModal }) {
  const stats = [
    { number: '+11,700', label: 'متابع وداعم للأثر', sub: 'مجتمعنا على فيسبوك وقنا' },
    { number: '+3,500', label: 'ساعة تدريب وتطوير', sub: 'لطلاب جامعة جنوب الوادي' },
    { number: '150+', label: 'أسرة مستفيدة مباشرة', sub: 'من مشاريع التمكين الاقتصادي' },
    { number: '100%', label: 'شغف وعزيمة', sub: 'للمنافسة الوطنية NC 2026' },
  ];

  const projects = [
    {
      icon: Sprout,
      title: 'مشروع نَبْتَة (Nabta Green)',
      category: 'استدامة بيئية وتدوير زراعي',
      desc: 'قنا تشتهر بزراعة قصب السكر، ومعه تتولد أطنان من المخلفات الزراعية. ابتكر فريق إيناكوس قنا حلاً تقنياً لتحويل هذه المخلفات إلى أسمدة عضوية عالية الخصوبة وألواح صديقة للبيئة كبديل للبلاستيك.',
      impactTag: 'خفض الانبعاثات وخلق فرص عمل خضراء',
      sdgs: ['العمل المناخي', 'الاستهلاك المسؤول', 'القضاء على الفقر'],
      image: '/assets/E9.jpg',
    },
    {
      icon: Palette,
      title: 'مشروع حِرْفَة (Herfa Heritage)',
      category: 'تمكين مجتمعي وتراث قناوي',
      desc: 'إحياء صناعة الفخار والخزف التراثي الشهير في قنا، من خلال تدريب أصحاب الحرف وسيدات القرى على تصميمات عصرية مبتكرة مع ربطهم بسلاسل توريد وتجارة إلكترونية تفتح لهم أسواقاً عالمية.',
      impactTag: 'تمكين 150+ أسرة وسيدة معيلة في قنا',
      sdgs: ['العمل اللائق والنمو الاقتصادي', 'المساواة بين الجنسين'],
      image: '/assets/E3.jpg',
    },
    {
      icon: Sun,
      title: 'مشروع شمس الجنوب (Solar Impact)',
      category: 'طاقة نظيفة وحلول مائية',
      desc: 'تطبيق حلول ري ذكية ومضخات شمسية بالتعاون مع المزارعين في الظهير الصحراوي بقنا لتقليل تكاليف الوقود وزيادة الإنتاجية الزراعية باستخدام الطاقة المتجددة الوفيرة في صعيد مصر.',
      impactTag: 'توفير 45% من تكاليف الطاقة لصغار المزارعين',
      sdgs: ['طاقة نظيفة وبأسعار معقولة', 'ابتكار في الصناعة'],
      image: '/assets/E4.jpg',
    },
  ];

  return (
    <section id="projects" style={{ padding: '110px 0', position: 'relative' }}>
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 4rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge-gold">
              <TrendingUp size={14} />
              PEOPLE • IDEAS • IMPACT
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', fontWeight: 900, marginBottom: '1rem' }}>
            أثر يمتد بطول النيل: <span className="gold-gradient-text">مشاريع تصنع فارقاً حقيقياً</span>
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#b5b5c6', lineHeight: 1.8 }}>
            في إيناكوس قنا، لا نكتفي بالأفكار النظرية. نحن نختبر الواقع، نبتكر حلولاً مستدامة، ونحول التحديات إلى فرص استثمارية ذات عائد مجتمعي واقتصادي ملموس.
          </p>
        </div>

        {/* Stats Strip */}
        <div
          className="glass-panel gold-border-glow stat-grid-responsive responsive-panel-p"
          style={{
            borderRadius: '24px',
            padding: '2.5rem 1.5rem',
            marginBottom: '4.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: '2rem',
            textAlign: 'center',
          }}
        >
          {stats.map((s, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              <div
                className="gold-gradient-text font-cinzel"
                style={{ fontSize: 'clamp(2.4rem, 4vw, 3.4rem)', fontWeight: 900, lineHeight: 1, marginBottom: '0.5rem' }}
              >
                {s.number}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#a5a5b8' }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Projects Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {projects.map((proj, idx) => {
            const Icon = proj.icon;
            const isEven = idx % 2 === 1;
            return (
              <div
                key={idx}
                className="glass-panel gold-glow-hover card-shine project-row responsive-card-p"
                style={{
                  borderRadius: '24px',
                  padding: '2rem',
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr',
                  gap: '2.5rem',
                  alignItems: 'center',
                  direction: isEven ? 'ltr' : 'rtl',
                }}
              >
                {/* Text Content */}
                <div style={{ direction: 'rtl', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(255, 184, 0, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffb800',
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <span className="badge-gold font-cinzel" style={{ fontSize: '0.78rem' }}>
                      {proj.category}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '0.85rem' }}>
                    {proj.title}
                  </h3>

                  <p style={{ fontSize: '1rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
                    {proj.desc}
                  </p>

                  <div className="impact-tag-box" style={{ background: 'rgba(255, 184, 0, 0.08)', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1.25rem', borderLeft: '3px solid #ffb800' }}>
                    <span className="impact-tag-text" style={{ fontSize: '0.88rem', color: '#ffd54f', fontWeight: 700 }}>
                      مؤشر الأثر: {proj.impactTag}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {proj.sdgs.map((sdg, sIdx) => (
                      <span
                        key={sIdx}
                        className="sdg-tag-pill"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          color: '#e2e2ee',
                        }}
                      >
                        ✓ {sdg}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visual / Image thumbnail */}
                <div
                  className="project-img-box"
                  style={{
                    borderRadius: '18px',
                    overflow: 'hidden',
                    height: '280px',
                    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)',
                    position: 'relative',
                  }}
                >
                  <img
                    src={proj.image}
                    alt={proj.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(8, 8, 12, 0.7), transparent)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .project-row {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
            direction: rtl !important;
          }
          .project-img-box {
            height: 220px !important;
          }
        }
      `}</style>
    </section>
  );
}
