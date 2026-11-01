import React, { useState } from 'react';
import { Megaphone, Camera, BarChart3, Calendar, Users, Mic, Share2, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export default function CommitteesSection({ onOpenJoinModal }) {
  const [selectedCommittee, setSelectedCommittee] = useState(null);

  const committees = [
    {
      id: 'pm',
      code: 'PM',
      name: 'Project Management',
      arabicName: 'إدارة المشاريع التنموية',
      icon: BarChart3,
      badge: 'القلب النابض للحلول',
      mascotDesc: 'الفرعون صاحب التابلت الرقمي وخرائط الأثر',
      role: 'العقل المفكر والمسؤول عن ابتكار وتطوير مشاريع ريادة الأعمال المجتمعية التي تحل مشاكل حقيقية في صعيد مصر وتلبي أهداف التنمية المستدامة (SDGs).',
      skills: [
        'أبحاث السوق والنزول الميداني للقرى',
        'دراسات الجدوى الاقتصادية والمالية',
        'تطبيق معايير استدامة إيناكوس العالمية',
        'إدارة سلاسل الإمداد والتشغيل للمشاريع',
      ],
      quote: '"نحن لا نحلم فقط بالمستقبل.. بل نصممه ونبنيه بأيدينا."',
    },
    {
      id: 'multimedia',
      code: 'MULTI MEDIA',
      name: 'MultiMedia & Creative',
      arabicName: 'المالتي ميديا والتصميم',
      icon: Camera,
      badge: 'مهندسو الهوية البصرية',
      mascotDesc: 'الفرعون المبدع بالنظارات والكاميرا الذهبية',
      role: 'الفنانون وراء كل بوستر، فيديو، وهوية بصرية تخطف الأنظار كما رأيتم في حملات إيناكوس قنا الأسطورية من خلال التصميم ثلاثي الأبعاد وصناعة الأفلام.',
      skills: [
        'تصميم الجرافيك والـ Branding (Photoshop, Illustrator)',
        'صناعة وتعديل الفيديو والموشن جرافيك (Premiere, After Effects)',
        'التصوير الفوتوغرافي والسينمائي للفعاليات',
        'التصميم ثلاثي الأبعاد وإخراج الحملات الإعلانية',
      ],
      quote: '"نحول الأفكار المجردة إلى تحف بصرية تخلّد في الذاكرة."',
    },
    {
      id: 'pr',
      code: 'PR',
      name: 'Public Relations',
      arabicName: 'العلاقات العامة والشراكات',
      icon: Megaphone,
      badge: 'صوت الكيان وسفراء الرؤية',
      mascotDesc: 'الفرعون صاحب الميكروفون الذهبي والغمزة الواثقة',
      role: 'الواجهة الرسمية لإيناكوس قنا أمام المجتمع والشركات؛ المسؤولون عن جلب الرعايات (Sponsorships)، عقد الشراكات الاستراتيجية، وإدارة التغطية الإعلامية.',
      skills: [
        'مهارات التفاوض والإقناع رفيعة المستوى',
        'إعداد وتوقيع بروتوكولات التعاون والرعايات',
        'بناء شبكة علاقات مع رجال الأعمال والشركات',
        'التحدث الرسمي وإدارة الظهور الإعلامي',
      ],
      quote: '"نبني جسور الثقة مع العالم وننقل صوت قنا لأبعد مدى."',
    },
    {
      id: 'oc',
      code: 'OC',
      name: 'Organizing Committee',
      arabicName: 'لجنة التنظيم واللوجستيات',
      icon: Calendar,
      badge: 'أسياد الميدان والتحكم',
      mascotDesc: 'الفرعون صاحب البردية ومخططات التنفيذ',
      role: 'القوة الميدانية التي تدير كل إيفنت، ورشة عمل، معسكر تدريبي ومؤتمر على أرض الواقع بأعلى درجات الدقة والنظام والانضباط.',
      skills: [
        'إدارة الفعاليات الضخمة والمؤتمرات',
        'إدارة الحشود وتأمين حركة الضيوف',
        'التخطيط اللوجستي وإدارة الموارد والمعدات',
        'التعامل السريع مع المواقف الطارئة والضغوط',
      ],
      quote: '"النظام والانضباط هما السر وراء كل نجاح أسطوري."',
    },
    {
      id: 'hr',
      code: 'HR',
      name: 'Human Resources',
      arabicName: 'الموارد البشرية والتطوير',
      icon: Users,
      badge: 'حراس بيئة العمل وصناع القادة',
      mascotDesc: 'الفرعون الحكيم حامل سجلات التطوير البشري',
      role: 'رعاة الطاقة الإيجابية وصناع القادة؛ مسؤولون عن استقطاب المواهب، المقابلات، التقييم، التدريب، وتوفير بيئة عمل تشجع على الإبداع والاستمرار.',
      skills: [
        'إجراء المقابلات الشخصية (Interviews)',
        'تقييم الأداء وقياس مؤشرات النجاح (KPIs)',
        'تصميم وتنفيذ ورش العمل التدريبية والـ Team Building',
        'حل النزاعات وبناء الروح المعنوية للفريق',
      ],
      quote: '"الإنسان هو جوهر كل تغيير وأثمن ثروات إيناكوس."',
    },
    {
      id: 'presentation',
      code: 'PRESENTATION',
      name: 'Presentation & Pitching',
      arabicName: 'فرسان المنصة والعرض',
      icon: Mic,
      badge: 'سفراء المنصة أمام حكام الـ NC',
      mascotDesc: 'الفرعون الخطيب متحدث المنصة وناقل الحلم',
      role: 'صوت الفريق في المسابقة الوطنية المصرية (National Competition) وأمام كبار المستثمرين ولجان التحكيم؛ ينقلون قصة كفاح وأثر مشاريع قنا بإتقان.',
      skills: [
        'الإلقاء والخطابة باللغتين الإنجليزية والعربية',
        'لغة الجسد والحضور المسرحي والكاريزما',
        'مهارات الـ Storytelling وإيصال المشاعر والأرقام',
        'الرد السريع والمقنع على أسئلة لجان التحكيم',
      ],
      quote: '"على المنصة تشتعل الكلمات لتتحول إلى كأس وبطولة."',
    },
    {
      id: 'social',
      code: 'SOCIAL MEDIA',
      name: 'Social Media & Content',
      arabicName: 'صناع المحتوى والسوشيال ميديا',
      icon: Share2,
      badge: 'We don\'t just post, we purpose',
      mascotDesc: 'مبتكرو الرسالة والطيارات الورقية الذهبية',
      role: 'المسؤولون عن نشر الفكرة وصناعة محتوى هادف يلهم الآلاف ويحول المتابعين إلى شركاء في التغيير وصناع أثر حقيقي.',
      skills: [
        'كتابة المحتوى الإبداعي (Creative Copywriting)',
        'إدارة منصات التواصل الاجتماعي (Facebook, Instagram, LinkedIn)',
        'تحليل الأداء والتفاعل وزيادة الوصول العضوي',
        'إطلاق حملات التوظيف والترويج للمشاريع',
      ],
      quote: '"لا ننشر لمجرد النشر.. ننشر بهدف ونصنع الفرق!"',
    },
  ];

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
            كتيبة الفراعنة: <span className="gold-gradient-text">أدوار مختلفة، ومهمة واحدة</span>
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#b5b5c6', lineHeight: 1.8 }}>
            في إيناكوس جامعة جنوب الوادي، كل لجنة هي حجر زاوية في صرح الأثر الشامخ. اختر اللقب الذي يتناسب مع شغفك وقدراتك لتترك بصمتك مع فريق العظماء:
          </p>
        </div>

        {/* Master Mascot Showcase Poster Image (Image E6) */}
        <div
          className="glass-panel gold-border-glow card-shine mascot-banner-card"
          style={{
            borderRadius: '24px',
            padding: '1.5rem',
            marginBottom: '4rem',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 0.9fr',
              gap: '2.5rem',
              alignItems: 'center',
            }}
            className="mascot-banner-grid"
          >
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="badge-gold font-cinzel">ONE LEGACY</span>
                <span style={{ color: '#ffb800', fontSize: '0.85rem' }}>Different Roles. Same Mission.</span>
              </div>

              <h3 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>
                كتيبة موحدة تصنع فارقاً أسطورياً!
              </h3>

              <p style={{ color: '#c2c2d4', lineHeight: 1.8, fontSize: '1.02rem', marginBottom: '1.5rem' }}>
                منسقو المشاريع، مصممو الإبداع، رجال العلاقات العامة، منظّمو الميدان، حراس الموارد البشرية، وفرسان المنصة.. معاً نشكل عائلة واحدة تعمل بتناغم كامل لتحقيق هدف واحد: <strong>رفع اسم قنا وجامعة جنوب الوادي عالياً في كل محفل.</strong>
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => onOpenJoinModal()}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}
                >
                  <Sparkles size={16} />
                  <span>انضم إلى إحدى اللجان</span>
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
                    {comm.arabicName}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#ffb800', fontWeight: 700, marginBottom: '0.85rem' }}>
                    {comm.name}
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
                      عرض التفاصيل والمهارات
                      <ArrowRight size={14} />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenJoinModal(comm.arabicName);
                      }}
                      className="btn-primary"
                      style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                    >
                      قدّم للجنة
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Committee Details Modal / Card */}
        {selectedCommittee && (
          <div
            className="glass-panel gold-border-glow responsive-panel-p"
            style={{
              borderRadius: '24px',
              padding: '2.5rem',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge-gold font-cinzel">{selectedCommittee.code}</span>
                  <span className="badge-gold">{selectedCommittee.badge}</span>
                </div>
                <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: '#fff', marginBottom: '0.25rem' }}>
                  {selectedCommittee.arabicName} ({selectedCommittee.name})
                </h3>
                <p style={{ color: '#ffb800', margin: 0, fontSize: '0.92rem', fontWeight: 600 }}>
                  الشخصية الفرعونية: {selectedCommittee.mascotDesc}
                </p>
              </div>

              <div className="comm-modal-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => onOpenJoinModal(selectedCommittee.arabicName)}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.6rem' }}
                >
                  <Sparkles size={18} />
                  <span>سجّل في هذه اللجنة الآن</span>
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
                  إغلاق
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 184, 0, 0.15)' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#ffd54f', marginBottom: '0.75rem', fontWeight: 800 }}>
                  ماذا ستكتسب وتتعلم في هذه اللجنة؟
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
                  رسالة اللجنة لأعضاء الكتيبة:
                </h4>
                <blockquote style={{ fontSize: '1rem', color: '#fff', fontStyle: 'italic', lineHeight: 1.7, margin: '0 0 1rem 0' }}>
                  {selectedCommittee.quote}
                </blockquote>
                <p style={{ color: '#a0a0b2', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
                  باب التقديم مفتوح لجميع كليات جامعة جنوب الوادي (تجارة، هندسة، علوم، آداب، حاسبات، تربية، زراعة، تمريض، وغيرها). لا يُشترط الخبرة السابقة، الشغف هو معيارنا الأول!
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
