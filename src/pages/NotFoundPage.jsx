import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Compass, Home, ArrowRight, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

export default function NotFoundPage() {
  const { lang, dir } = useLanguage();
  const { isDark } = useTheme();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={dir}
      style={{
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <SEO
        title={isAr ? 'الصفحة غير موجودة (404)' : 'Page Not Found (404)'}
        description={isAr ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.' : 'Sorry, the page you are looking for does not exist or has been moved.'}
        noindex={true}
      />
      <div
        className="glass-panel gold-border-glow"
        style={{
          maxWidth: '560px',
          width: '100%',
          borderRadius: '24px',
          padding: '3rem 2rem',
          background: isDark
            ? 'linear-gradient(150deg, rgba(20, 22, 32, 0.95), rgba(10, 11, 16, 0.95))'
            : 'rgba(255, 255, 255, 0.96)',
          boxShadow: isDark
            ? '0 25px 60px rgba(0, 0, 0, 0.8)'
            : '0 20px 45px rgba(184, 120, 0, 0.12)',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: isDark ? 'rgba(255, 184, 0, 0.12)' : 'rgba(217, 119, 6, 0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffd54f',
            marginBottom: '1.5rem',
          }}
        >
          <Compass size={36} color={isDark ? '#ffd54f' : '#b45309'} />
        </div>

        <h1
          className="font-cinzel"
          style={{
            fontSize: '3.5rem',
            margin: '0 0 0.5rem 0',
            color: isDark ? '#ffd54f' : '#b45309',
            lineHeight: 1,
            fontWeight: 900,
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: isDark ? '#ffffff' : '#0f111a',
            margin: '0 0 1rem 0',
          }}
        >
          {isAr ? 'الصفحة غير موجودة' : 'Page Not Found'}
        </h2>

        <p
          style={{
            fontSize: '0.98rem',
            lineHeight: 1.6,
            color: isDark ? '#a0a0b2' : '#4b5563',
            margin: '0 auto 2rem auto',
            maxWidth: '420px',
          }}
        >
          {isAr
            ? 'عذراً، يبدو أن الرابط الذي تبحث عنه غير صحيح أو تم نقله أو حذفه مؤقتاً.'
            : 'Sorry, the page you are looking for does not exist, has been removed, or was moved.'}
        </p>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/"
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.6rem',
              borderRadius: '12px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <Home size={18} />
            <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </Link>
          <Link
            to="/events"
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderRadius: '12px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>{isAr ? 'استكشف فعالياتنا' : 'Explore Events'}</span>
            <ArrowIcon size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

