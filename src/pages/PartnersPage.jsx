import React from 'react';
import { Link } from 'react-router-dom';
import Partnerships from '../components/Partnerships';
import { Handshake, Award, Building2, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
import SEO from '../components/SEO';

export default function PartnersPage() {
  const pastPartnerships = [
    {
      name: 'وزارة التضامن الاجتماعي - قنا',
      role: 'دعم المعارض التراثية والحرفية',
      impact: 'تسهيل مشاركة أسر قرى قنا في المعارض التنموية وتوفير منافذ بيع للمنتجات اليدوية.',
    },
    {
      name: 'جهاز تنمية المشروعات الصغيرة (MSMEDA)',
      role: 'التدريب على دراسات الجدوى',
      impact: 'تقديم ورش عمل متخصصة لرواد الأعمال بجامعة جنوب الوادي وتأهيلهم لفرص التمويل.',
    },
    {
      name: 'جمعيات المجتمع المدني بصعيد مصر',
      role: 'التنسيق الميداني بالقرى',
      impact: 'الوصول الميداني لأكثر من 15 قرية بمركز قنا وقوص والوقف وتطبيق الحلول البيئية.',
    },
  ];

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title="شركاء المسيرة ورعاة الأثر"
        description="شركاء ورعاة إيناكوس قنا - شبكة التعاون الاستراتيجي مع المؤسسات التدريبية والشركات."
      />
      <div className="container">
        {/* Page Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            ALLIANCES & SPONSORS
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            شركاء المسيرة <span className="gold-gradient-text">ورعاة الأثر</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            نفتخر بشبكة شركائنا ورعاتنا الذين يشاركوننا الإيمان بطاقات شباب الصعيد، ويوفرون الدعم التدريبي، اللوجستي، والتقني لتحقيق أهداف التنمية المستدامة.
          </p>
        </div>

        {/* Reusable Main Partnerships Component */}
        <Partnerships />

        {/* Previous Alliances & Collaborations */}
        <div style={{ marginTop: '5rem', marginBottom: '4rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge-gold font-cinzel">TRACK RECORD</span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 900, color: '#fff', marginTop: '0.5rem' }}>
              سجل التعاون المشترك والنجاحات السابقة
            </h2>
          </div>

          <div className="grid-3">
            {pastPartnerships.map((p, idx) => (
              <div
                key={idx}
                className="glass-panel gold-glow-hover card-shine responsive-card-p"
                style={{
                  borderRadius: '20px',
                  padding: '2rem 1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,184,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb800', marginBottom: '1.25rem' }}>
                    <Building2 size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>
                    {p.name}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: '#ffb800', fontWeight: 700, marginBottom: '1rem' }}>
                    {p.role}
                  </div>
                  <p style={{ color: '#a5a5b8', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                    {p.impact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div
          className="glass-panel gold-border-glow responsive-panel-p"
          style={{
            borderRadius: '24px',
            padding: '3rem 2rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.1), rgba(12, 13, 20, 0.95))',
          }}
        >
          <h3 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>
            هل ترغب في الانضمام إلى شبكة شركاء إيناكوس قنا؟
          </h3>
          <p style={{ color: '#c5c5d6', maxWidth: '650px', margin: '0 auto 1.75rem auto', fontSize: '1rem', lineHeight: 1.7 }}>
            نوفر باقات رعاية متنوعة ومزايا تسويقية وتنموية واسعة النطاق في رحاب جامعة جنوب الوادي ومسابقة الجمهورية.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/sponsor" className="btn-primary" style={{ padding: '0.85rem 1.8rem' }}>
              <span>استكشف باقات الرعاية</span>
              <ArrowLeft size={16} />
            </Link>
            <Link to="/contact" className="btn-secondary" style={{ padding: '0.85rem 1.8rem' }}>
              <span>تواصل مع مسؤولي العلاقات العامة</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
