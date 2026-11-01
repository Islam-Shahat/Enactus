import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { faqList } from '../data/enactusData';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, Sparkles, ArrowLeft } from 'lucide-react';

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState(0);

  const toggleAccordion = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container" style={{ maxWidth: '880px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            الأسئلة الشائعة <span className="gold-gradient-text">عن إيناكوس قنا</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            كل ما ترغب في معرفته حول شروط الانضمام، طبيعة العمل باللجان، الرعايات، ومراحل المنافسة الوطنية:
          </p>
        </div>

        {/* Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '4rem' }}>
          {faqList.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="glass-panel card-shine"
                style={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: isOpen ? '1.5px solid #ffb800' : '1px solid rgba(255, 184, 0, 0.2)',
                  transition: 'all 0.3s ease',
                  background: isOpen ? 'rgba(24, 26, 36, 0.95)' : 'rgba(16, 17, 24, 0.8)',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  className="faq-accordion-btn"
                  style={{
                    width: '100%',
                    padding: '1.5rem 1.75rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    textAlign: 'right',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <span style={{ fontSize: 'clamp(0.98rem, 2.5vw, 1.15rem)', fontWeight: 800, color: isOpen ? '#ffd54f' : '#fff', lineHeight: 1.5 }}>
                    {faq.q}
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isOpen ? 'rgba(255, 184, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isOpen ? '#ffb800' : '#888',
                      flexShrink: 0,
                    }}
                  >
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isOpen && (
                  <div
                    className="faq-accordion-body"
                    style={{
                      padding: '0 1.75rem 1.5rem 1.75rem',
                      color: '#c5c5d8',
                      fontSize: '0.98rem',
                      lineHeight: 1.8,
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      paddingTop: '1rem',
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions card */}
        <div
          className="glass-panel gold-border-glow responsive-panel-p"
          style={{
            borderRadius: '24px',
            padding: '2.5rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.08), rgba(12, 13, 20, 0.95))',
          }}
        >
          <MessageCircle size={36} color="#ffb800" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.6rem)', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
            لم تجد إجابة لسؤالك؟
          </h3>
          <p style={{ color: '#b5b5c6', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            تواصل مباشرة مع مسؤولي الـ HR أو راسلنا عبر واتساب وسنساعدك في الحال.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn-primary" style={{ padding: '0.75rem 1.8rem' }}>
              <span>تواصل معنا الآن</span>
              <ArrowLeft size={16} />
            </Link>
            <Link to="/join" className="btn-secondary" style={{ padding: '0.75rem 1.8rem' }}>
              <span>قدّم مباشرة للانضمام</span>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .faq-accordion-btn {
            padding: 1.15rem 1rem !important;
          }
          .faq-accordion-body {
            padding: 0 1rem 1.15rem 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
