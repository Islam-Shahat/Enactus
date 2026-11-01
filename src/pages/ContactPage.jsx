import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Check, Sparkles, Globe } from 'lucide-react';
import { FacebookIcon } from '../components/Icons';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'استفسار عام',
    message: '',
  });

  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            GET IN TOUCH
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            تواصل مع <span className="gold-gradient-text">إيناكوس قنا</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            يسعدنا استقبال استفساراتكم واقتراحاتكم وشراكاتكم. فريقنا مستعد للإجابة على جميع تساؤلاتكم طوال أيام الأسبوع:
          </p>
        </div>

        {/* Contact Layout: Info Cards + Form */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.25fr',
            gap: '3rem',
            alignItems: 'start',
          }}
          className="contact-grid"
        >
          {/* Info Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Location */}
            <div className="glass-panel gold-glow-hover responsive-card-p" style={{ borderRadius: '20px', padding: '2rem 1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 184, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb800', flexShrink: 0 }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>مقر النشاط</h3>
                  <span style={{ fontSize: '0.8rem', color: '#a0a0b2' }}>South Valley University Campus</span>
                </div>
              </div>
              <p style={{ color: '#c5c5d6', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>
                المقر المركزي لـ Enactus: الحرم الجامعي الرئيسي، مجمع الأنشطة الطلابية، جامعة جنوب الوادي، طريق قنا - سفاجا، محافظة قنا، جمهورية مصر العربية.
              </p>
            </div>

            {/* Email & Phone */}
            <div className="glass-panel gold-glow-hover responsive-card-p" style={{ borderRadius: '20px', padding: '2rem 1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 184, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb800', flexShrink: 0 }}>
                  <Mail size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>البريد الرسمي</h3>
                  <span style={{ fontSize: '0.85rem', color: '#ffd54f' }}>enactus.svu@gmail.com</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 184, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb800', flexShrink: 0 }}>
                  <Phone size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>هاتف وواتساب الـ PR</h3>
                  <span style={{ fontSize: '0.9rem', color: '#ffd54f', direction: 'ltr', display: 'inline-block' }}>+20 109 238 4119</span>
                </div>
              </div>
            </div>

            {/* Social channels */}
            <div className="glass-panel responsive-card-p" style={{ borderRadius: '20px', padding: '2rem 1.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
                قنوات التواصل الاجتماعي
              </h3>
              <p style={{ color: '#a0a0b2', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                تابع أكثر من 11,700 متابع على صفحتنا الرسمية لمعرفة آخر الأخبار والفعاليات أولاً بأول.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href="https://www.facebook.com/Enactus.svu"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#1877f2',
                    color: '#fff',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  <FacebookIcon size={18} />
                  <span>صفحة فيسبوك</span>
                </a>

                <a
                  href="https://www.svu.edu.eg"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'rgba(255, 184, 0, 0.15)',
                    color: '#ffd54f',
                    border: '1px solid rgba(255, 184, 0, 0.35)',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  <Globe size={18} />
                  <span>بوابة الجامعة</span>
                </a>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div
            className="glass-panel gold-border-glow responsive-form-p"
            style={{
              borderRadius: '24px',
              padding: '3rem 2.5rem',
              background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.98))',
            }}
          >
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
              أرسل لنا رسالة مباشرة
            </h2>
            <p style={{ color: '#a5a5b8', fontSize: '0.95rem', marginBottom: '2rem' }}>
              املأ البيانات وسيقوم المسؤول المختص بالرد عليك عبر الإيميل أو الواتساب.
            </p>

            {!sent ? (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    الاسم بالكامل *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="اسمك الكريم"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
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

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    موضوع الرسالة *
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
                    <option value="استفسار عام" style={{ background: '#0e0f16' }}>استفسار عام</option>
                    <option value="طلب رعاية أو شراكة" style={{ background: '#0e0f16' }}>طلب رعاية أو شراكة</option>
                    <option value="استفسار عن التقديم والمقابلات" style={{ background: '#0e0f16' }}>استفسار عن التقديم والمقابلات</option>
                    <option value="تغطية إعلامية وصحفية" style={{ background: '#0e0f16' }}>تغطية إعلامية وصحفية</option>
                  </select>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    نص الرسالة *
                  </label>
                  <textarea
                    rows="4"
                    required
                    placeholder="اكتب رسالتك هنا..."
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
                    fontSize: '1.05rem',
                  }}
                >
                  <Send size={18} />
                  <span>إرسال الرسالة الآن</span>
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 184, 0, 0.2)', border: '2px solid #ffb800', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffd54f', margin: '0 auto 1.5rem auto' }}>
                  <Check size={36} />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
                  تم استلام رسالتك بنجاح!
                </h3>
                <p style={{ color: '#c5c5d6', fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  شكراً لتواصلك معنا. سنقوم بالرد على بريدك الإلكتروني في أقرب وقت.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
                >
                  إرسال رسالة أخرى
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
