import React, { useState } from 'react';
import { Handshake, Building2, CheckCircle2, Mail, ExternalLink, Sparkles, Star, Coffee, GraduationCap, Target, BookOpen } from 'lucide-react';
import { usePartners } from '../hooks/usePublicContent';
import { useLanguage } from '../context/LanguageContext';

export default function Partnerships() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { data: dbPartners } = usePartners();

  const defaultStrategicPartners = [
    {
      id: 'arab-union',
      name: isAr ? 'الاتحاد العربي للتدريب والتعليم الموازي' : 'Arab Union for Training & Education',
      englishName: 'Arab Union for Training & Parallel Education',
      badge: isAr ? 'شريك استراتيجي وتدريبي' : 'Strategic Training Partner',
      slogan: 'Together, We Create Greater Impact',
      image: '/assets/partner_arab_union.png',
      desc: isAr
        ? 'بروتوكول تعاون وشراكة تدريبية كبرى لدعم كتيبة إيناكوس قنا من خلال توفير الورش المعتمدة، الاستشارات المتخصصة لرواد الأعمال، وتمكين أعضاء اللجان بالشهادات المهنية.'
        : 'Major partnership and training protocol supporting Enactus Qena by offering certified workshops, startup mentoring, and professional accreditations.',
      points: isAr
        ? [
            'تقديم برامج تدريبية معتمدة لأعضاء إيناكوس',
            'دعم المشاريع التنموية بالاستشارات الفنية',
            'تسهيل مشاركة الطلاب في الفعاليات والمؤتمرات الكبرى',
          ]
        : [
            'Certified training programs for Enactus members',
            'Technical advisory and feasibility consultations',
            'Facilitating student participation in national forums',
          ],
      linkText: isAr ? 'تفاصيل بروتوكول الشراكة' : 'Partnership Details',
    },
    {
      id: 'yafa',
      name: isAr ? 'يافا للتسويق والبرمجيات' : 'Yafa for Marketing & Software',
      englishName: 'Yafa for Marketing & Software Solutions',
      badge: isAr ? 'شريك التسويق الرقمي' : 'Digital Marketing Partner',
      slogan: 'Empowering Digital Presence',
      image: '/assets/E4.jpg',
      desc: isAr
        ? 'شراكة استراتيجية لنقل خبرات التسويق الرقمي وإدارة الحملات الإعلانية وصناعة المحتوى الإبداعي لشباب إيناكوس قنا وتطوير الهوية الرقمية للمشاريع المجتمعية.'
        : 'Strategic collaboration transferring advanced digital marketing and software consulting to Enactus Qena ventures.',
      points: isAr
        ? [
            'إدارة الحملات التسويقية الممولة للمشاريع',
            'ورش عمل متقدمة في الـ SEO والـ Growth Hacking',
            'تطوير الحلول البرمجية لرواد الأعمال',
          ]
        : [
            'Digital ad campaigns and marketing management',
            'Advanced growth hacking and SEO workshops',
            'Software development advisory for startups',
          ],
      linkText: isAr ? 'تفاصيل الشراكة التسويقية' : 'Marketing Partnership Details',
    },
  ];

  const strategicList =
    dbPartners && Array.isArray(dbPartners) && dbPartners.length > 0
      ? dbPartners.filter((p) => (p.kind === 'strategic' || p.tier === 'strategic') && p.is_visible !== false)
      : [];

  const strategicPartners =
    strategicList.length > 0
      ? strategicList.map((p, idx) => {
          const fallback = defaultStrategicPartners[idx] || defaultStrategicPartners[0];
          return {
            id: p.id,
            name: p.name || fallback.name,
            englishName: p.englishName || fallback.englishName,
            badge: p.tier ? (isAr ? `شريك (${p.tier})` : `${p.tier} Partner`) : (fallback.badge),
            slogan: p.description ? (p.description.length > 60 ? p.description.slice(0, 58) + '...' : p.description) : fallback.slogan,
            image: p.cover || p.logo || fallback.image,
            desc: p.description || fallback.desc,
            points: fallback.points || [],
            linkText: fallback.linkText,
          };
        })
      : defaultStrategicPartners;

  const defaultSponsors = [
    {
      number: '1',
      name: 'VERANDA',
      arabicName: isAr ? 'فراندة - كافيه ومطعم' : 'VERANDA Cafe & Restaurant',
      category: isAr ? 'راعي الضيافة والملتقيات' : 'Hospitality & Venues',
      icon: Coffee,
      desc: isAr
        ? 'الوجهة الراقية في قنا وراعي استضافة اجتماعات القادة، جلسات العصف الذهني، وفعاليات الـ Team Building لكتيبة إيناكوس قنا.'
        : 'The premier hospitality destination in Qena hosting leadership brainstorms and team summits.',
      perk: isAr ? 'استضافة الفعاليات ولقاءات الفريق' : 'Event and team summit hosting',
    },
    {
      number: '2',
      name: isAr ? 'الاتحاد العربي للتدريب والتنمية' : 'Arab Union for Training',
      arabicName: isAr ? 'الاتحاد العربي' : 'Arab Union',
      category: isAr ? 'الراعي الأكاديمي والتدريبي' : 'Academic & Training Sponsor',
      icon: GraduationCap,
      desc: isAr
        ? 'المظلة التدريبية الكبرى الداعمة لشباب الصعيد من خلال ورش العمل الاحترافية والاستشارات التنموية لرواد الأعمال.'
        : 'Leading training umbrella providing certified workshops and development guidance for youth.',
      perk: isAr ? 'تطوير الكوادر والاعتمادات التدريبية' : 'Certifications & professional development',
    },
    {
      number: '3',
      name: isAr ? 'الأوائل لتنمية المهارات' : 'Al-Awael Skills Center',
      arabicName: isAr ? 'الأوائل' : 'Al-Awael',
      category: isAr ? 'راعي تطوير وتنمية المهارات' : 'Skills Development Sponsor',
      icon: Target,
      desc: isAr
        ? 'صرح تنموي بارز في قنا يركز على صقل مهارات الشباب في مجالات التواصل، التفكير الإبداعي، وإدارة فرق العمل.'
        : 'Prominent development academy focusing on communication, creative thinking, and teamwork skills.',
      perk: isAr ? 'صقل مهارات أعضاء اللجان الطلابية' : 'Soft skills mastery & workshops',
    },
    {
      number: '4',
      name: isAr ? 'مكتبات الرضا' : 'Al-Reda Printing & Books',
      arabicName: isAr ? 'الرضا' : 'Al-Reda',
      category: isAr ? 'راعي الطباعة والخدمات الطلابية' : 'Print & Collateral Sponsor',
      icon: BookOpen,
      desc: isAr
        ? 'الراعي والداعم الموثوق لجميع المطبوعات الرسمية، كتيبات المشاريع، البانرات التعريفية، والمواد الترويجية لفعاليات إيناكوس قنا.'
        : 'Trusted printing partner producing official event booklets, project briefs, banners, and materials.',
      perk: isAr ? 'تجهيز المطبوعات والمواد الإعلانية' : 'Event print collateral & exhibition banners',
    },
  ];

  const sponsorsList =
    dbPartners && Array.isArray(dbPartners) && dbPartners.length > 0
      ? dbPartners.filter((p) => p.kind !== 'strategic' && p.tier !== 'strategic' && p.is_visible !== false)
      : [];

  const sponsors =
    sponsorsList.length > 0
      ? sponsorsList.map((sp, idx) => {
          const fallback = defaultSponsors[idx] || defaultSponsors[0];
          const Icon = fallback.icon || Coffee;
          return {
            id: sp.id,
            number: String(idx + 1),
            name: sp.name || fallback.name,
            arabicName: sp.name || fallback.arabicName,
            category: sp.tier ? (isAr ? `راعي (${sp.tier})` : `${sp.tier} Sponsor`) : fallback.category,
            icon: Icon,
            desc: sp.description || fallback.desc,
            perk: sp.description ? (sp.description.length > 50 ? sp.description.slice(0, 48) + '...' : sp.description) : fallback.perk,
            logo: sp.logo || sp.cover || '',
            website: sp.website || '',
          };
        })
      : defaultSponsors;

  return (
    <section id="partners" style={{ padding: '110px 0', position: 'relative' }}>
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge-gold">
              <Handshake size={14} />
              STRATEGIC ALLIANCES & SPONSORS
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(2.1rem, 4vw, 3.2rem)', fontWeight: 900, marginBottom: '1.25rem' }}>
            {isAr ? (
              <>
                شركاء النجاح والرعاة: <span className="gold-gradient-text">معاً نصنع أثراً أعظم!</span>
              </>
            ) : (
              <>
                Partners & Sponsors: <span className="gold-gradient-text">Together, We Create Greater Impact!</span>
              </>
            )}
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#b5b5c6', lineHeight: 1.8 }}>
            {isAr
              ? 'نؤمن أن تحقيق الأثر الحقيقي يتطلب تكاتف الجهود بين الشباب، المؤسسات الأكاديمية، والقطاع الخاص. نفخر بشبكة داعمينا الذين يشاركوننا حلم النهوض بصعيد مصر.'
              : 'We believe real impact requires uniting youth ambition with visionary academic and corporate sponsors. We proudly showcase the partners powering our journey in Upper Egypt.'}
          </p>
        </div>

        {/* Strategic Partners Showcase */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginBottom: '5.5rem' }}>
          {strategicPartners.map((partner, idx) => (
            <div
              key={partner.id || idx}
              className="glass-panel gold-border-glow card-shine responsive-panel-p strategic-partner-grid"
              style={{
                borderRadius: '24px',
                padding: '2.5rem',
                textAlign: isAr ? 'right' : 'left',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="badge-gold">
                    <Star size={13} fill="#ffd54f" />
                    {partner.badge}
                  </span>
                  <span className="font-cinzel" style={{ fontSize: '0.78rem', color: '#ffb800', letterSpacing: '0.05em' }}>
                    {partner.slogan}
                  </span>
                </div>

                <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', lineHeight: 1.3 }}>
                  {partner.name}
                </h3>

                <p style={{ color: '#c5c5d6', fontSize: '1rem', lineHeight: 1.75, marginBottom: '1.75rem' }}>
                  {partner.desc}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2rem' }}>
                  {partner.points.map((pt, pIdx) => (
                    <div key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.92rem', color: '#e0e0ec' }}>
                      <CheckCircle2 size={16} color="#ffb800" style={{ flexShrink: 0 }} />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic Poster Image */}
              <div
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(255, 184, 0, 0.2)',
                  maxHeight: '400px',
                }}
              >
                <img
                  src={partner.image}
                  alt={partner.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Official Sponsors Cohort Section */}
        <div style={{ marginBottom: '4rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge-gold font-cinzel" style={{ marginBottom: '0.5rem' }}>
              OFFICIAL SPONSORSHIP NETWORK
            </span>
            <h3 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', fontWeight: 900, color: '#fff' }}>
              {isAr ? 'رعاة إيناكوس قنا الرسميون' : 'Enactus Qena Official Sponsors'}
            </h3>
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
                    textAlign: isAr ? 'right' : 'left',
                  }}
                >
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
                          overflow: 'hidden',
                          padding: sp.logo ? '6px' : '0',
                        }}
                      >
                        {sp.logo ? (
                          <img
                            src={sp.logo}
                            alt={sp.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <Icon size={24} />
                        )}
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

                    <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>
                      {sp.name}
                    </h4>

                    <p style={{ fontSize: '0.88rem', color: '#a0a0b2', lineHeight: 1.6, margin: 0 }}>
                      {sp.desc}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem', marginTop: '1.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#ffd54f', fontWeight: 600 }}>
                      ✓ {sp.perk}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call for Sponsorship Box */}
        <div
          className="glass-panel card-shine"
          style={{
            borderRadius: '24px',
            padding: '2.5rem',
            textAlign: 'center',
            border: '1.5px dashed rgba(255, 184, 0, 0.4)',
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.06), rgba(0, 0, 0, 0.4))',
          }}
        >
          <Building2 size={36} color="#ffb800" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
            {isAr ? 'هل ترغب في أن تصبح شريكاً أو راعياً لكتيبة إيناكوس قنا؟' : 'Interested in Partnering or Sponsoring Enactus Qena?'}
          </h3>
          <p style={{ fontSize: '0.98rem', color: '#a5a5b8', maxWidth: '620px', margin: '0 auto 1.5rem auto', lineHeight: 1.7 }}>
            {isAr
              ? 'نوفر باقات رعاية متنوعة تمنح علامتك التجارية وصولاً مباشراً لآلاف الطلاب والقيادات ورواد الأعمال، مع حضور إعلامي بارز في كبرى المسابقات الوطنية.'
              : 'We provide versatile sponsorship tiers granting your brand direct exposure to thousands of university students, startup leaders, and executive judges.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href="mailto:partnerships@enactus-qena.org"
              className="btn-primary"
              style={{ fontSize: '0.95rem', padding: '0.75rem 1.75rem' }}
            >
              <Mail size={16} />
              <span>{isAr ? 'تواصل مع فريق العلاقات العامة' : 'Contact PR Team'}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
