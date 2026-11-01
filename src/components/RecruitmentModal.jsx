import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, User, BookOpen, Phone, Briefcase, Award, Download, Copy, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RecruitmentModal({ isOpen, onClose, defaultCommittee = '' }) {
  const [formData, setFormData] = useState({
    name: '',
    faculty: 'كلية التجارة',
    year: 'الفرقة الثانية',
    phone: '',
    committee: defaultCommittee || 'إدارة المشاريع التنموية (PM)',
    impactGoal: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [copied, setCopied] = useState(false);

  // Update default committee if changed from props
  React.useEffect(() => {
    if (defaultCommittee) {
      setFormData((prev) => ({ ...prev, committee: defaultCommittee }));
    }
  }, [defaultCommittee]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('يرجى ملء الاسم ورقم الهاتف للمتابعة');
      return;
    }

    // Generate custom Enactus Qena Pass ID
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const passCode = `ENACTUS-SVU-${randomCode}`;
    setMemberId(passCode);
    setIsSubmitted(true);

    // Golden celebratory confetti burst!
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#ffd700', '#ffaa00', '#ff8c00', '#ffffff'],
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const faculties = [
    'كلية التجارة',
    'كلية الهندسة',
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

  return (
    <div
      className="modal-overlay-responsive"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 5, 8, 0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        className="glass-panel gold-border-glow modal-dialog-responsive"
        style={{
          width: '100%',
          maxWidth: '680px',
          borderRadius: '24px',
          background: 'linear-gradient(160deg, rgba(22, 24, 34, 0.98), rgba(10, 11, 16, 0.98))',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 184, 0, 0.2)',
          position: 'relative',
          overflow: 'hidden',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 184, 0, 0.2)',
            background: 'rgba(15, 16, 24, 0.7)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 184, 0, 0.5)',
                flexShrink: 0,
              }}
            >
              <img src="/assets/E2.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: 'clamp(1rem, 2.8vw, 1.25rem)', fontWeight: 900, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isSubmitted ? 'بطاقة عضوية إيناكوس قنا الرسمية' : 'استمارة الانضمام - LEAVE YOUR MARK'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#ffb800' }}>
                Enactus South Valley University • 2026
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-responsive" style={{ padding: '2rem', overflowY: 'auto' }}>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <span className="badge-gold font-cinzel" style={{ marginBottom: '0.5rem' }}>
                  THE FUTURE WAS FOUND
                </span>
                <h4 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.4rem' }}>
                  لا تكتفِ بالتقديم.. <span className="gold-gradient-text">اترك أثرك الخالد!</span>
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#a0a0b2', margin: 0 }}>
                  املأ بياناتك لتنضم لكتيبة قنا المنافسة على درع مصر للمشاريع الريادية.
                </p>
              </div>

              {/* Field 1: Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  الاسم بالكامل (ثلاثي أو رباعي) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد محمود عبد الرحيم"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.8)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem 0.85rem 2.5rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  />
                  <User size={18} color="#ffb800" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Field 2 & 3: Faculty & Year */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    الكلية بجامعة جنوب الوادي *
                  </label>
                  <select
                    value={formData.faculty}
                    onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.8)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      color: '#fff',
                      fontSize: '0.92rem',
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
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    الفرقة الدراسية *
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.8)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      color: '#fff',
                      fontSize: '0.92rem',
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

              {/* Field 4: Phone / WhatsApp */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  رقم الهاتف (الواتساب للتواصل) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    required
                    placeholder="مثال: 01012345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.8)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem 0.85rem 2.5rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                      direction: 'ltr',
                      textAlign: 'right',
                    }}
                  />
                  <Phone size={18} color="#ffb800" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Field 5: Committee Selection */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  اللجنة التي ترغب في الانضمام إليها *
                </label>
                <select
                  value={formData.committee}
                  onChange={(e) => setFormData({ ...formData, committee: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(10, 11, 16, 0.8)',
                    border: '1px solid rgba(255, 184, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
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

              {/* Field 6: Personal Impact Vision */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  ما هو الأثر أو المهارة التي تريد إضافتها للفريق؟ (اختياري)
                </label>
                <textarea
                  rows="3"
                  placeholder="حدثنا باختصار عن شغفك وتطلعاتك في إيناكوس قنا..."
                  value={formData.impactGoal}
                  onChange={(e) => setFormData({ ...formData, impactGoal: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(10, 11, 16, 0.8)',
                    border: '1px solid rgba(255, 184, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    color: '#fff',
                    fontSize: '0.92rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="btn-primary animate-pulse-glow"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '1rem',
                  fontSize: '1.1rem',
                }}
              >
                <Sparkles size={20} />
                <span>تأكيد التسجيل واستخراج بطاقة العضوية ☥</span>
              </button>
            </form>
          ) : (
            /* Digital Enactus Qena VIP Pass (Inspired by Image E7) */
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(255, 184, 0, 0.2)',
                  border: '2px solid #ffb800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                  color: '#ffd54f',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
                مرحباً بك في كتيبة الفراعنة!
              </h3>
              <p style={{ color: '#c5c5d6', fontSize: '0.95rem', marginBottom: '2rem' }}>
                تم استلام طلبك بنجاح. إليك بطاقة عضويتك الرقمية الخاصة بـ <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong>:
              </p>

              {/* The Excavated VIP Badge (Inspired by Image E7: The Future Was Found) */}
              <div
                className="gold-border-glow card-shine"
                style={{
                  maxWidth: '380px',
                  margin: '0 auto 2rem auto',
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg, #181924, #0b0c10)',
                  border: '2px solid rgba(255, 184, 0, 0.6)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 184, 0, 0.25)',
                  overflow: 'hidden',
                  textAlign: 'right',
                  position: 'relative',
                }}
              >
                {/* Lanyard cutout */}
                <div
                  style={{
                    width: '50px',
                    height: '10px',
                    borderRadius: '5px',
                    background: '#000',
                    margin: '12px auto 0 auto',
                    border: '1px solid rgba(255, 184, 0, 0.4)',
                  }}
                />

                <div style={{ padding: '1.5rem 1.75rem' }}>
                  {/* Badge Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img src="/assets/E2.jpg" alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                      <div>
                        <div className="font-cinzel" style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ffb800' }}>
                          ENACTUS QENA
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#a3a3b2' }}>South Valley University</div>
                      </div>
                    </div>

                    <span className="badge-gold font-cinzel" style={{ fontSize: '0.65rem' }}>
                      NC 2026
                    </span>
                  </div>

                  {/* Candidate Name */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#ffd54f', fontWeight: 600 }}>اسم المحارب:</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff' }}>
                      {formData.name}
                    </div>
                  </div>

                  {/* Faculty & Committee */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#a3a3b2' }}>الكلية:</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e0e0ec' }}>{formData.faculty}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#a3a3b2' }}>اللجنة:</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffb800' }}>{formData.committee}</div>
                    </div>
                  </div>

                  {/* Pass Serial & Motto */}
                  <div style={{ borderTop: '1px dashed rgba(255, 184, 0, 0.3)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#888' }}>كود التسجيل:</div>
                      <div className="font-cinzel" style={{ fontSize: '0.82rem', color: '#ffd54f', fontWeight: 800 }}>
                        {memberId}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#ffb800', fontStyle: 'italic', fontWeight: 600 }}>
                      PEOPLE. IDEAS. IMPACT.
                    </div>
                  </div>
                </div>

                {/* Golden Watermark */}
                <div style={{ position: 'absolute', bottom: '-15px', left: '-15px', fontSize: '5rem', color: 'rgba(255, 184, 0, 0.04)', pointerEvents: 'none' }}>
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
                    padding: '0.75rem 1.5rem',
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
                  style={{ padding: '0.75rem 1.75rem' }}
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
