import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, ArrowRight, Clock, Flame, ExternalLink, ShieldCheck } from 'lucide-react';
import { FacebookIcon } from './Icons';
import { useLanguage } from '../context/LanguageContext';
import { useApplicationsOpen } from '../hooks/usePublicContent';

export default function Hero({ onOpenJoinModal }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const { data: applicationsOpen = true } = useApplicationsOpen();

  // Countdown timer simulation for recruitment
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 48, seconds: 12 });
  const [activeVisual, setActiveVisual] = useState(0);

  useEffect(() => {
    if (!applicationsOpen) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [applicationsOpen]);

  const visualCards = [
    {
      title: isAr ? "قميص معبد دندرة 2026" : "Dendera Temple Kit 2026",
      subtitle: "FROM QENA TO THE WORLD",
      desc: isAr
        ? "من قلب الصعيد، حيث كُتب التاريخ على الحجر.. قادمون للمنافسة الوطنية NC بكل قوة."
        : "From the heart of Upper Egypt, where history is etched in stone.. Competing fiercely in the National Competition.",
      tag: "THE EMBLEM",
      img: "/assets/E9.jpg",
    },
    {
      title: isAr ? "كتيبة الفراعنة: فريق واحد، هدف واحد" : "Pharaohs Battalion: One Team, One Goal",
      subtitle: "ONE TEAM. ONE GOAL.",
      desc: isAr
        ? "أدوار مختلفة، ومهمة واحدة.. أثر أكبر معاً لكل لجان ومبدعي إيناكوس قنا."
        : "Diverse roles, one unified mission.. Crafting greater impact together across all Enactus Qena committees.",
      tag: "THE PHARAOHS",
      img: "/assets/E6.jpg",
    },
    {
      title: isAr ? "شفرة المستقبل المدفونة" : "The Buried Code of the Future",
      subtitle: "THE FUTURE WAS FOUND",
      desc: isAr
        ? "اكتشف بطاقة عضويتك في إيناكوس.. البشر، الأفكار، والأثر الحقيقي."
        : "Discover your Enactus membership card.. The people, the ideas, and real sustainable impact.",
      tag: "THE DISCOVERY",
      img: "/assets/E7.jpg",
    },
  ];

  return (
    <section
      id="hero"
      className="hero-section-responsive"
      style={{
        position: 'relative',
        minHeight: '100vh',
        paddingTop: '120px',
        paddingBottom: '80px',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background Rotating Sun Rays */}
      <div className="sun-rays" />

      {/* Decorative Ancient Egyptian Glyphs in backdrop */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: isAr ? '5%' : 'auto',
          left: isAr ? 'auto' : '5%',
          fontSize: '12rem',
          color: 'rgba(255, 184, 0, 0.02)',
          userSelect: 'none',
          pointerEvents: 'none',
          fontFamily: 'serif',
        }}
      >
        𓂀
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: isAr ? '5%' : 'auto',
          right: isAr ? 'auto' : '5%',
          fontSize: '14rem',
          color: 'rgba(255, 184, 0, 0.02)',
          userSelect: 'none',
          pointerEvents: 'none',
          fontFamily: 'serif',
        }}
      >
        ☥
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '100%' }}>
        {/* Top Tagline Pill */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', width: '100%', maxWidth: '100%' }}>
          <div
            className="glass-panel hero-tagline-pill"
          >
            <span style={{ color: '#ffb800' }}>☥</span>
            <span className="font-outfit hero-tagline-text" style={{ fontWeight: 700, color: '#ffd54f', letterSpacing: '0.06em', textAlign: 'center' }}>
              ENACTUS SOUTH VALLEY UNIVERSITY
            </span>
            <span style={{ color: '#ffb800' }}>•</span>
            <span className="hero-tagline-loc" style={{ color: '#fff', fontWeight: 600 }}>
              {isAr ? 'قنا، صعيد مصر' : 'Qena, Upper Egypt'}
            </span>
          </div>
        </div>

        {/* Main Hero Grid */}
        <div className="hero-grid">
          {/* Column 1 (Text & Urgency) */}
          <div style={{ textAlign: isAr ? 'right' : 'left', width: '100%', minWidth: 0, maxWidth: '100%' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', width: '100%', maxWidth: '100%' }}>
              <span className="badge-gold">
                <Flame size={14} color="#ffb800" />
                {isAr ? 'استعدوا.. قادمون للـ NC' : 'Get Ready.. NC 2026'}
              </span>
              <span className="badge-gold" style={{ maxWidth: '100%', whiteSpace: 'normal', textWrap: 'balance' }}>
                <ShieldCheck size={14} color="#ffd54f" style={{ flexShrink: 0 }} />
                <span>Empowering Change, Inspiring Innovation</span>
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.9rem, 4.8vw, 4.2rem)',
                lineHeight: 1.18,
                fontWeight: 900,
                marginBottom: '1.25rem',
                color: '#fff',
              }}
            >
              {isAr ? (
                <>
                  من قلب الصعيد..
                  <br />
                  <span className="gold-gradient-text font-cinzel" style={{ letterSpacing: '0.02em' }}>
                    نحمل أثرنا للعالم!
                  </span>
                </>
              ) : (
                <>
                  From Upper Egypt..
                  <br />
                  <span className="gold-gradient-text font-cinzel" style={{ letterSpacing: '0.02em' }}>
                    Carrying Our Impact Global!
                  </span>
                </>
              )}
            </h1>

            <p
              style={{
                fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
                color: '#c9c9d6',
                lineHeight: 1.75,
                marginBottom: '2rem',
                maxWidth: '620px',
                width: '100%',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              {isAr ? (
                <>
                  حيث كُتب التاريخ على جدران معبد دندرة بحجر لا يزول.. نطلق في <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong> إبداع طلاب جامعة جنوب الوادي لنبني مشاريع ريادية تغير حياة آلاف الأسر ونصعد بها إلى العالمية.
                </>
              ) : (
                <>
                  Where history was carved into the enduring stone of Dendera Temple, <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong> channels the ingenuity of South Valley University students to build sustainable enterprises that elevate our community to the world stage.
                </>
              )}
            </p>

            {/* Countdown Urgency Banner (Reacts directly to recruitment gate in settings) */}
            <div
              className={`glass-panel card-shine countdown-urgency-banner ${!applicationsOpen ? 'countdown-banner-closed' : ''}`}
              style={{
                borderRadius: '18px',
                padding: '1.25rem 1.25rem',
                marginBottom: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.25rem',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div className="countdown-banner-content" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 auto', minWidth: 0, maxWidth: '100%' }}>
                <div
                  className="countdown-clock-icon"
                  style={!applicationsOpen ? {
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    flexShrink: 0,
                  } : { flexShrink: 0 }}
                >
                  <Clock size={22} />
                </div>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <span
                      className="countdown-banner-title"
                      style={!applicationsOpen ? { color: '#fca5a5' } : undefined}
                    >
                      {applicationsOpen
                        ? (isAr ? 'باب التقديم مفتوح الآن!' : 'Recruitment Is Open!')
                        : (isAr ? 'باب التقديم مغلق حالياً' : 'Recruitment Is Closed')}
                    </span>
                    <span
                      className="countdown-status-badge"
                      style={!applicationsOpen ? {
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#fca5a5',
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                      } : undefined}
                    >
                      {applicationsOpen ? (
                        <>
                          <span className="countdown-live-pulse" />
                          FORM OPEN
                        </>
                      ) : (
                        (isAr ? 'مغلق' : 'CLOSED')
                      )}
                    </span>
                  </div>
                  <p
                    className="countdown-banner-subtitle"
                    style={!applicationsOpen ? { color: '#e2e8f0', opacity: 0.9, overflowWrap: 'break-word', wordBreak: 'break-word' } : { overflowWrap: 'break-word', wordBreak: 'break-word' }}
                  >
                    {applicationsOpen
                      ? (isAr
                          ? '"Don\'t just apply... LEAVE YOUR MARK!" لا تكتفِ بالتقديم، اترك أثرك.'
                          : '"Don\'t just apply... LEAVE YOUR MARK!"')
                      : (isAr
                          ? 'انتهى استقبال طلبات الانضمام لهذا الموسم. تابعوا قنواتنا الرسمية للموجات القادمة.'
                          : 'Applications are closed for this season. Follow our official channels for updates.')}
                  </p>
                </div>
              </div>

              {/* Digital Timer (Active when open) or Closed Status (when closed) */}
              {applicationsOpen ? (
                <div className="countdown-timer-wrap">
                  <div className="countdown-digit-box">
                    <div className="countdown-digit-num">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </div>
                    <div className="countdown-digit-label">{isAr ? 'ساعة' : 'Hours'}</div>
                  </div>
                  <span className="countdown-digit-sep">:</span>
                  <div className="countdown-digit-box">
                    <div className="countdown-digit-num">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </div>
                    <div className="countdown-digit-label">{isAr ? 'دقيقة' : 'Mins'}</div>
                  </div>
                  <span className="countdown-digit-sep">:</span>
                  <div className="countdown-digit-box">
                    <div className="countdown-digit-num">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <div className="countdown-digit-label">{isAr ? 'ثانية' : 'Secs'}</div>
                  </div>
                </div>
              ) : (
                <div
                  className="countdown-closed-tag"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    padding: '0.6rem 1rem',
                    borderRadius: '12px',
                    color: '#fca5a5',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <ShieldCheck size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span>{isAr ? 'اكتملت المقاعد لهذا الموسم' : 'Season Fully Staffed'}</span>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="hero-cta-buttons" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', width: '100%', maxWidth: '100%' }}>
              {applicationsOpen ? (
                <button
                  onClick={onOpenJoinModal}
                  className="btn-primary animate-pulse-glow"
                >
                  <Sparkles size={20} />
                  <span>{isAr ? 'انضم للأسطورة (سجل الآن)' : 'Join the Legacy (Apply)'}</span>
                </button>
              ) : (
                <a
                  href="#committees"
                  className="btn-primary"
                >
                  <Sparkles size={20} />
                  <span>{isAr ? 'استكشف كتيبة الفراعنة' : 'Explore Committees'}</span>
                </a>
              )}

              {applicationsOpen ? (
                <a href="#committees" className="btn-secondary">
                  <span>{isAr ? 'استكشف كتيبة الفراعنة' : 'Explore Committees'}</span>
                  <ArrowIcon size={18} />
                </a>
              ) : (
                <button
                  onClick={onOpenJoinModal}
                  className="btn-secondary"
                >
                  <span>{isAr ? 'معلومات التقديم' : 'Recruitment Info'}</span>
                  <ArrowIcon size={16} />
                </button>
              )}

              <a
                href="https://www.facebook.com/Enactus.svu"
                target="_blank"
                rel="noreferrer"
                className="hero-social-pill"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '9999px',
                  transition: 'all 0.3s ease',
                }}
              >
                <FacebookIcon size={16} />
                <span>{isAr ? '11,700+ متابع على فيسبوك' : '+11,700 Facebook Followers'}</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Right Column: Interactive 3D Visual Identity Showcase */}
          <div style={{ position: 'relative' }}>
            {/* Main Stage Frame */}
            <div
              className="glass-panel gold-border-glow animate-float responsive-panel-p"
              style={{
                borderRadius: '24px',
                padding: '1.25rem',
                position: 'relative',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 50px rgba(255, 184, 0, 0.2)',
              }}
            >
              {/* Image Preview with overlay badge */}
              <div
                className="hero-visual-img"
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '420px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#09090d',
                }}
              >
                <img
                  src={visualCards[activeVisual].img}
                  alt={visualCards[activeVisual].title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'all 0.5s ease',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(9, 9, 13, 0.95) 0%, rgba(9, 9, 13, 0.2) 50%, transparent 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span className="badge-gold font-cinzel" style={{ fontSize: '0.7rem' }}>
                      {visualCards[activeVisual].tag}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#ffb800' }}>
                      0{activeVisual + 1} / 03
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '0.3rem' }}>
                    {visualCards[activeVisual].title}
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: '#b5b5c6', margin: 0, lineHeight: 1.5 }}>
                    {visualCards[activeVisual].desc}
                  </p>
                </div>
              </div>

              {/* Thumbnails Navigator */}
              <div
                className="hero-visual-nav"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '0.45rem',
                  marginTop: '0.85rem',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {visualCards.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveVisual(idx)}
                    style={{
                      background: activeVisual === idx ? 'rgba(255, 184, 0, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      border: activeVisual === idx ? '1.5px solid #ffb800' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '0.55rem 0.25rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.25s ease',
                      boxShadow: activeVisual === idx ? '0 0 15px rgba(255, 184, 0, 0.25)' : 'none',
                      minWidth: 0,
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span className="font-cinzel" style={{ fontSize: 'clamp(0.58rem, 1.8vw, 0.68rem)', fontWeight: 800, color: activeVisual === idx ? '#ffd54f' : '#a3a3b2', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Glowing Pharaoh Stamp Badge */}
            <div
              className="badge-glow hero-stamp-badge"
              style={{
                position: 'absolute',
                top: '-20px',
                right: isAr ? '-10px' : 'auto',
                left: isAr ? 'auto' : '-10px',
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffd752 0%, #ffaa00 50%, #b37400 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                boxShadow: '0 0 30px rgba(255, 184, 0, 0.6)',
                zIndex: 20,
              }}
            >
              <span className="font-cinzel" style={{ fontSize: '0.75rem', fontWeight: 900, color: '#09090c', lineHeight: 1 }}>
                NC
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#16161a' }}>
                2026
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
