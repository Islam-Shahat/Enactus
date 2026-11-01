import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Clock, Flame, ExternalLink, ShieldCheck } from 'lucide-react';
import { FacebookIcon } from './Icons';

export default function Hero({ onOpenJoinModal }) {
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
      title: "قميص معبد دندرة 2026",
      subtitle: "FROM QENA TO THE WORLD",
      desc: "من قلب الصعيد، حيث كُتب التاريخ على الحجر.. قادمون للمنافسة الوطنية NC بكل قوة.",
      tag: "THE EMBLEM",
      img: "/assets/E9.jpg",
    },
    {
      title: "كتيبة الفراعنة: فريق واحد، هدف واحد",
      subtitle: "ONE TEAM. ONE GOAL.",
      desc: "أدوار مختلفة، ومهمة واحدة.. أثر أكبر معاً لكل لجان ومبدعي إيناكوس قنا.",
      tag: "THE PHARAOHS",
      img: "/assets/E6.jpg",
    },
    {
      title: "شفرة المستقبل المدفونة",
      subtitle: "THE FUTURE WAS FOUND",
      desc: "اكتشف بطاقة عضويتك في إيناكوس.. البشر، الأفكار، والأثر الحقيقي.",
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
          right: '5%',
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
          left: '5%',
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
              قنا، صعيد مصر
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
          {/* Left Column (Text & Urgency) */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge-gold">
                <Flame size={14} color="#ffb800" />
                استعدوا.. قادمون للـ NC
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
              من قلب الصعيد..
              <br />
              <span className="gold-gradient-text font-cinzel" style={{ letterSpacing: '0.02em' }}>
                نحمل أثرنا للعالم!
              </span>
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
              حيث كُتب التاريخ على جدران معبد دندرة بحجر لا يزول.. نطلق في <strong style={{ color: '#ffd54f' }}>Enactus Qena</strong> إبداع طلاب جامعة جنوب الوادي لنبني مشاريع ريادية تغير حياة آلاف الأسر ونصعد بها إلى العالمية.
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
                      باب التقديم مفتوح الآن!
                    </span>
                    <span className="countdown-status-badge">
                      <span className="countdown-live-pulse" />
                      FORM OPEN
                    </span>
                  </div>
                  <p className="countdown-banner-subtitle">
                    "Don't just apply... LEAVE YOUR MARK!" لا تكتفِ بالتقديم، اترك أثرك.
                  </p>
                </div>
              </div>

              {/* Digital Timer */}
              <div className="countdown-timer-wrap">
                <div className="countdown-digit-box">
                  <div className="countdown-digit-num">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="countdown-digit-label">ساعة</div>
                </div>
                <span className="countdown-digit-sep">:</span>
                <div className="countdown-digit-box">
                  <div className="countdown-digit-num">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="countdown-digit-label">دقيقة</div>
                </div>
                <span className="countdown-digit-sep">:</span>
                <div className="countdown-digit-box">
                  <div className="countdown-digit-num">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="countdown-digit-label">ثانية</div>
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
                <span>انضم للأسطورة (سجل الآن)</span>
              </button>

              <a href="#committees" className="btn-secondary">
                <span>استكشف كتيبة الفراعنة</span>
                <ArrowLeft size={18} />
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
                <span>11,700+ متابع على فيسبوك</span>
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
                    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className="card-zoom"
                />

                {/* Gradient vignette */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(8,8,12,0.95) 0%, rgba(8,8,12,0.2) 60%, transparent 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span className="badge-gold font-cinzel" style={{ fontSize: '0.72rem' }}>
                      {visualCards[activeVisual].tag}
                    </span>
                    <span className="font-outfit" style={{ fontSize: '0.8rem', color: '#ffb800', fontWeight: 700 }}>
                      0{activeVisual + 1} / 03
                    </span>
                  </div>
                  <h3 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                    {visualCards[activeVisual].title}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#d1d1de', margin: 0, lineHeight: 1.45 }}>
                    {visualCards[activeVisual].desc}
                  </p>
                </div>
              </div>

              {/* Navigation Thumbnails below main image */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.6rem',
                  marginTop: '0.85rem',
                }}
              >
                {visualCards.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveVisual(idx)}
                    style={{
                      padding: '0.5rem 0.3rem',
                      borderRadius: '12px',
                      background: activeVisual === idx ? 'rgba(255, 184, 0, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1.5px solid ${activeVisual === idx ? '#ffb800' : 'rgba(255, 184, 0, 0.15)'}`,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      boxShadow: activeVisual === idx ? '0 0 15px rgba(255, 184, 0, 0.3)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: activeVisual === idx ? '#ffd54f' : '#a3a3b2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.tag}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Floating emblem stamp */}
            <div
              className="animate-float-reverse hero-emblem-stamp"
              style={{
                position: 'absolute',
                top: '-25px',
                left: '-25px',
                width: '85px',
                height: '85px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffd752, #c47c00)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 25px rgba(255, 184, 0, 0.5)',
                color: '#08080a',
                zIndex: 20,
                border: '2px solid #fff',
              }}
            >
              <span className="font-cinzel" style={{ fontWeight: 900, fontSize: '0.85rem' }}>NC</span>
              <span style={{ fontWeight: 900, fontSize: '0.65rem' }}>2026</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
        @media (max-width: 768px) {
          .hero-section-responsive {
            padding-top: 100px !important;
            padding-bottom: 50px !important;
            min-height: auto !important;
          }
          .hero-emblem-stamp {
            left: 10px !important;
            top: -15px !important;
            width: 65px !important;
            height: 65px !important;
          }
        }
        @media (max-width: 480px) {
          .hero-cta-buttons > * {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </section>
  );
}
