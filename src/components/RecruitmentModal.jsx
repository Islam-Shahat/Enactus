import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, User, Phone, Copy, Check, Clock } from 'lucide-react';
import { useApplicationsOpen } from '../hooks/usePublicContent';
import { useLanguage } from '../context/LanguageContext';
import { FACULTIES, ACADEMIC_YEARS, RECRUITMENT_COMMITTEES } from '../services/mockLocalization';

export default function RecruitmentModal({ isOpen, onClose, defaultCommittee = '' }) {
  const { data: applicationsOpen = true } = useApplicationsOpen();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const defaultFaculty = isAr ? 'كلية التجارة' : 'Faculty of Commerce';
  const defaultYear = isAr ? 'الفرقة الثانية' : '2nd Year (Sophomore)';
  const defaultComm = isAr ? 'إدارة المشاريع التنموية (PM)' : 'Project Management (PM)';

  const [formData, setFormData] = useState({
    name: '',
    faculty: defaultFaculty,
    year: defaultYear,
    phone: '',
    committee: defaultCommittee || defaultComm,
    impactGoal: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [copied, setCopied] = useState(false);

  // Synchronize defaults on language switch
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      faculty: isAr ? 'كلية التجارة' : 'Faculty of Commerce',
      year: isAr ? 'الفرقة الثانية' : '2nd Year (Sophomore)',
      committee: defaultCommittee || (isAr ? 'إدارة المشاريع التنموية (PM)' : 'Project Management (PM)'),
    }));
  }, [lang, defaultCommittee, isAr]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert(isAr ? 'يرجى ملء الاسم ورقم الهاتف للمتابعة' : 'Please enter your full name and phone number to continue.');
      return;
    }

    // Generate custom Enactus Qena Pass ID
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const passCode = `ENACTUS-SVU-${randomCode}`;
    setMemberId(passCode);
    setIsSubmitted(true);

    // Golden celebratory confetti burst!
    import('canvas-confetti').then((m) => {
      const confetti = m.default || m;
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ffaa00', '#ff8c00', '#ffffff'],
      });
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        dir={dir}
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
                {isSubmitted
                  ? (isAr ? 'بطاقة عضوية إيناكوس قنا الرسمية' : 'Official Enactus Qena VIP Pass')
                  : (isAr ? 'استمارة الانضمام - LEAVE YOUR MARK' : 'Application Form - LEAVE YOUR MARK')}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#ffb800' }}>
                Enactus South Valley University • 2026
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
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
          {!applicationsOpen ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(255, 184, 0, 0.15)',
                  border: '2px solid #ffb800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffd54f',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                <Clock size={32} />
              </div>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginBottom: '0.6rem' }}>
                {isAr ? 'باب التقديم مغلق حالياً' : 'Applications Are Currently Closed'}
              </h4>
              <p style={{ fontSize: '0.92rem', color: '#c5c5d6', lineHeight: 1.7, maxWidth: '420px', margin: '0 auto 1.75rem auto' }}>
                {isAr
                  ? 'تم إغلاق استمارة التقديم للموسم الحالي. تابع قنواتنا الرسمية لمعرفة مواعيد فتح باب التقديم للمراحل القادمة.'
                  : 'Recruitment for the current season is now closed. Follow our official channels for future announcements.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary"
                style={{ margin: '0 auto', padding: '0.65rem 1.8rem' }}
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          ) : !isSubmitted ? (
            <form onSubmit={handleSubmit}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <span className="badge-gold font-cinzel" style={{ marginBottom: '0.5rem' }}>
                  THE FUTURE WAS FOUND
                </span>
                <h4 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.4rem' }}>
                  {isAr ? (
                    <>لا تكتفِ بالتقديم.. <span className="gold-gradient-text">اترك أثرك الخالد!</span></>
                  ) : (
                    <>Don't Just Apply.. <span className="gold-gradient-text">LEAVE YOUR MARK!</span></>
                  )}
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#a0a0b2', margin: 0 }}>
                  {isAr
                    ? 'املأ بياناتك لتنضم لكتيبة قنا المنافسة على درع مصر للمشاريع الريادية.'
                    : 'Fill in your details to join the Qena battalion competing for the Egypt National Cup.'}
                </p>
              </div>

              {/* Field 1: Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'الاسم بالكامل (ثلاثي أو رباعي) *' : 'Full Name (3 or 4 names) *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'مثال: أحمد محمود عبد الرحيم' : 'e.g. Ahmed Mahmoud'}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.8)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: isAr ? '0.85rem 1rem 0.85rem 2.5rem' : '0.85rem 2.5rem 0.85rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  />
                  <User size={18} color="#ffb800" style={{ position: 'absolute', [isAr ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Field 2 & 3: Faculty & Year */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {isAr ? 'الكلية بجامعة جنوب الوادي *' : 'Faculty at SVU *'}
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
                    {FACULTIES.map((f, i) => {
                      const val = isAr ? f.ar : f.en;
                      return (
                        <option key={i} value={val}>
                          {val}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {isAr ? 'الفرقة الدراسية *' : 'Academic Year *'}
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
                    {ACADEMIC_YEARS.map((yr, i) => {
                      const val = isAr ? yr.ar : yr.en;
                      return (
                        <option key={i} value={val}>
                          {val}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Field 4: Phone / WhatsApp */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'رقم الهاتف (الواتساب للتواصل) *' : 'Phone Number (WhatsApp for interview contact) *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    required
                    placeholder={isAr ? 'مثال: 01012345678' : 'e.g. 01012345678'}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.8)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: isAr ? '0.85rem 1rem 0.85rem 2.5rem' : '0.85rem 2.5rem 0.85rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                      direction: 'ltr',
                      textAlign: isAr ? 'right' : 'left',
                    }}
                  />
                  <Phone size={18} color="#ffb800" style={{ position: 'absolute', [isAr ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Field 5: Committee Selection */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'اللجنة التي ترغب في الانضمام إليها *' : 'Committee You Wish to Join *'}
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
                  {RECRUITMENT_COMMITTEES.map((c, i) => {
                    const val = isAr ? c.ar : c.en;
                    return (
                      <option key={i} value={val}>
                        {val}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Field 6: Personal Impact Vision */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {isAr ? 'ما هو الأثر أو المهارة التي تريد إضافتها للفريق؟ (اختياري)' : 'What impact or skills do you hope to bring to the team? (Optional)'}
                </label>
                <textarea
                  rows="3"
                  placeholder={isAr ? 'حدثنا باختصار عن شغفك وتطلعاتك في إيناكوس قنا...' : 'Briefly tell us about your passion, skills, and goals with Enactus Qena...'}
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
                <span>{isAr ? 'تأكيد التسجيل واستخراج بطاقة العضوية ☥' : 'Confirm Registration & Issue Membership Pass ☥'}</span>
              </button>
            </form>
          ) : (
            /* Digital Enactus Qena VIP Pass */
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
                {isAr ? 'مرحباً بك في كتيبة الفراعنة!' : 'Welcome to the Pharaohs Battalion!'}
              </h3>
              <p style={{ color: '#c5c5d6', fontSize: '0.95rem', marginBottom: '2rem' }}>
                {isAr ? (
                  <>تم استلام طلبك بنجاح. إليك بطاقة عضويتك الرقمية الخاصة بـ <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong>:</>
                ) : (
                  <>Your application has been received successfully. Here is your digital VIP pass for <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong>:</>
                )}
              </p>

              {/* The Excavated VIP Badge */}
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
                  textAlign: isAr ? 'right' : 'left',
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
                    <div style={{ fontSize: '0.72rem', color: '#ffd54f', fontWeight: 600 }}>
                      {isAr ? 'اسم المحارب:' : 'Member Name:'}
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff' }}>
                      {formData.name}
                    </div>
                  </div>

                  {/* Faculty & Committee */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#a3a3b2' }}>{isAr ? 'الكلية:' : 'Faculty:'}</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e0e0ec' }}>{formData.faculty}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#a3a3b2' }}>{isAr ? 'اللجنة:' : 'Committee:'}</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffb800' }}>{formData.committee}</div>
                    </div>
                  </div>

                  {/* Pass Serial & Motto */}
                  <div style={{ borderTop: '1px dashed rgba(255, 184, 0, 0.3)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#888' }}>{isAr ? 'كود التسجيل:' : 'Pass Serial:'}</div>
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
                <div style={{ position: 'absolute', bottom: '-15px', [isAr ? 'left' : 'right']: '-15px', fontSize: '5rem', color: 'rgba(255, 184, 0, 0.04)', pointerEvents: 'none' }}>
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
                  <span>{copied ? (isAr ? 'تم نسخ كود العضوية!' : 'Pass ID Copied!') : (isAr ? 'نسخ كود العضوية' : 'Copy Pass ID')}</span>
                </button>

                <a
                  href="https://www.facebook.com/Enactus.svu"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.75rem' }}
                >
                  <span>{isAr ? 'متابعة إعلان المقابلات على فيسبوك' : 'Follow Interviews on Facebook'}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
