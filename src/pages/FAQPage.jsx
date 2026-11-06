import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { faqList } from '../data/enactusData';
import { useFaqs } from '../hooks/usePublicContent';
import SEO from '../components/SEO';
import { ChevronDown, ChevronUp, MessageCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState(0);
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const { data: faqs = faqList, isLoading } = useFaqs(faqList);

  const toggleAccordion = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const faqSchema = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  } : undefined;

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={isAr ? "الأسئلة الشائعة" : "FAQ"}
        description={
          isAr
            ? "إجابات الأسئلة الشائعة حول الانضمام إلى إيناكوس قنا، اللجان، الرعايات، والمنافسات الوطنية."
            : "Frequently asked questions regarding recruitment, committees, sponsorship, and national competitions."
        }
        schema={faqSchema}
      />
      <div className="container" style={{ maxWidth: '880px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            {isAr ? (
              <>
                الأسئلة الشائعة <span className="gold-gradient-text">عن إيناكوس قنا</span>
              </>
            ) : (
              <>
                Frequently Asked <span className="gold-gradient-text">Questions</span>
              </>
            )}
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            {isAr
              ? 'كل ما ترغب في معرفته حول شروط الانضمام، طبيعة العمل باللجان، الرعايات، ومراحل المنافسة الوطنية:'
              : 'Everything you need to know about joining criteria, committee responsibilities, sponsorship, and competition stages:'}
          </p>
        </div>

        {/* Loading skeleton when empty & loading */}
        {isLoading && faqs.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '4rem' }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="glass-panel"
                style={{
                  height: '70px',
                  borderRadius: '18px',
                  background: 'rgba(255, 184, 0, 0.04)',
                  border: '1px dashed rgba(255, 184, 0, 0.25)',
                }}
              />
            ))}
          </div>
        )}

        {/* Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '4rem' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="glass-panel card-shine"
                style={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: isOpen ? '1.5px solid rgba(255, 184, 0, 0.5)' : '1px solid rgba(255, 184, 0, 0.15)',
                  background: isOpen ? 'rgba(26, 28, 40, 0.95)' : 'rgba(16, 17, 24, 0.75)',
                  transition: 'all 0.3s ease',
                  textAlign: isAr ? 'right' : 'left',
                }}
              >
                <button
                  onClick={() => toggleAccordion(idx)}
                  style={{
                    width: '100%',
                    padding: '1.5rem 1.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    textAlign: isAr ? 'right' : 'left',
                    cursor: 'pointer',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    gap: '1rem',
                  }}
                >
                  <span style={{ color: isOpen ? '#ffd54f' : '#fff' }}>{faq.q}</span>
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
                    style={{
                      padding: '0 1.75rem 1.75rem 1.75rem',
                      color: '#b5b5c8',
                      fontSize: '1rem',
                      lineHeight: 1.8,
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '1.25rem',
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact CTA Box */}
        <div
          className="glass-panel gold-border-glow card-shine responsive-panel-p"
          style={{
            borderRadius: '24px',
            padding: '2.5rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.08), rgba(12, 13, 18, 0.95))',
          }}
        >
          <MessageCircle size={36} color="#ffb800" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.75rem)', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
            {isAr ? 'لديك استفسار آخر لم تجد إجابته هنا؟' : 'Have a Question Not Addressed Here?'}
          </h3>
          <p style={{ color: '#a0a0b2', fontSize: '0.95rem', maxWidth: '580px', margin: '0 auto 1.5rem auto', lineHeight: 1.7 }}>
            {isAr
              ? 'فريق العلاقات العامة والموارد البشرية في إيناكوس قنا على استعداد دائم للإجابة على جميع تساؤلاتك ومساعدتك في اختيار اللجنة المناسبة.'
              : 'Our PR and HR teams are always ready to answer any questions and help you navigate committee options.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn-primary" style={{ fontSize: '0.95rem', padding: '0.75rem 1.75rem' }}>
              <span>{isAr ? 'تواصل معنا مباشرة' : 'Contact Us Directly'}</span>
              <ArrowIcon size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
