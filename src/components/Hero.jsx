import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, ArrowRight, Clock, Flame, ExternalLink, ShieldCheck } from 'lucide-react';
import { FacebookIcon } from './Icons';
import { useLanguage } from '../context/LanguageContext';

export default function Hero({ onOpenJoinModal }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  // Countdown timer simulation for recruitment
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 48, seconds: 12 });
  const [activeVisual, setActiveVisual] = useState(0);

  useEffect(() => {
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
  }, []);

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

      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Top Tagline Pill */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div
            className="glass-panel"
            style={{
              padding: '0.45rem 1.25rem',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              border: '1px solid rgba(255, 184, 0, 0.4)',
              boxShadow: '0 0 20px rgba(255, 184, 0, 0.15)',
            }}
          >
            <span style={{ color: '#ffb800' }}>☥</span>
            <span className="font-outfit" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffd54f', letterSpacing: '0.08em' }}>
              ENACTUS SOUTH VALLEY UNIVERSITY
            </span>
            <span style={{ color: '#ffb800' }}>•</span>
            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
              {isAr ? 'قنا، صعيد مصر' : 'Qena, Upper Egypt'}
            </span>
          </div>
        </div>

        {/* Main Hero Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: '3.5rem',
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          {/* Column 1 (Text & Urgency) */}
          <div style={{ textAlign: isAr ? 'right' : 'left' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge-gold">
                <Flame size={14} color="#ffb800" />
                {isAr ? 'استعدوا.. قادمون للـ NC' : 'Get Ready.. NC 2026'}
              </span>
              <span className="badge-gold">
                <ShieldCheck size={14} color="#ffd54f" />
                Empowering Change, Inspiring Innovation
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

            {/* Countdown Urgency Banner */}
            <div
              className="glass-panel card-shine countdown-urgency-banner"
              style={{
                borderRadius: '18px',
                padding: '1.25rem 1.6rem',
                marginBottom: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 280px' }}>
                <div className="countdown-clock-icon">
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <span className="countdown-banner-title">
                      {isAr ? 'باب التقديم مفتوح الآن!' : 'Recruitment Is Open!'}
                    </span>
                    <span className="countdown-status-badge">
                      <span className="countdown-live-pulse" />
                      FORM OPEN
                    </span>
                  </div>
                  <p className="countdown-banner-subtitle">
                    {isAr
                      ? '"Don\'t just apply... LEAVE YOUR MARK!" لا تكتفِ بالتقديم، اترك أثرك.'
                      : '"Don\'t just apply... LEAVE YOUR MARK!"'}
                  </p>
                </div>
              </div>

              {/* Digital Timer */}
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
            </div>

            {/* CTAs */}
            <div className="hero-cta-buttons" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={onOpenJoinModal}
                className="btn-primary animate-pulse-glow"
                style={{ fontSize: '1.05rem', padding: '0.9rem 2rem' }}
              >
                <Sparkles size={20} />
                <span>{isAr ? 'انضم للأسطورة (سجل الآن)' : 'Join the Legacy (Apply)'}</span>
              </button>

              <a href="#committees" className="btn-secondary">
                <span>{isAr ? 'استكشف كتيبة الفراعنة' : 'Explore Committees'}</span>
                <ArrowIcon size={18} />
              </a>

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
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.65rem',
                  marginTop: '0.85rem',
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
                      padding: '0.6rem 0.5rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.25s ease',
                      boxShadow: activeVisual === idx ? '0 0 15px rgba(255, 184, 0, 0.25)' : 'none',
                    }}
                  >
                    <span className="font-cinzel" style={{ fontSize: '0.68rem', fontWeight: 800, color: activeVisual === idx ? '#ffd54f' : '#a3a3b2', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Glowing Pharaoh Stamp Badge */}
            <div
              className="badge-glow"
              style={{
                position: 'absolute',
                top: '-20px',
                right: isAr ? '-15px' : 'auto',
                left: isAr ? 'auto' : '-15px',
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
