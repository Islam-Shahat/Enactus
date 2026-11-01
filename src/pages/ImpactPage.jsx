import React from 'react';
import { Link } from 'react-router-dom';
import ProjectsImpact from '../components/ProjectsImpact';
import { Award, Globe, HeartHandshake, TrendingUp, Users, Sprout, ArrowLeft, Sparkles } from 'lucide-react';

export default function ImpactPage() {
  const sdgsList = [
    { num: 'SDG 1', title: 'القضاء على الفقر', desc: 'تمكين أسر قرى قنا من خلال مشاريع حرفية وتجارية مدرة للدخل.' },
    { num: 'SDG 8', title: 'العمل اللائق ونمو الاقتصاد', desc: 'خلق فرص عمل خضراء وتدريب الشباب على ريادة الأعمال.' },
    { num: 'SDG 12', title: 'الاستهلاك والإنتاج المسؤول', desc: 'تدوير مخلفات قصب السكر والزراعة إلى منتجات مستدامة.' },
    { num: 'SDG 13', title: 'العمل المناخي', desc: 'الحد من الانبعاثات الناتجة عن الحرق المكشوف للمخلفات الزراعية.' },
  ];

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            SUSTAINABILITY & SOCIAL IMPACT
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            أثر مستدام: <span className="gold-gradient-text">حين تتحول الأفكار إلى حياة</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            في إيناكوس قنا نقيس نجاحنا بمقدار الأثر الواقعي الذي نتركه في حياة أهالينا بالصعيد وفي بيئتنا الطبيعية على ضفاف النيل.
          </p>
        </div>

        {/* Impact Component */}
        <ProjectsImpact onOpenJoinModal={() => {}} />

        {/* Global SDGs Alignment */}
        <div style={{ marginTop: '5rem', marginBottom: '4rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge-gold font-cinzel">GLOBAL ALIGNMENT</span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 900, color: '#fff', marginTop: '0.5rem' }}>
              توافق مشاريعنا مع أهداف التنمية المستدامة (SDGs)
            </h2>
          </div>

          <div className="grid-4">
            {sdgsList.map((sdg, i) => (
              <div key={i} className="glass-panel gold-glow-hover responsive-card-p" style={{ borderRadius: '20px', padding: '2rem 1.5rem', textAlign: 'center' }}>
                <div className="font-cinzel" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffb800', marginBottom: '0.5rem' }}>
                  {sdg.num}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
                  {sdg.title}
                </h3>
                <p style={{ color: '#a5a5b8', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                  {sdg.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div style={{ textAlign: 'center' }}>
          <Link to="/join" className="btn-primary" style={{ padding: '0.85rem 2.2rem', fontSize: '1.05rem' }}>
            <Sparkles size={18} />
            <span>شارك في صناعة الأثر القادم</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
