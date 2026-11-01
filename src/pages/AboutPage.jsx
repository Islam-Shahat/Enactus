import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Compass, Eye, Heart, Trophy, Sparkles, Target, Users, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      title: 'الإنسان والأثر (People First)',
      desc: 'نؤمن أن عقول شباب الصعيد هي الثروة الحقيقية، وأن مقياس نجاحنا هو كم شخصاً تحسنت حياته بفضل مشاريعنا.',
      icon: Users,
    },
    {
      title: 'الابتكار وريادة الأعمال (Innovation)',
      desc: 'لا نعتمد على الحلول الخيرية المؤقتة، بل نبتكر نماذج أعمال تجارية مستدامة تدر دخلاً وتخلق فرص عمل.',
      icon: Target,
    },
    {
      title: 'أصالة الصعيد وتراث دندرة (Heritage)',
      desc: 'نستمد هويتنا من شموخ معبد دندرة ونيل قنا الخالد، ونحمل هذا الإرث لنعبر به الحدود نحو الساحة العالمية.',
      icon: Landmark,
    },
    {
      title: 'النزاهة وروح الفريق الواحد (One Team)',
      desc: 'فريق واحد وهدف واحد؛ نعمل بأعلى معايير الشفافية والمسؤولية الأخلاقية لنكون قدوة لكل الأنشطة الطلابية.',
      icon: ShieldCheck,
    },
  ];

  const milestones = [
    {
      year: 'التأسيس والانطلاق',
      title: 'ولادة شعلة التغيير بقنا',
      desc: 'تأسيس فرع إيناكوس بجامعة جنوب الوادي برؤية تهدف لنقل فكر ريادة الأعمال المجتمعية إلى صعيد مصر.',
    },
    {
      year: 'التوسع الميداني',
      title: 'إطلاق أول مشاريع إعادة التدوير',
      desc: 'النزول الميداني لقرى مركز قنا وقوص وتدشين أولى المبادرات الزراعية لتحويل مخلفات القصب إلى سماد عضوي.',
    },
    {
      year: 'الصعود الوطني',
      title: 'المشاركة التاريخية في مسابقة الجمهورية NC',
      desc: 'تمثيل جامعة جنوب الوادي والمنافسة أمام أكثر من 50 جامعة مصرية والتتويج بإشادة لجان التحكيم الدولية.',
    },
    {
      year: '2026 وما بعدها',
      title: 'From Qena to the World',
      desc: 'تدشين الهوية الفرعونية الأسطورية وإبرام شراكات دولية كبرى والاستعداد لانتزاع كأس الجمهورية والوصول لكأس العالم.',
    },
  ];

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container">
        {/* Page Hero */}
        <div style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            ABOUT ENACTUS QENA
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            من نحن: <span className="gold-gradient-text">قصة أثر كُتبت في قلب الصعيد</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            نحن نشاط طلابي تنموي ريادي بجامعة جنوب الوادي، نؤمن بأن طلاب اليوم هم قادة التغيير وصناع الغد المشرق. نستلهم عظمتنا من تاريخ الأجداد في معبد دندرة لنصنع حلولاً اقتصادية وبيئية مستدامة.
          </p>
        </div>

        {/* Vision & Mission Cards */}
        <div className="grid-2" style={{ marginBottom: '4.5rem' }}>
          <div
            className="glass-panel gold-glow-hover card-shine responsive-panel-p"
            style={{
              borderRadius: '24px',
              padding: '2.5rem',
              border: '1.5px solid rgba(255, 184, 0, 0.3)',
              background: 'linear-gradient(135deg, rgba(20, 22, 32, 0.9), rgba(10, 11, 16, 0.95))',
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255, 184, 0, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb800', marginBottom: '1.5rem' }}>
              <Eye size={28} />
            </div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>
              رؤيتنا (Our Vision)
            </h2>
            <p style={{ color: '#c5c5d6', fontSize: '1.02rem', lineHeight: 1.8 }}>
              أن نكون المنارة التنموية ومركز التميز الريادي الأول لشباب صعيد مصر، وأن نثبت للعالم أجمع أن الأفكار النابعة من قنا وجامعة جنوب الوادي قادرة على المنافسة في كبرى المحافل العالمية وإحداث تحول اقتصادي واجتماعي مستدام.
            </p>
          </div>

          <div
            className="glass-panel gold-glow-hover card-shine responsive-panel-p"
            style={{
              borderRadius: '24px',
              padding: '2.5rem',
              border: '1.5px solid rgba(255, 184, 0, 0.3)',
              background: 'linear-gradient(135deg, rgba(20, 22, 32, 0.9), rgba(10, 11, 16, 0.95))',
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255, 184, 0, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb800', marginBottom: '1.5rem' }}>
              <Compass size={28} />
            </div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>
              رسالتنا (Our Mission)
            </h2>
            <p style={{ color: '#c5c5d6', fontSize: '1.02rem', lineHeight: 1.8 }}>
              تمكين طلاب جامعة جنوب الوادي وتزويدهم بالمهارات العملية في الإدارة والتسويق والتكنولوجيا، واستثمار طاقاتهم لتحويل التحديات المجتمعية والبيئية في قرى قنا إلى مشاريع ريادية ناجحة تمكن الأسر وترتقي بجودة الحياة.
            </p>
          </div>
        </div>

        {/* Core Values */}
        <div style={{ marginBottom: '5.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge-gold font-cinzel">OUR CORE PILLARS</span>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', marginTop: '0.5rem' }}>
              القيم التي توجه خطانا
            </h2>
          </div>

          <div className="grid-4">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="glass-panel gold-glow-hover" style={{ borderRadius: '20px', padding: '2rem 1.5rem', textAlign: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255, 184, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb800', margin: '0 auto 1.25rem auto' }}>
                    <Icon size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
                    {v.title}
                  </h3>
                  <p style={{ color: '#a5a5b8', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                    {v.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* History / Timeline */}
        <div style={{ marginBottom: '5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span className="badge-gold font-cinzel">OUR JOURNEY</span>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', marginTop: '0.5rem' }}>
              محطات مضيئة في تاريخ النشاط
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '850px', margin: '0 auto' }}>
            {milestones.map((m, idx) => (
              <div
                key={idx}
                className="glass-panel gold-glow-hover milestone-row responsive-card-p"
                style={{
                  borderRadius: '18px',
                  padding: '1.75rem 2rem',
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: '1.5rem',
                  alignItems: 'center',
                }}
              >
                <div className="milestone-year-box" style={{ borderLeft: '2px solid rgba(255, 184, 0, 0.4)', paddingLeft: '1rem' }}>
                  <span className="font-cinzel" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffd54f' }}>
                    {m.year}
                  </span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>
                    {m.title}
                  </h3>
                  <p style={{ color: '#b0b0c2', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                    {m.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick CTA */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/team" className="btn-primary" style={{ fontSize: '1rem', padding: '0.85rem 1.8rem' }}>
            <span>تعرف على مجلس الإدارة والكتيبة</span>
            <ArrowLeft size={18} />
          </Link>
          <Link to="/join" className="btn-secondary" style={{ fontSize: '1rem', padding: '0.85rem 1.8rem' }}>
            <span>قدّم وانضم للمسيرة</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
