import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, ArrowUpRight, CheckCircle2, Shield } from 'lucide-react';
import { committeesData } from '../data/enactusData';

export default function CommitteesPage() {
  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            ONE TEAM • ONE GOAL
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            لجان كتيبة <span className="gold-gradient-text">إيناكوس قنا</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            سبع لجان متكاملة تمثل صلب العمل المؤسسي لإيناكوس جامعة جنوب الوادي. لكل لجنة دور محوري في رحلة التغيير من قنا إلى العالمية. اختر اللجنة التي تلبي طموحك واكتشف تفاصيلها:
          </p>
        </div>

        {/* Committees Grid */}
        <div
          className="responsive-auto-grid-360"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: '1.5rem',
            marginBottom: '4.5rem',
          }}
        >
          {committeesData.map((comm) => (
            <div
              key={comm.slug}
              className="glass-panel gold-glow-hover card-shine responsive-card-p"
              style={{
                borderRadius: '24px',
                padding: '2.25rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1.5px solid rgba(255, 184, 0, 0.22)',
                background: 'rgba(18, 19, 28, 0.82)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span className="badge-gold font-cinzel" style={{ fontSize: '0.82rem', letterSpacing: '0.05em' }}>
                    {comm.code}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#ffd54f' }}>
                    {comm.mascotDesc}
                  </span>
                </div>

                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '0.35rem' }}>
                  {comm.arabicName}
                </h2>
                <div style={{ fontSize: '0.88rem', color: '#ffb800', fontWeight: 700, marginBottom: '1rem' }}>
                  {comm.name}
                </div>

                <p style={{ color: '#b5b5c6', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  {comm.brief}
                </p>

                <div style={{ background: 'rgba(255, 184, 0, 0.05)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.5rem', border: '1px dashed rgba(255, 184, 0, 0.2)' }}>
                  <div style={{ fontSize: '0.82rem', color: '#ffd54f', fontWeight: 700, marginBottom: '0.35rem' }}>
                    رئيس اللجنة (Head): {comm.headName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#a0a0b2' }}>
                    المشاريع: {comm.activeProjects.join(' • ')}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <Link
                  to={`/committees/${comm.slug}`}
                  className="btn-secondary"
                  style={{ fontSize: '0.88rem', padding: '0.55rem 1.15rem' }}
                >
                  <span>التفاصيل والمهام</span>
                  <ArrowLeft size={16} />
                </Link>

                <Link
                  to={`/join?committee=${encodeURIComponent(comm.arabicName)}`}
                  className="btn-primary"
                  style={{ fontSize: '0.88rem', padding: '0.55rem 1.15rem' }}
                >
                  <Sparkles size={14} />
                  <span>قدّم للجنة</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Banner */}
        <div
          className="glass-panel gold-border-glow responsive-panel-p"
          style={{
            borderRadius: '24px',
            padding: '2.5rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.08), rgba(12, 13, 20, 0.95))',
          }}
        >
          <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>
            هل ما زلت محتاراً في اختيار اللجنة المناسبة؟
          </h3>
          <p style={{ color: '#b5b5c6', maxWidth: '650px', margin: '0 auto 1.5rem auto', fontSize: '1rem', lineHeight: 1.7 }}>
            لا تقلق، يمكنك التقديم وسيقوم فريق الموارد البشرية (HR) بمساعدتك أثناء المقابلة الشخصية لاكتشاف موهبتك وتوجيهك للمكان الأنسب.
          </p>
          <Link to="/join" className="btn-primary" style={{ padding: '0.85rem 2.2rem', fontSize: '1.05rem' }}>
            <span>سجل الآن واترك أثرك</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
