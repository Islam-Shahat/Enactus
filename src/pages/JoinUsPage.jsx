import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Sparkles, User, Phone, CheckCircle2, Copy, Check, ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { useApplicationsOpen } from '../hooks/usePublicContent';
import { useLanguage } from '../context/LanguageContext';
import { FACULTIES, ACADEMIC_YEARS, RECRUITMENT_COMMITTEES } from '../services/mockLocalization';
import SEO from '../components/SEO';

export default function JoinUsPage() {
  const [searchParams] = useSearchParams();
  const preselectedCommittee = searchParams.get('committee') || '';
  const { data: applicationsOpen = true } = useApplicationsOpen();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const defaultFaculty = isAr ? 'كلية الهندسة' : 'Faculty of Engineering';
  const defaultYear = isAr ? 'الفرقة الثانية' : '2nd Year (Sophomore)';
  const defaultComm = isAr ? 'إدارة المشاريع التنموية (PM)' : 'Project Management (PM)';

  const [formData, setFormData] = useState({
    name: '',
    faculty: defaultFaculty,
    year: defaultYear,
    phone: '',
    committee: preselectedCommittee || defaultComm,
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

  // Synchronize defaults on language switch
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      faculty: isAr ? 'كلية الهندسة' : 'Faculty of Engineering',
      year: isAr ? 'الفرقة الثانية' : '2nd Year (Sophomore)',
      committee: preselectedCommittee || (isAr ? 'إدارة المشاريع التنموية (PM)' : 'Project Management (PM)'),
    }));
  }, [lang, preselectedCommittee, isAr]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert(isAr ? 'يرجى ملء الاسم ورقم الهاتف للمتابعة' : 'Please fill in your name and phone number to continue.');
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
    <div className="page-container-padding" dir={dir} style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={isAr ? 'انضم إلينا (Recruitment)' : 'Join Us (Recruitment)'}
        description={isAr
          ? 'انضم لكتيبة إيناكوس قنا - جامعة جنوب الوادي للموسم الجديد 2026. قدّم الآن لإحدى اللجان السبع.'
          : 'Join the Enactus Qena battalion - South Valley University for the 2026 season. Apply now to one of the seven committees.'}
      />
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3.5rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            RECRUITMENT PORTAL • 2026
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            {isAr ? (
              <>اترك أثرك الخالد: <span className="gold-gradient-text">انضم لكتيبة إيناكوس قنا</span></>
            ) : (
              <>LEAVE YOUR MARK: <span className="gold-gradient-text">Join Enactus Qena Battalion</span></>
            )}
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            {isAr
              ? '"The future was found, and it\'s looking for you!" لا تكتفِ بالمشاهدة، كن أحد فرسان التغيير ومبتكري المشاريع التي تخدم صعيد مصر وتصعد للمسابقة الوطنية.'
              : '"The future was found, and it\'s looking for you!" Don\'t just watch; become one of the changemakers driving social startups that uplift Upper Egypt and compete on the national stage.'}
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
            border: applicationsOpen ? '1px solid rgba(255, 184, 0, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={20} color={applicationsOpen ? '#ffb800' : '#ef4444'} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
              {applicationsOpen
                ? (isAr ? 'باب التقديم مفتوح لجميع كليات جامعة جنوب الوادي' : 'Applications are open to all South Valley University faculties')
                : (isAr ? 'باب التقديم مغلق حالياً للموسم الجديد' : 'Applications are currently closed for the new season')}
            </span>
          </div>
          <span
            className="badge-gold"
            style={{
              background: applicationsOpen ? '#ffd54f' : 'rgba(239, 68, 68, 0.15)',
              color: applicationsOpen ? '#08080a' : '#fca5a5',
              borderColor: applicationsOpen ? 'transparent' : 'rgba(239, 68, 68, 0.4)',
              fontWeight: 900,
            }}
          >
            {applicationsOpen ? (isAr ? 'FORM OPEN' : 'APPLICATIONS OPEN') : (isAr ? 'APPLICATIONS CLOSED' : 'CLOSED')}
          </span>
        </div>

        {/* Form or Result Card or Closed Card */}
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {!applicationsOpen ? (
            <div
              className="glass-panel gold-border-glow"
              style={{
                borderRadius: '24px',
                padding: '3.5rem 2rem',
                textAlign: 'center',
                background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.98))',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(255, 184, 0, 0.15)',
                  border: '2px solid #ffb800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffd54f',
                  margin: '0 auto 1.5rem auto',
                }}
              >
                <Clock size={34} />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>
                {isAr ? 'باب التقديم مغلق حالياً' : 'Applications Are Currently Closed'}
              </h2>
              <p style={{ color: '#c5c5d6', fontSize: '1.05rem', lineHeight: 1.8, maxWidth: '520px', margin: '0 auto 2.5rem auto' }}>
                {isAr
                  ? 'انتهت فترة استقبال طلبات الانضمام للموسم الحالي. تابع صفحاتنا الرسمية على منصات التواصل الاجتماعي للإعلان عن فتح باب التقديم للمراحل القادمة.'
                  : 'Recruitment for the current season has ended. Follow our official social media channels for announcements regarding upcoming recruitment waves.'}
              </p>
              <Link to="/" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
                <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
                {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>
            </div>
          ) : !isSubmitted ? (
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
                    {isAr ? 'الاسم بالكامل (ثلاثي أو رباعي) *' : 'Full Name (3 or 4 names) *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      placeholder={isAr ? 'مثال: يوسف محمود عبد الرحيم' : 'e.g. Youssef Mahmoud'}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: isAr ? '0.9rem 1rem 0.9rem 2.8rem' : '0.9rem 2.8rem 0.9rem 1rem',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                      }}
                    />
                    <User size={18} color="#ffb800" style={{ position: 'absolute', [isAr ? 'left' : 'right']: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                {/* Faculty & Academic Year */}
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      {isAr ? 'الكلية بجامعة جنوب الوادي *' : 'Faculty at SVU *'}
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
                    <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      {isAr ? 'الفرقة الدراسية *' : 'Academic Year *'}
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

                {/* Phone */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {isAr ? 'رقم الهاتف (الواتساب لتحديد موعد المقابلة) *' : 'Phone Number (WhatsApp for interview schedule) *'}
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
                        padding: isAr ? '0.9rem 1rem 0.9rem 2.8rem' : '0.9rem 2.8rem 0.9rem 1rem',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                        direction: 'ltr',
                        textAlign: isAr ? 'right' : 'left',
                      }}
                    />
                    <Phone size={18} color="#ffb800" style={{ position: 'absolute', [isAr ? 'left' : 'right']: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                {/* Committee selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700 }}>
                      {isAr ? 'اللجنة التي ترغب في الانضمام إليها *' : 'Committee You Wish to Join *'}
                    </label>
                    <Link to="/committees" style={{ color: '#ffb800', fontSize: '0.8rem', textDecoration: 'none' }}>
                      {isAr ? 'دليل مهام اللجان ←' : 'Committees Guide →'}
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

                {/* Impact Goal */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {isAr
                      ? 'ما هو الأثر أو المهارة التي تطمح لإضافتها للكتيبة ومجتمع قنا؟'
                      : 'What impact or skills do you aim to bring to the battalion and Qena community?'}
                  </label>
                  <textarea
                    rows="3"
                    placeholder={isAr ? 'حدثنا باختصار عن أفكارك وشغفك...' : 'Briefly tell us about your passion, ideas, and motivation...'}
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
                  <span>{isAr ? 'تأكيد التسجيل واستخراج بطاقة العضوية ☥' : 'Confirm Registration & Issue Membership Pass ☥'}</span>
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
                {isAr ? 'تم استلام طلبك بنجاح!' : 'Application Received Successfully!'}
              </h2>
              <p style={{ color: '#c5c5d6', fontSize: '1.05rem', marginBottom: '2.5rem' }}>
                {isAr ? (
                  <>أهلاً بك في مرحلة الانطلاق. إليك بطاقة عضويتك الرسمية الخاصة بـ <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong>:</>
                ) : (
                  <>Welcome to the launch journey! Here is your official VIP Pass for <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong>:</>
                )}
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
                  textAlign: isAr ? 'right' : 'left',
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
                    <div style={{ fontSize: '0.75rem', color: '#ffd54f', fontWeight: 600 }}>
                      {isAr ? 'اسم المحارب:' : 'Member Name:'}
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff' }}>{formData.name}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#a3a3b2' }}>{isAr ? 'الكلية:' : 'Faculty:'}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#e0e0ec' }}>{formData.faculty}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#a3a3b2' }}>{isAr ? 'اللجنة:' : 'Committee:'}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffb800' }}>{formData.committee}</div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px dashed rgba(255, 184, 0, 0.35)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#888' }}>{isAr ? 'كود التسجيل:' : 'Pass Serial:'}</div>
                      <div className="font-cinzel" style={{ fontSize: '0.92rem', color: '#ffd54f', fontWeight: 800 }}>{memberId}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#ffb800', fontStyle: 'italic', fontWeight: 700 }}>
                      PEOPLE. IDEAS. IMPACT.
                    </div>
                  </div>
                </div>

                <div style={{ position: 'absolute', bottom: '-20px', [isAr ? 'left' : 'right']: '-20px', fontSize: '6rem', color: 'rgba(255, 184, 0, 0.04)', pointerEvents: 'none' }}>
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
                  <span>{copied ? (isAr ? 'تم نسخ كود العضوية!' : 'Pass ID Copied!') : (isAr ? 'نسخ كود العضوية' : 'Copy Pass ID')}</span>
                </button>

                <a
                  href="https://www.facebook.com/Enactus.svu"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ padding: '0.85rem 2rem' }}
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
