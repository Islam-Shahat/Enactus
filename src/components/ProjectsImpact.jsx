import React from 'react';
import { TrendingUp, Sprout, Palette, Sun, Sparkles } from 'lucide-react';
import { useStats } from '../hooks/usePublicContent';
import { useLanguage } from '../context/LanguageContext';

export default function ProjectsImpact({ onOpenJoinModal }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { data: dbStats } = useStats();

  const defaultStats = [
    {
      key: 'volunteers',
      number: '+11,700',
      label: isAr ? 'متابع وداعم للأثر' : 'Community Followers',
      sub: isAr ? 'مجتمعنا على فيسبوك وقنا' : 'Across Facebook & Upper Egypt',
    },
    {
      key: 'members',
      number: '+3,500',
      label: isAr ? 'ساعة تدريب وتطوير' : 'Hours of Mentorship',
      sub: isAr ? 'لطلاب جامعة جنوب الوادي' : 'For SVU university students',
    },
    {
      key: 'projects',
      number: '150+',
      label: isAr ? 'أسرة مستفيدة مباشرة' : 'Direct Beneficiary Families',
      sub: isAr ? 'من مشاريع التمكين الاقتصادي' : 'From economic initiatives',
    },
    {
      key: 'impact_pct',
      number: '100%',
      label: isAr ? 'شغف وعزيمة' : 'Passion & Resolve',
      sub: isAr ? 'للمنافسة الوطنية NC 2026' : 'For NC 2026 Competition',
    },
  ];

  const stats =
    dbStats && Array.isArray(dbStats) && dbStats.length > 0
      ? dbStats
          .filter((s) => s.is_visible !== false)
          .map((s, idx) => {
            const fallback = defaultStats.find((d) => d.key === s.key) || defaultStats[idx] || {};
            const numFormatted =
              s.suffix === '+'
                ? `+${s.value.toLocaleString()}`
                : `${s.value.toLocaleString()}${s.suffix || ''}`;
            return {
              key: s.key,
              number: numFormatted,
              label: s.label || fallback.label || s.key,
              sub: fallback.sub || (isAr ? 'إيناكوس قنا' : 'Enactus Qena'),
            };
          })
      : defaultStats;

  const projects = [
    {
      icon: Sprout,
      title: isAr ? 'مشروع نَبْتَة (Nabta Green)' : 'Nabta Green Project',
      category: isAr ? 'استدامة بيئية وتدوير زراعي' : 'Eco Sustainability & Agro-Upcycling',
      desc: isAr
        ? 'قنا تشتهر بزراعة قصب السكر، ومعه تتولد أطنان من المخلفات الزراعية. ابتكر فريق إيناكوس قنا حلاً تقنياً لتحويل هذه المخلفات إلى أسمدة عضوية عالية الخصوبة وألواح صديقة للبيئة كبديل للبلاستيك.'
        : 'Qena is renowned for sugarcane agriculture, which generates massive amounts of agro-waste. Enactus Qena engineered a technical solution turning this waste into organic fertilizers and biodegradable boards.',
      impactTag: isAr ? 'خفض الانبعاثات وخلق فرص عمل خضراء' : 'Emissions reduction & green job creation',
      sdgs: isAr
        ? ['العمل المناخي', 'الاستهلاك المسؤول', 'القضاء على الفقر']
        : ['Climate Action', 'Responsible Consumption', 'No Poverty'],
      image: '/assets/E9.jpg',
    },
    {
      icon: Palette,
      title: isAr ? 'مشروع حِرْفَة (Herfa Heritage)' : 'Herfa Heritage Project',
      category: isAr ? 'تمكين مجتمعي وتراث قناوي' : 'Community Empowerment & Handicrafts',
      desc: isAr
        ? 'إحياء صناعة الفخار والخزف التراثي الشهير في قنا، من خلال تدريب أصحاب الحرف وسيدات القرى على تصميمات عصرية مبتكرة مع ربطهم بسلاسل توريد وتجارة إلكترونية تفتح لهم أسواقاً عالمية.'
        : 'Revitalizing the historic pottery and ceramics craft of Qena by training rural artisans and women on modern aesthetic designs and connecting them to international e-commerce channels.',
      impactTag: isAr ? 'تمكين 150+ أسرة وسيدة معيلة في قنا' : 'Empowering 150+ rural breadwinner families',
      sdgs: isAr
        ? ['العمل اللائق والنمو الاقتصادي', 'المساواة بين الجنسين']
        : ['Decent Work & Growth', 'Gender Equality'],
      image: '/assets/E3.jpg',
    },
    {
      icon: Sun,
      title: isAr ? 'مشروع شمس الجنوب (Solar Impact)' : 'Solar Impact Project',
      category: isAr ? 'طاقة نظيفة وحلول مائية' : 'Clean Energy & Water Solutions',
      desc: isAr
        ? 'تطبيق حلول ري ذكية ومضخات شمسية بالتعاون مع المزارعين في الظهير الصحراوي بقنا لتقليل تكاليف الوقود وزيادة الإنتاجية الزراعية باستخدام الطاقة المتجددة الوفيرة في صعيد مصر.'
        : 'Deploying smart irrigation pumps powered by solar energy in Qena reclaimed agricultural desert borders, cutting diesel fuel costs and raising crop yields.',
      impactTag: isAr ? 'توفير 45% من تكاليف الطاقة لصغار المزارعين' : '45% energy cost savings for farmers',
      sdgs: isAr
        ? ['طاقة نظيفة وبأسعار معقولة', 'ابتكار في الصناعة']
        : ['Affordable Clean Energy', 'Industry & Innovation'],
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
            {isAr ? (
              <>
                أثر يمتد بطول النيل: <span className="gold-gradient-text">مشاريع تصنع فارقاً حقيقياً</span>
              </>
            ) : (
              <>
                Impact Along the Nile: <span className="gold-gradient-text">Ventures Creating Real Change</span>
              </>
            )}
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#b5b5c6', lineHeight: 1.8 }}>
            {isAr
              ? 'في إيناكوس قنا، لا نكتفي بالأفكار النظرية. نحن نختبر الواقع، نبتكر حلولاً مستدامة، ونحول التحديات إلى فرص استثمارية ذات عائد مجتمعي واقتصادي ملموس.'
              : 'At Enactus Qena, we go far beyond theoretical concepts. We field-test reality, engineer sustainable solutions, and convert regional challenges into high-yield social enterprises.'}
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
            const gridDir = isAr ? (isEven ? 'ltr' : 'rtl') : (isEven ? 'rtl' : 'ltr');

            return (
              <div
                key={idx}
                className="glass-panel gold-glow-hover card-shine project-row responsive-card-p"
                style={{
                  borderRadius: '24px',
                  padding: '2rem',
                  direction: gridDir,
                }}
              >
                {/* Text Content */}
                <div style={{ direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}>
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

                  <h3 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>
                    {proj.title}
                  </h3>

                  <p style={{ color: '#b5b5c6', fontSize: '0.96rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                    {proj.desc}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#ffb800', fontWeight: 700 }}>
                      {isAr ? 'الأهداف المستهدفة (SDGs):' : 'Targeted SDGs:'}
                    </span>
                    {proj.sdgs.map((sdg, sIdx) => (
                      <span
                        key={sIdx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 184, 0, 0.25)',
                          color: '#e0e0ec',
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                        }}
                      >
                        {sdg}
                      </span>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: '#ffd54f', fontWeight: 600 }}>
                      ⚡ {proj.impactTag}
                    </span>
                    <button
                      onClick={onOpenJoinModal}
                      className="btn-secondary"
                      style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                    >
                      <span>{isAr ? 'شارك في المشروع' : 'Join Venture'}</span>
                    </button>
                  </div>
                </div>

                {/* Image */}
                <div
                  style={{
                    borderRadius: '18px',
                    overflow: 'hidden',
                    height: '320px',
                    position: 'relative',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6)',
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
                      background: 'linear-gradient(to top, rgba(8, 8, 12, 0.6) 0%, transparent 60%)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .project-row {
            grid-template-columns: 1fr !important;
          }
          .project-row > div:first-child {
            order: 2;
          }
          .project-row > div:last-child {
            order: 1;
            height: 240px !important;
          }
        }
      `}</style>
    </section>
  );
}
