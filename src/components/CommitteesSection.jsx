import React, { useState } from 'react';
import { Megaphone, Camera, BarChart3, Calendar, Users, Mic, Share2, Sparkles, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCommittees } from '../hooks/usePublicContent';
import { useLanguage } from '../context/LanguageContext';

export default function CommitteesSection({ onOpenJoinModal }) {
  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const { data: dbCommittees } = useCommittees();

  const defaultCommittees = [
    {
      id: 'pm',
      code: 'PM',
      name: 'Project Management',
      arabicName: 'إدارة المشاريع التنموية',
      icon: BarChart3,
      badge: isAr ? 'القلب النابض للحلول' : 'Core Engine of Innovation',
      mascotDesc: isAr ? 'الفرعون صاحب التابلت الرقمي وخرائط الأثر' : 'The Pharaoh with digital tablet & impact maps',
      role: isAr
        ? 'العقل المفكر والمسؤول عن ابتكار وتطوير مشاريع ريادة الأعمال المجتمعية التي تحل مشاكل حقيقية في صعيد مصر وتلبي أهداف التنمية المستدامة (SDGs).'
        : 'The think tank responsible for conceptualizing and executing sustainable social enterprises that solve critical challenges in Upper Egypt.',
      skills: isAr
        ? [
            'أبحاث السوق والنزول الميداني للقرى',
            'دراسات الجدوى الاقتصادية والمالية',
            'تطبيق معايير استدامة إيناكوس العالمية',
            'إدارة سلاسل الإمداد والتشغيل للمشاريع',
          ]
        : [
            'Market research & village fieldwork',
            'Financial and feasibility modeling',
            'Global Enactus impact metrics (SDGs)',
            'Operations & supply chain management',
          ],
      quote: isAr
        ? '"نحن لا نحلم فقط بالمستقبل.. بل نصممه ونبنيه بأيدينا."'
        : '"We do not merely imagine the future; we engineer and build it."',
    },
    {
      id: 'multimedia',
      code: 'MULTI MEDIA',
      name: 'MultiMedia & Creative',
      arabicName: 'المالتي ميديا والتصميم',
      icon: Camera,
      badge: isAr ? 'مهندسو الهوية البصرية' : 'Visual Identity Masters',
      mascotDesc: isAr ? 'الفرعون المبدع بالنظارات والكاميرا الذهبية' : 'The Creative Pharaoh with golden camera & specs',
      role: isAr
        ? 'الفنانون وراء كل بوستر، فيديو، وهوية بصرية تخطف الأنظار كما رأيتم في حملات إيناكوس قنا الأسطورية من خلال التصميم ثلاثي الأبعاد وصناعة الأفلام.'
        : 'The artists behind every viral poster, 3D visual, and cinematic film defining Enactus Qena legendary identity and national stage appearances.',
      skills: isAr
        ? [
            'تصميم الجرافيك والـ Branding (Photoshop, Illustrator)',
            'صناعة وتعديل الفيديو والموشن جرافيك (Premiere, After Effects)',
            'التصوير الفوتوغرافي والسينمائي للفعاليات',
            'التصميم ثلاثي الأبعاد وإخراج الحملات الإعلانية',
          ]
        : [
            'Brand design & visuals (Photoshop, Illustrator)',
            'Video production & motion graphics (Premiere, AE)',
            'Cinematography & event documentary',
            '3D rendering & viral campaign art direction',
          ],
      quote: isAr
        ? '"نحول الأفكار المجردة إلى تحف بصرية تخلّد في الذاكرة."'
        : '"Transforming abstract concepts into unforgettable visual masterpieces."',
    },
    {
      id: 'pr',
      code: 'PR',
      name: 'Public Relations',
      arabicName: 'العلاقات العامة والشراكات',
      icon: Megaphone,
      badge: isAr ? 'صوت الكيان وسفراء الرؤية' : 'Voice of the Battalion',
      mascotDesc: isAr ? 'الفرعون صاحب الميكروفون الذهبي والغمزة الواثقة' : 'The Pharaoh with golden mic & confident grin',
      role: isAr
        ? 'الواجهة الرسمية لإيناكوس قنا أمام المجتمع والشركات؛ المسؤولون عن جلب الرعايات (Sponsorships)، عقد الشراكات الاستراتيجية، وإدارة التغطية الإعلامية.'
        : 'The official ambassadors bridging Enactus Qena with industry, sponsors, media, and regional business leaders to secure partnerships.',
      skills: isAr
        ? [
            'مهارات التفاوض والإقناع رفيعة المستوى',
            'إعداد وتوقيع بروتوكولات التعاون والرعايات',
            'بناء شبكة علاقات مع رجال الأعمال والشركات',
            'التحدث الرسمي وإدارة الظهور الإعلامي',
          ]
        : [
            'High-stakes negotiation and persuasion',
            'Corporate sponsorship proposals & agreements',
            'Strategic networking & stakeholder relations',
            'Media appearances and press representation',
          ],
      quote: isAr
        ? '"نبني جسور الثقة مع العالم وننقل صوت قنا لأبعد مدى."'
        : '"Building bridges of trust to amplify Qena\'s voice across borders."',
    },
    {
      id: 'hr',
      code: 'HR',
      name: 'Human Resources',
      arabicName: 'الموارد البشرية والتدريب',
      icon: Users,
      badge: isAr ? 'حراس بيئة العمل والتحفيز' : 'Guardians of Culture',
      mascotDesc: isAr ? 'الفرعون صاحب سجلات الكفاءة والقلب الدافئ' : 'The Pharaoh with talent scrolls & warm presence',
      role: isAr
        ? 'حراس الطاقة الإيجابية في الفريق؛ المسؤولون عن استقطاب الكفاءات، تنظيم المقابلات الشخصية، متابعة أداء وتقييم الأعضاء، وتقديم التدريبات المستمرة.'
        : 'The custodians of battalion morale; leading recruitment, talent interviews, evaluations, points ledger, and continuous capacity building.',
      skills: isAr
        ? [
            'إجراء المقابلات الشخصية وتقييم الكفاءات (Interviewing)',
            'تنظيم خطط التدريب والـ Team Building',
            'حل النزاعات وإدارة تحفيز الأفراد والفرق',
            'إدارة البيانات وملفات تقييم الأداء والمكافآت',
          ]
        : [
            'Competency-based interviews and talent scouting',
            'Designing training programs & team-building events',
            'Conflict resolution & motivational coaching',
            'HR analytics, evaluations, and recognition programs',
          ],
      quote: isAr
        ? '"نجاح أي كيان يبدأ من إيمانه الصادق بقدرات أفراده."'
        : '"An organization\'s victory begins with profound faith in its people."',
    },
    {
      id: 'oc',
      code: 'OC',
      name: 'Organizing Committee',
      arabicName: 'اللجنة المنظمة واللوجستيات',
      icon: Calendar,
      badge: isAr ? 'جنود الميدان وصناع اللحظة' : 'Field Generals',
      mascotDesc: isAr ? 'الفرعون صاحب ساعة التوقيت وسماعة اللاسلكي' : 'The Pharaoh with stopwatch & walkie-talkie',
      role: isAr
        ? 'القوة التنفيذية على الأرض؛ المسؤولون عن هندسة وتجهيز قاعات المؤتمرات، إدارة الحشود، تنظيم الجداول الزمنية، وضمان خروج كل فعالية بمستوى عالمي.'
        : 'The operational force on the ground; managing event venues, crowd logistics, schedules, and ensuring flawless execution for every public conference.',
      skills: isAr
        ? [
            'التخطيط اللوجستي وإدارة المسارح والقاعات',
            'التحكم في تدفق الحضور وإدارة الأزمات الميدانية',
            'الالتزام الصارم بإدارة الوقت وجداول الفعاليات',
            'التنسيق السريع والعمل الميداني تحت أعلى ضغط',
          ]
        : [
            'Venue logistics & stage management',
            'Crowd control & emergency contingency',
            'Strict adherence to schedules and timelines',
            'High-pressure execution and rapid problem-solving',
          ],
      quote: isAr
        ? '"في الميدان، الثانية تصنع الفارق.. ونحن أسياد التوقيت."'
        : '"On the ground, seconds make history.. and we master timing."',
    },
    {
      id: 'presentation',
      code: 'PRESENTATION',
      name: 'Presentation & Speaking',
      arabicName: 'العرض التقديمي والمنصة',
      icon: Mic,
      badge: isAr ? 'فرسان المسرح وصوت المنصة' : 'Stage Orators',
      mascotDesc: isAr ? 'الفرعون صاحب الرداء الملكي والخطاب البليغ' : 'The Pharaoh with regal poise & persuasive rhetoric',
      role: isAr
        ? 'فرسان المنصة الذين يمثلون جامعة جنوب الوادي أمام لجان تحكيم المسابقة الوطنية من كبار الرؤساء التنفيذيين في مصر، لإقناعهم بمشاريعنا والتتويج بالبطولة.'
        : 'The stage orators representing South Valley University before corporate executive judges at the National Competition, delivering winning pitches.',
      skills: isAr
        ? [
            'الإلقاء والخطابة العامة والتأثير الصوتي (Public Speaking)',
            'إتقان اللغة الإنجليزية التخصصية والعرض المسرحي',
            'الثقة الاستثنائية والوقوف أمام المئات ولجان التحكيم',
            'السرعة والذكاء في الإجابة على أسئلة لجان التحكيم (Q&A)',
          ]
        : [
            'Persuasive storytelling & vocal modulation',
            'Professional English pitch delivery & stage posture',
            'Supreme poise before hundreds of executive judges',
            'Sharp real-time defense during judge Q&A rounds',
          ],
      quote: isAr
        ? '"على المسرح، نحول الأرقام إلى شغف، والمشاريع إلى إلهام."'
        : '"On stage, we turn numbers into passion and projects into inspiration."',
    },
  ];

  const committees =
    dbCommittees && Array.isArray(dbCommittees) && dbCommittees.length > 0
      ? dbCommittees
          .filter((c) => c.is_active !== false && c.is_visible !== false)
          .map((match, idx) => {
            const fallback =
              defaultCommittees.find(
                (d) => d.id === match.slug || d.code?.toLowerCase() === match.code?.toLowerCase()
              ) || defaultCommittees[idx] || defaultCommittees[0];
            return {
              ...fallback,
              id: match.slug || fallback.id,
              code: match.code || fallback.code,
              name: match.name || fallback.name,
              arabicName: match.arabicName || fallback.arabicName,
              mascotDesc: match.mascotDesc || fallback.mascotDesc,
              role: match.brief || match.description || fallback.role,
              quote: match.quote || fallback.quote,
              skills: Array.isArray(match.skillsGained) && match.skillsGained.length > 0
                ? match.skillsGained
                : fallback.skills,
            };
          })
      : defaultCommittees;

  return (
    <section id="committees" style={{ padding: '110px 0', position: 'relative' }}>
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Section Top Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3.5rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge-gold">
              <Sparkles size={14} />
              ONE TEAM • ONE GOAL
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(2.1rem, 4vw, 3.2rem)', fontWeight: 900, marginBottom: '1rem' }}>
            {isAr ? (
              <>
                كتيبة الفراعنة: <span className="gold-gradient-text">أدوار مختلفة، ومهمة واحدة</span>
              </>
            ) : (
              <>
                Pharaohs Battalion: <span className="gold-gradient-text">Diverse Roles, One Mission</span>
              </>
            )}
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#b5b5c6', lineHeight: 1.8 }}>
            {isAr
              ? 'في إيناكوس جامعة جنوب الوادي، كل لجنة هي حجر زاوية في صرح الأثر الشامخ. اختر اللقب الذي يتناسب مع شغفك وقدراتك لتترك بصمتك مع فريق العظماء:'
              : 'At Enactus South Valley University, every committee is a cornerstone of our enduring impact. Choose your role and unleash your true potential with the team:'}
          </p>
        </div>

        {/* Master Mascot Showcase Poster Image */}
        <div
          className="glass-panel gold-border-glow card-shine mascot-banner-card"
          style={{
            borderRadius: '24px',
            padding: '1.5rem',
            marginBottom: '4rem',
          }}
        >
          <div className="mascot-banner-grid">
            {/* Visual */}
            <div
              style={{
                borderRadius: '18px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 15px 40px rgba(0,0,0,0.7)',
                maxHeight: '440px',
              }}
            >
              <img
                src="/assets/E6.jpg"
                alt="Enactus Qena One Team One Goal Pharaoh Characters"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Content beside poster */}
            <div style={{ textAlign: isAr ? 'right' : 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="badge-gold font-cinzel">ONE LEGACY</span>
                <span style={{ color: '#ffb800', fontSize: '0.85rem' }}>Different Roles. Same Mission.</span>
              </div>

              <h3 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>
                {isAr ? 'كتيبة موحدة تصنع فارقاً أسطورياً!' : 'A United Battalion Making Legendary Impact!'}
              </h3>

              <p style={{ color: '#c2c2d4', lineHeight: 1.8, fontSize: '1.02rem', marginBottom: '1.5rem' }}>
                {isAr ? (
                  <>
                    منسقو المشاريع، مصممو الإبداع، رجال العلاقات العامة، منظّمو الميدان، حراس الموارد البشرية، وفرسان المنصة.. معاً نشكل عائلة واحدة تعمل بتناغم كامل لتحقيق هدف واحد: <strong>رفع اسم قنا وجامعة جنوب الوادي عالياً في كل محفل.</strong>
                  </>
                ) : (
                  <>
                    Project planners, visual creatives, PR strategists, field coordinators, HR guardians, and stage orators.. Together, we form one family dedicated to a single mission: <strong>elevating Qena and South Valley University on the national and global stage.</strong>
                  </>
                )}
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => onOpenJoinModal()}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}
                >
                  <Sparkles size={16} />
                  <span>{isAr ? 'انضم إلى إحدى اللجان' : 'Join a Committee'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Committees Interactive Cards Grid */}
        <div className="grid-3" style={{ marginBottom: '3rem' }}>
          {committees.map((comm) => {
            const Icon = comm.icon;
            const isSelected = selectedCommittee?.id === comm.id;
            const primaryTitle = isAr ? comm.arabicName : comm.name;
            const secondaryTitle = isAr ? comm.name : comm.arabicName;

            return (
              <div
                key={comm.id}
                onClick={() => setSelectedCommittee(comm)}
                className="glass-panel gold-glow-hover card-shine responsive-card-p"
                style={{
                  borderRadius: '20px',
                  padding: '2rem 1.6rem',
                  cursor: 'pointer',
                  border: isSelected
                    ? '2px solid #ffb800'
                    : '1px solid rgba(255, 184, 0, 0.2)',
                  background: isSelected
                    ? 'rgba(30, 32, 45, 0.95)'
                    : 'rgba(16, 17, 24, 0.75)',
                  boxShadow: isSelected
                    ? '0 15px 40px rgba(255, 184, 0, 0.35)'
                    : '0 8px 25px rgba(0, 0, 0, 0.4)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
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
                        border: '1px solid rgba(255, 184, 0, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffb800',
                      }}
                    >
                      <Icon size={24} />
                    </div>
                    <span className="badge-gold font-cinzel" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                      {comm.code}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>
                    {primaryTitle}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#ffb800', fontWeight: 700, marginBottom: '0.85rem' }}>
                    {secondaryTitle}
                  </div>

                  <p className="comm-role-text" style={{ fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                    {comm.role}
                  </p>
                </div>

                <div>
                  <div className="comm-quote-box" style={{ background: 'rgba(255, 184, 0, 0.07)', padding: '0.65rem 0.85rem', borderRadius: '10px', marginBottom: '1rem', border: '1px dashed rgba(255, 184, 0, 0.25)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ffd54f', fontStyle: 'italic' }}>
                      {comm.quote}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="comm-details-link" style={{ fontSize: '0.82rem', color: '#ffd54f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>{isAr ? 'عرض التفاصيل' : 'View Details'}</span>
                      <ArrowIcon size={14} />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenJoinModal(primaryTitle);
                      }}
                      className="btn-primary"
                      style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                    >
                      {isAr ? 'قدّم للجنة' : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Committee Details Modal */}
        {selectedCommittee && (
          <div
            className="glass-panel gold-border-glow responsive-panel-p"
            style={{
              borderRadius: '24px',
              padding: '2.5rem',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              textAlign: isAr ? 'right' : 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge-gold font-cinzel">{selectedCommittee.code}</span>
                  <span className="badge-gold">{selectedCommittee.badge}</span>
                </div>
                <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: '#fff', marginBottom: '0.25rem' }}>
                  {isAr ? `${selectedCommittee.arabicName} (${selectedCommittee.name})` : `${selectedCommittee.name} (${selectedCommittee.arabicName})`}
                </h3>
                <p style={{ color: '#ffb800', margin: 0, fontSize: '0.92rem', fontWeight: 600 }}>
                  {isAr ? 'الشخصية الفرعونية:' : 'Pharaonic Mascot:'} {selectedCommittee.mascotDesc}
                </p>
              </div>

              <div className="comm-modal-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => onOpenJoinModal(isAr ? selectedCommittee.arabicName : selectedCommittee.name)}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.6rem' }}
                >
                  <Sparkles size={18} />
                  <span>{isAr ? 'سجّل في هذه اللجنة الآن' : 'Apply to Committee'}</span>
                </button>
                <button
                  onClick={() => setSelectedCommittee(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 184, 0, 0.15)' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#ffd54f', marginBottom: '0.75rem', fontWeight: 800 }}>
                  {isAr ? 'ماذا ستكتسب وتتعلم في هذه اللجنة؟' : 'What Will You Learn & Gain?'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {selectedCommittee.skills.map((skill, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', color: '#e0e0ea' }}>
                      <CheckCircle2 size={16} color="#ffb800" style={{ flexShrink: 0 }} />
                      <span>{skill}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 184, 0, 0.15)' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#ffd54f', marginBottom: '0.75rem', fontWeight: 800 }}>
                  {isAr ? 'رسالة اللجنة لأعضاء الكتيبة:' : 'Committee Message to the Battalion:'}
                </h4>
                <blockquote style={{ fontSize: '1rem', color: '#fff', fontStyle: 'italic', lineHeight: 1.7, margin: '0 0 1rem 0' }}>
                  {selectedCommittee.quote}
                </blockquote>
                <p style={{ color: '#a0a0b2', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
                  {isAr
                    ? 'باب التقديم مفتوح لجميع كليات جامعة جنوب الوادي (تجارة، هندسة، علوم، آداب، حاسبات، تربية، زراعة، تمريض، وغيرها). لا يُشترط الخبرة السابقة، الشغف هو معيارنا الأول!'
                    : 'Applications are open to students across all faculties at South Valley University. Prior experience is not required; genuine passion is our primary qualification!'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 992px) {
          .mascot-banner-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 580px) {
          .comm-modal-actions {
            width: 100% !important;
          }
          .comm-modal-actions > button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </section>
  );
}
