import React, { useState } from 'react';
import { sponsorshipTiers } from '../data/enactusData';
import { Award, CheckCircle2, Building, Mail, Phone, User, Sparkles, Send, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BecomeSponsorPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    tier: 'الباقة الماسية (Diamond Sponsor)',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffd700', '#ffaa00', '#ffffff'],
    });
  };

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            BECOME A SPONSOR • PARTNER WITH IMPACT
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            اربط علامتك التجارية <span className="gold-gradient-text">بأعظم قصة نجاح في الصعيد</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            رعاية إيناكوس قنا هي استثمار حقيقي في طاقات شباب المستقبل وفي المشاريع التنموية المستدامة. استكشف باقات الرعاية وتواصل معنا لنبني شراكة استثنائية:
          </p>
        </div>

        {/* Sponsorship Tiers Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1.75rem',
            marginBottom: '5rem',
            alignItems: 'stretch',
          }}
        >
          {sponsorshipTiers.map((tier, idx) => (
            <div
              key={idx}
              className={`glass-panel card-shine responsive-card-p sponsor-tier-card ${tier.featured ? 'gold-border-glow' : ''}`}
              style={{
                borderRadius: '24px',
                padding: '2.5rem 1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                background: tier.featured
                  ? 'linear-gradient(145deg, rgba(30, 32, 45, 0.95), rgba(12, 13, 20, 0.98))'
                  : 'rgba(18, 19, 28, 0.85)',
                border: tier.featured
                  ? '2px solid #ffb800'
                  : '1px solid rgba(255, 184, 0, 0.25)',
              }}
            >
              {tier.featured && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ffb800',
                    color: '#08080a',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    padding: '0.3rem 1rem',
                    borderRadius: '9999px',
                    boxShadow: '0 4px 15px rgba(255, 184, 0, 0.4)',
                  }}
                >
                  الأكثر تميزاً وظهوراً
                </div>
              )}

              <div>
                <span className="badge-gold font-cinzel" style={{ fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  {tier.englishName}
                </span>

                <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', marginBottom: '0.35rem' }}>
                  {tier.name}
                </h3>
                <div style={{ fontSize: '0.92rem', color: '#ffd54f', fontWeight: 700, marginBottom: '1.5rem' }}>
                  {tier.price}
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#ffb800', fontWeight: 700, marginBottom: '0.75rem' }}>
                    مزايا الباقة:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tier.perks.map((p, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#c5c5d6', fontSize: '0.88rem', lineHeight: 1.5 }}>
                        <CheckCircle2 size={16} color="#ffb800" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <a
                  href="#sponsor-form"
                  onClick={() => setFormData({ ...formData, tier: tier.name })}
                  className={tier.featured ? 'btn-primary' : 'btn-secondary'}
                  style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem' }}
                >
                  <span>طلب هذه الباقة</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Sponsor Contact Form */}
        <div id="sponsor-form" style={{ maxWidth: '750px', margin: '0 auto' }}>
          <div
            className="glass-panel gold-border-glow responsive-form-p"
            style={{
              borderRadius: '24px',
              padding: '3rem 2.5rem',
              background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.98))',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span className="badge-gold font-cinzel">PARTNERSHIP INQUIRY</span>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: '#fff', marginTop: '0.5rem', marginBottom: '0.4rem' }}>
                نموذج طلب الرعاية والتواصل
              </h2>
              <p style={{ color: '#a5a5b8', fontSize: '0.95rem', margin: 0 }}>
                املأ النموذج وسيتواصل معك مسؤول العلاقات العامة (PR) بملف الرعاية الرسمي في أقل من 24 ساعة.
              </p>
            </div>

            {!submitted ? (
              <form onSubmit={handleSubmit}>
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      اسم الشركة أو المؤسسة *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: شركة النيل للتطوير"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      اسم المسؤول / الممثل *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="الاسم والمنصب"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      البريد الإلكتروني الرسمي *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="partner@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        direction: 'ltr',
                        textAlign: 'right',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      رقم الهاتف / الواتساب *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="01XXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        direction: 'ltr',
                        textAlign: 'right',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    الباقة المطلوبة *
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.85)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  >
                    {sponsorshipTiers.map((t, i) => (
                      <option key={i} value={t.name} style={{ background: '#0e0f16', color: '#fff' }}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    تفاصيل أو استفسارات إضافية
                  </label>
                  <textarea
                    rows="3"
                    placeholder="حدثنا عن أهدافكم الترويجية أو رغبتكم في رعاية مشروع محدد..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.85)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '1rem',
                    fontSize: '1.1rem',
                  }}
                >
                  <Send size={18} />
                  <span>إرسال طلب الرعاية إلى مسؤولي الـ PR</span>
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 184, 0, 0.2)', border: '2px solid #ffb800', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffd54f', margin: '0 auto 1.5rem auto' }}>
                  <Check size={36} />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
                  شكراً لاهتمامكم برعاية إيناكوس قنا!
                </h3>
                <p style={{ color: '#c5c5d6', fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  تم استلام طلبكم بنجاح. سيقوم رئيس لجنة العلاقات العامة بالتواصل مع السيد/ <strong>{formData.contactPerson}</strong> لتزويدكم بالملف التعريفي والاتفاق على تفاصيل الرعاية.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
                >
                  إرسال طلب رعاية آخر
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 993px) {
          .sponsor-tier-card.gold-border-glow {
            transform: scale(1.03);
          }
        }
      `}</style>
    </div>
  );
}
