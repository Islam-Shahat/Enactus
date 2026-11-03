import React from 'react';
import { Link } from 'react-router-dom';
import { alumniData } from '../data/enactusData';
import { useAlumni } from '../hooks/usePublicContent';
import SEO from '../components/SEO';
import { ArrowLeft, GraduationCap } from 'lucide-react';

export default function AlumniPage() {
  const { data: alumni = alumniData, isLoading } = useAlumni(alumniData);

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title="خريجو الفريق وسفراء الأثر"
        description="شبكة خريجي إيناكوس قنا: سفراء الأثر في كبرى الشركات والمؤسسات الدولية ومراكز ريادة الأعمال."
      />
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            ALUMNI NETWORK & LEGACY
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            خريجو إيناكوس قنا: <span className="gold-gradient-text">سفراء الأثر في كبرى الشركات</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            خريجو كتيبتنا هم أبلغ دليل على قوة التجربة. اليوم يشغلون مناصب قيادية في كبرى الشركات والمؤسسات الدولية ومراكز ريادة الأعمال. استلهم من تجاربهم:
          </p>
        </div>

        {/* Loading skeleton when empty & loading */}
        {isLoading && alumni.length === 0 && (
          <div className="grid-3" style={{ marginBottom: '5rem' }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="glass-panel"
                style={{
                  height: '320px',
                  borderRadius: '24px',
                  background: 'rgba(255, 184, 0, 0.04)',
                  border: '1px dashed rgba(255, 184, 0, 0.25)',
                }}
              />
            ))}
          </div>
        )}

        {/* Alumni Cards Grid */}
        <div className="grid-3" style={{ marginBottom: '5rem' }}>
          {alumni.map((alumnus, idx) => (
            <div
              key={idx}
              className="glass-panel gold-glow-hover card-shine responsive-card-p"
              style={{
                borderRadius: '24px',
                padding: '2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1.5px solid rgba(255, 184, 0, 0.22)',
                background: 'rgba(18, 19, 28, 0.85)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid #ffb800',
                      boxShadow: '0 0 15px rgba(255, 184, 0, 0.3)',
                    }}
                  >
                    <img src={alumnus.image} alt={alumnus.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', marginBottom: '0.2rem' }}>
                      {alumnus.name}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#ffb800', fontWeight: 700 }}>
                      {alumnus.formerRole}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 184, 0, 0.06)', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255, 184, 0, 0.15)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#a0a0b2', marginBottom: '0.2rem' }}>الموقع المهني الحالي:</div>
                  <div style={{ fontSize: '0.88rem', color: '#ffd54f', fontWeight: 700 }}>
                    {alumnus.currentPosition}
                  </div>
                </div>

                <blockquote style={{ color: '#c5c5d6', fontSize: '0.92rem', lineHeight: 1.7, fontStyle: 'italic', margin: 0, position: 'relative' }}>
                  "{alumnus.quote}"
                </blockquote>
              </div>
            </div>
          ))}
        </div>

        {/* Join as alumni or student */}
        <div
          className="glass-panel gold-border-glow responsive-panel-p"
          style={{
            borderRadius: '24px',
            padding: '3rem 2rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.08), rgba(12, 13, 20, 0.95))',
          }}
        >
          <GraduationCap size={40} color="#ffb800" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: 'clamp(1.3rem, 3.2vw, 1.8rem)', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>
            هل أنت أحد خريجي Enactus South Valley University؟
          </h3>
          <p style={{ color: '#b5b5c6', maxWidth: '650px', margin: '0 auto 1.75rem auto', fontSize: '1rem', lineHeight: 1.7 }}>
            يسعدنا انضمامك إلى شبكة الخريجين الرسمية لتبادل الخبرات وتوجيه الأجيال الجديدة وتقديم فرص التدريب للطلاب.
          </p>
          <Link to="/contact" className="btn-primary" style={{ padding: '0.85rem 2rem' }}>
            <span>تواصل مع شبكة الخريجين</span>
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
