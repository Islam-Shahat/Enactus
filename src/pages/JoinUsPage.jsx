import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Sparkles, User, BookOpen, Phone, CheckCircle2, Copy, Check, ArrowLeft, Shield, Clock, Award } from 'lucide-react';

export default function JoinUsPage() {
  const [searchParams] = useSearchParams();
  const preselectedCommittee = searchParams.get('committee') || '';

  const [formData, setFormData] = useState({
    name: '',
    faculty: 'كلية الهندسة',
    year: 'الفرقة الثانية',
    phone: '',
    committee: preselectedCommittee || 'إدارة المشاريع التنموية (PM)',
    impactGoal: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (preselectedCommittee) {
      setFormData((prev) => ({ ...prev, committee: preselectedCommittee }));
    }
  }, [preselectedCommittee]);

  const faculties = [
    'كلية الهندسة',
    'كلية التجارة',
    'كلية الحاسبات والمعلومات',
    'كلية العلوم',
    'كلية الآداب',
    'كلية التربية',
    'كلية الزراعة',
    'كلية الطب البشري',
    'كلية العلاج الطبيعي',
    'كلية التمريض',
    'كلية الصيدلة',
    'كلية طب الأسنان',
    'كلية الآثار بقنا',
    'كلية الحقوق',
    'كلية التربية النوعية',
    'أخرى',
  ];

  const committeesList = [
    'إدارة المشاريع التنموية (PM)',
    'المالتي ميديا والتصميم (MultiMedia)',
    'العلاقات العامة والشراكات (PR)',
    'لجنة التنظيم واللوجستيات (OC)',
    'الموارد البشرية والتطوير (HR)',
    'فرسان المنصة والعرض (Presentation)',
    'صناع المحتوى والسوشيال ميديا (Social Media)',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('يرجى ملء الاسم ورقم الهاتف للمتابعة');
      return;
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const passCode = `ENACTUS-SVU-${randomCode}`;
    setMemberId(passCode);
    setIsSubmitted(true);

    import('canvas-confetti').then((m) => {
      const confetti = m.default || m;
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ffaa00', '#ff8c00', '#ffffff'],
      });
    });

    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3.5rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            RECRUITMENT PORTAL • 2026
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            اترك أثرك الخالد: <span className="gold-gradient-text">انضم لكتيبة إيناكوس قنا</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            "The future was found, and it's looking for you!" لا تكتفِ بالمشاهدة، كن أحد فرسان التغيير ومبتكري المشاريع التي تخدم صعيد مصر وتصعد للمسابقة الوطنية.
          </p>
        </div>

        {/* Urgency Ribbon */}
        <div
          className="glass-panel card-shine"
          style={{
            maxWidth: '720px',
            margin: '0 auto 2.5rem auto',
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 184, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={20} color="#ffb800" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
              باب التقديم مفتوح لجميع كليات جامعة جنوب الوادي
            </span>
          </div>
          <span className="badge-gold" style={{ background: '#ffd54f', color: '#08080a', fontWeight: 900 }}>
            FORM OPEN
          </span>
        </div>

        {/* Form or Result Card */}
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {!isSubmitted ? (
            <div
              className="glass-panel gold-border-glow responsive-form-p"
              style={{
                borderRadius: '24px',
                padding: '3rem 2.5rem',
                background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.98))',
              }}
            >
              <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    الاسم بالكامل (كما في بطاقة الرقم القومي) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      placeholder="مثال: يوسف محمود عبد الرحيم"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem 0.9rem 2.8rem',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                      }}
                    />
                    <User size={18} color="#ffb800" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                {/* Faculty & Year */}
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      الكلية بجامعة جنوب الوادي *
                    </label>
                    <select
                      value={formData.faculty}
                      onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    >
                      {faculties.map((f, i) => (
                        <option key={i} value={f} style={{ background: '#0e0f16', color: '#fff' }}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      الفرقة الدراسية *
                    </label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    >
                      <option value="الفرقة الأولى" style={{ background: '#0e0f16' }}>الفرقة الأولى</option>
                      <option value="الفرقة الثانية" style={{ background: '#0e0f16' }}>الفرقة الثانية</option>
                      <option value="الفرقة الثالثة" style={{ background: '#0e0f16' }}>الفرقة الثالثة</option>
                      <option value="الفرقة الرابعة" style={{ background: '#0e0f16' }}>الفرقة الرابعة</option>
                      <option value="الفرقة الخامسة / دراسات عليا" style={{ background: '#0e0f16' }}>الفرقة الخامسة / دراسات عليا</option>
                    </select>
                  </div>
                </div>

                {/* Phone */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    رقم الهاتف (الواتساب لتحديد موعد المقابلة) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      required
                      placeholder="010XXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem 0.9rem 2.8rem',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                        direction: 'ltr',
                        textAlign: 'right',
                      }}
                    />
                    <Phone size={18} color="#ffb800" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                {/* Committee selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700 }}>
                      اللجنة التي ترغب في الانضمام إليها *
                    </label>
                    <Link to="/committees" style={{ color: '#ffb800', fontSize: '0.8rem', textDecoration: 'none' }}>
                      دليل مهام اللجان ←
                    </Link>
                  </div>
                  <select
                    value={formData.committee}
                    onChange={(e) => setFormData({ ...formData, committee: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.85)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.9rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  >
                    {committeesList.map((c, i) => (
                      <option key={i} value={c} style={{ background: '#0e0f16', color: '#fff' }}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Impact Goal */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    ما هو الأثر أو المهارة التي تطمح لإضافتها للكتيبة ومجتمع قنا؟
                  </label>
                  <textarea
                    rows="3"
                    placeholder="حدثنا باختصار عن أفكارك وشغفك..."
                    value={formData.impactGoal}
                    onChange={(e) => setFormData({ ...formData, impactGoal: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.85)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.9rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="btn-primary animate-pulse-glow"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '1.1rem',
                    fontSize: '1.15rem',
                  }}
                >
                  <Sparkles size={22} />
                  <span>تأكيد التسجيل واستخراج بطاقة العضوية ☥</span>
                </button>
              </form>
            </div>
          ) : (
            /* Digital VIP Pass Generated */
            <div
              className="glass-panel gold-border-glow"
              style={{
                borderRadius: '24px',
                padding: '3rem 2.5rem',
                textAlign: 'center',
                background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.98), rgba(10, 11, 16, 0.98))',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(255, 184, 0, 0.2)',
                  border: '2px solid #ffb800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto',
                  color: '#ffd54f',
                }}
              >
                <CheckCircle2 size={42} />
              </div>

              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
                تم استلام طلبك بنجاح!
              </h2>
              <p style={{ color: '#c5c5d6', fontSize: '1.05rem', marginBottom: '2.5rem' }}>
                أهلاً بك في مرحلة الانطلاق. إليك بطاقة عضويتك الرسمية الخاصة بـ <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong>:
              </p>

              {/* VIP Card */}
              <div
                className="gold-border-glow card-shine"
                style={{
                  maxWidth: '400px',
                  width: '100%',
                  margin: '0 auto 2.5rem auto',
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg, #181924, #0b0c10)',
                  border: '2px solid rgba(255, 184, 0, 0.65)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 184, 0, 0.3)',
                  overflow: 'hidden',
                  textAlign: 'right',
                  position: 'relative',
                }}
              >
                <div style={{ width: '60px', height: '10px', borderRadius: '5px', background: '#000', margin: '14px auto 0 auto', border: '1px solid rgba(255, 184, 0, 0.4)' }} />

                <div className="responsive-card-p" style={{ padding: '1.75rem 2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img src="/assets/E2.jpg" alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                      <div>
                        <div className="font-cinzel" style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffb800' }}>
                          ENACTUS QENA
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#a3a3b2' }}>South Valley University</div>
                      </div>
                    </div>
                    <span className="badge-gold font-cinzel" style={{ fontSize: '0.7rem' }}>NC 2026</span>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ffd54f', fontWeight: 600 }}>اسم المحارب:</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff' }}>{formData.name}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#a3a3b2' }}>الكلية:</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#e0e0ec' }}>{formData.faculty}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#a3a3b2' }}>اللجنة:</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffb800' }}>{formData.committee}</div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px dashed rgba(255, 184, 0, 0.35)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#888' }}>كود التسجيل:</div>
                      <div className="font-cinzel" style={{ fontSize: '0.92rem', color: '#ffd54f', fontWeight: 800 }}>{memberId}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#ffb800', fontStyle: 'italic', fontWeight: 700 }}>
                      PEOPLE. IDEAS. IMPACT.
                    </div>
                  </div>
                </div>

                <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', fontSize: '6rem', color: 'rgba(255, 184, 0, 0.04)', pointerEvents: 'none' }}>
                  ☥
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCopyCode}
                  style={{
                    background: 'rgba(255, 184, 0, 0.15)',
                    border: '1px solid rgba(255, 184, 0, 0.4)',
                    color: '#ffd54f',
                    borderRadius: '9999px',
                    padding: '0.85rem 1.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                  }}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copied ? 'تم نسخ كود العضوية!' : 'نسخ كود العضوية'}</span>
                </button>

                <a
                  href="https://www.facebook.com/Enactus.svu"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ padding: '0.85rem 2rem' }}
                >
                  <span>متابعة إعلان المقابلات على فيسبوك</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
