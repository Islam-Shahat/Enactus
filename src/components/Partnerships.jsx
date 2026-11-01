import React, { useState } from 'react';
import { Handshake, Award, Building2, CheckCircle2, Mail, ExternalLink, Sparkles, Star, Coffee, GraduationCap, Target, BookOpen } from 'lucide-react';

export default function Partnerships() {
  const [activeTab, setActiveTab] = useState('all');

  const strategicPartners = [
    {
      id: 'arab-union',
      name: 'الاتحاد العربي للتدريب والتنمية',
      englishName: 'Arab Union for Training & Development',
      badge: 'شراكة تدريبية استراتيجية',
      slogan: 'Together, We Create Greater Impact • التدريب معنا له بريق خاص',
      image: '/assets/partner_arab_union.png',
      desc: 'إعلان شراكة استراتيجية كبرى بين الاتحاد العربي للتدريب والتنمية وإيناكوس جامعة جنوب الوادي، تهدف لتوفير برامج تدريبية وتأهيلية دولية متقدمة لأعضاء الفريق لتجهيزهم للمنافسة على درع مسابقة الجمهورية NC.',
      points: [
        'برامج تدريبية معتمدة في القيادة وريادة الأعمال والاستدامة',
        'شهادات معتمدة لأعضاء كتيبة إيناكوس قنا',
        'دعم أكاديمي واستشاري لمشاريع الفريق التنموية في صعيد مصر',
      ],
      linkText: 'تفاصيل بروتوكول التعاون التدريبي',
    },
    {
      id: 'yaffa',
      name: 'YAFFA E-MARKETING',
      englishName: 'يافا للتسويق الرقمي',
      badge: 'شراكة تسويقية ورقمية',
      slogan: 'Together For A Bigger Impact • Impact Through Collaboration',
      image: '/assets/E4.jpg',
      desc: 'شراكة استراتيجية رائدة تجمع بين شغف وطاقة طلاب إيناكوس قنا وخبرة YAFFA E-MARKETING في مجالات التسويق الرقمي وتطوير العلامات التجارية، بهدف إيصال صوت مشاريع الصعيد إلى أوسع جمهور ممكن.',
      points: [
        'دعم الحملات الترويجية والوصول الرقمي لمشاريع الفريق',
        'ورش تدريبية متقدمة لأعضاء لجنة الـ MultiMedia و الـ Social Media',
        'ربط مخرجات المشاريع الريادية بأسواق التجارة الرقمية',
      ],
      linkText: 'متابعة تفاصيل الشراكة على فيسبوك',
    },
  ];

  const sponsors = [
    {
      number: '1',
      name: 'VERANDA',
      arabicName: 'فراندة - كافيه ومطعم',
      category: 'راعي الضيافة والملتقيات',
      icon: Coffee,
      desc: 'الوجهة الراقية في قنا وراعي استضافة اجتماعات القادة، جلسات العصف الذهني، وفعاليات الـ Team Building لكتيبة إيناكوس قنا.',
      perk: 'استضافة الفعاليات ولقاءات الفريق',
    },
    {
      number: '2',
      name: 'الاتحاد العربي للتدريب والتنمية',
      arabicName: 'الاتحاد العربي',
      category: 'الراعي الأكاديمي والتدريبي',
      icon: GraduationCap,
      desc: 'المظلة التدريبية الكبرى الداعمة لشباب الصعيد من خلال ورش العمل الاحترافية والاستشارات التنموية لرواد الأعمال.',
      perk: 'تطوير الكوادر والاعتمادات التدريبية',
    },
    {
      number: '3',
      name: 'الأوائل لتنمية المهارات',
      arabicName: 'الأوائل',
      category: 'راعي تطوير وتنمية المهارات',
      icon: Target,
      desc: 'صرح تنموي بارز في قنا يركز على صقل مهارات الشباب في مجالات التواصل، التفكير الإبداعي، وإدارة فرق العمل.',
      perk: 'صقل مهارات أعضاء اللجان الطلابية',
    },
    {
      number: '4',
      name: 'الرضا',
      arabicName: 'مكتبات الرضا',
      category: 'راعي الطباعة والخدمات الطلابية',
      icon: BookOpen,
      desc: 'الراعي والداعم الموثوق لجميع المطبوعات الرسمية، كتيبات المشاريع، البانرات التعريفية، والمواد الترويجية لفعاليات إيناكوس قنا.',
      perk: 'تجهيز المطبوعات والمواد الإعلانية',
    },
  ];

  return (
    <section id="partnerships" style={{ padding: '110px 0', position: 'relative' }}>
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge-gold">
              <Handshake size={14} />
              PARTNERSHIPS & SPONSORS
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(2.1rem, 4vw, 3.2rem)', fontWeight: 900, marginBottom: '1rem' }}>
            شراكات ورعايات تصنع الفارق: <span className="gold-gradient-text">معاً لأثر أكبر وأشمل</span>
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#b5b5c6', lineHeight: 1.8 }}>
            نؤمن في <strong>Enactus Qena</strong> أن تحقيق الاستدامة والريادة يحتاج إلى تكاتف الخبرات. نعتز بشراكاتنا الاستراتيجية ورعاتنا الرسميين الداعمين لمسيرة طلاب جامعة جنوب الوادي نحو العالمية.
          </p>
        </div>

        {/* Strategic Partnerships Section */}
        <div style={{ marginBottom: '5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '2rem' }}>
            <Sparkles size={20} color="#ffb800" />
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: 0 }}>
              الشراكات الاستراتيجية الكبرى (Partnership Announcements)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {strategicPartners.map((partner, idx) => (
              <div
                key={partner.id}
                className="glass-panel gold-border-glow card-shine responsive-panel-p"
                style={{
                  borderRadius: '24px',
                  overflow: 'hidden',
                  padding: '2.5rem',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: idx % 2 === 0 ? '1.1fr 0.9fr' : '0.9fr 1.1fr',
                    gap: '2.5rem',
                    alignItems: 'center',
                  }}
                  className="partner-card-grid"
                >
                  {/* Visual Preview */}
                  <div
                    className="partner-img-wrapper"
                    style={{
                      borderRadius: '18px',
                      overflow: 'hidden',
                      boxShadow: '0 15px 40px rgba(0, 0, 0, 0.7)',
                      position: 'relative',
                      order: idx % 2 === 0 ? 1 : 2,
                      background: '#090a0f',
                    }}
                  >
                    <img
                      src={partner.image}
                      alt={partner.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: '420px' }}
                    />
                  </div>

                  {/* Text Details */}
                  <div style={{ order: idx % 2 === 0 ? 2 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      <span className="badge-gold font-cinzel">{partner.badge}</span>
                      <span style={{ color: '#ffb800', fontSize: '0.82rem', fontWeight: 600 }}>{partner.slogan}</span>
                    </div>

                    <h3 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', marginBottom: '0.35rem' }}>
                      {partner.name}
                    </h3>
                    <div style={{ fontSize: '0.95rem', color: '#ffb800', fontWeight: 700, marginBottom: '1.25rem' }}>
                      {partner.englishName}
                    </div>

                    <p style={{ fontSize: '1.02rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
                      {partner.desc}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                      {partner.points.map((pt, pIdx) => (
                        <div key={pIdx} className="partner-point-row" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem' }}>
                          <CheckCircle2 size={18} color="#ffb800" style={{ flexShrink: 0 }} />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>

                    <a
                      href="https://www.facebook.com/Enactus.svu"
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary"
                      style={{ fontSize: '0.92rem', padding: '0.75rem 1.6rem' }}
                    >
                      <ExternalLink size={16} />
                      <span>{partner.linkText}</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MEET OUR SPONSORS Showcase (from Image: Meet Our Sponsors) */}
        <div style={{ marginBottom: '4.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge-gold font-cinzel" style={{ marginBottom: '0.75rem' }}>
              MEET OUR SPONSORS
            </span>
            <h3 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', fontWeight: 900, color: '#fff' }}>
              رعاة النجاح.. <span className="gold-gradient-text">شركاء المسيرة والتميز</span>
            </h3>
            <p style={{ color: '#a5a5b8', fontSize: '1rem', maxWidth: '650px', margin: '0.5rem auto 0 auto' }}>
              نقدم لكم الرعاة الرسميين الذين يقدمون الدعم اللوجستي، التدريبي، والخدمي لكتيبة إيناكوس قنا:
            </p>
          </div>

          {/* Official Sponsor Graphic Banner Poster */}
          <div
            className="glass-panel gold-border-glow card-shine sponsor-banner-grid responsive-panel-p"
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              marginBottom: '3rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              alignItems: 'center',
              padding: '1.5rem',
            }}
          >
            <div style={{ borderRadius: '18px', overflow: 'hidden', boxShadow: '0 12px 35px rgba(0,0,0,0.8)' }}>
              <img
                src="/assets/sponsors_list.png"
                alt="Meet Our Sponsors - Enactus Qena"
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              />
            </div>

            <div style={{ padding: '1rem' }}>
              <span className="badge-gold" style={{ marginBottom: '0.75rem' }}>
                SPONSORSHIP COHORTS
              </span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>
                دعم متكامل يعزز جاهزية الفريق
              </h4>
              <p style={{ lineHeight: 1.8, fontSize: '1rem', marginBottom: '1.5rem' }}>
                يقف وراء إيناكوس قنا شبكة قوية من الرعاة المحليين الذين يؤمنون بقدرات شباب الصعيد: بدءاً من استضافة اللقاءات مع <strong>VERANDA</strong>، والتدريب الاحترافي مع <strong>الاتحاد العربي للتدريب والتنمية</strong>، وتنمية المهارات مع <strong>الأوائل</strong>، وحتى الدعم المكتبي والمطبوعات مع <strong>مكتبات الرضا</strong>.
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span className="badge-gold">✓ ضيافة</span>
                <span className="badge-gold">✓ تدريب معتمد</span>
                <span className="badge-gold">✓ تنمية مهارات</span>
                <span className="badge-gold">✓ طباعة ونشر</span>
              </div>
            </div>
          </div>

          {/* 4 Sponsors Grid Cards */}
          <div className="grid-4">
            {sponsors.map((sp) => {
              const Icon = sp.icon;
              return (
                <div
                  key={sp.number}
                  className="glass-panel gold-glow-hover card-shine responsive-card-p"
                  style={{
                    borderRadius: '20px',
                    padding: '2rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                  }}
                >
                  {/* Top Number & Icon */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.25), rgba(212, 136, 0, 0.08))',
                          border: '1.5px solid rgba(255, 184, 0, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffb800',
                        }}
                      >
                        <Icon size={24} />
                      </div>

                      <div
                        className="font-cinzel"
                        style={{
                          fontSize: '1.8rem',
                          fontWeight: 900,
                          color: 'rgba(255, 184, 0, 0.4)',
                        }}
                      >
                        0{sp.number}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#ffb800', fontWeight: 700, marginBottom: '0.3rem' }}>
                      {sp.category}
                    </div>

                    <h4 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginBottom: '0.25rem' }}>
                      {sp.arabicName}
                    </h4>
                    <div className="font-outfit" style={{ fontSize: '0.85rem', color: '#ffd54f', fontWeight: 700, marginBottom: '0.85rem' }}>
                      {sp.name}
                    </div>

                    <p style={{ fontSize: '0.88rem', color: '#a5a5b6', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                      {sp.desc}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px dashed rgba(255, 184, 0, 0.25)', paddingTop: '0.85rem' }}>
                    <div style={{ fontSize: '0.78rem', color: '#ffd54f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Star size={14} color="#ffb800" />
                      <span>{sp.perk}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call for Sponsorship & Partnerships */}
        <div
          className="glass-panel responsive-panel-p"
          style={{
            borderRadius: '24px',
            padding: '2.5rem',
            textAlign: 'center',
            border: '1px dashed rgba(255, 184, 0, 0.4)',
          }}
        >
          <Building2 size={40} color="#ffb800" style={{ margin: '0 auto 1rem auto' }} />
          <h4 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.6rem)', fontWeight: 800, color: '#fff', marginBottom: '0.6rem' }}>
            هل ترغب مؤسستك أو شركتك في رعاية كتيبة إيناكوس قنا؟
          </h4>
          <p style={{ color: '#b5b5c6', maxWidth: '720px', margin: '0 auto 1.75rem auto', fontSize: '1rem', lineHeight: 1.8 }}>
            نرحب بكل شراكة تسهم في تمكين شباب جامعة جنوب الوادي وإبراز مشاريع الصعيد التنموية في المحافل الكبرى. تواصل معنا لبحث فرص الرعاية والتعاون المشترك.
          </p>
          <a
            href="https://www.facebook.com/Enactus.svu"
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ fontSize: '1rem', padding: '0.85rem 2rem' }}
          >
            <Mail size={18} />
            <span>تواصل مع مسؤولي العلاقات العامة (PR)</span>
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .partner-card-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .partner-img-wrapper {
            order: 1 !important;
          }
          .partner-img-wrapper + div {
            order: 2 !important;
          }
          .sponsor-banner-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
        }
      `}</style>
    </section>
  );
}
