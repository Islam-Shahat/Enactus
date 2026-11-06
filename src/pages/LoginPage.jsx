import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { t } from '../lib/strings';
import LanguageToggle from '../components/LanguageToggle';
import SEO from '../components/SEO';

// In-memory cache for ultra-fast instantaneous email resolution
const identifierCache = new Map();
const inFlightResolutions = new Map();

const getCachedEmail = (identifier) => {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  if (clean.includes('@')) return clean;
  if (identifierCache.has(clean)) return identifierCache.get(clean);
  try {
    const stored = localStorage.getItem(`enactus_login_id_${clean}`);
    if (stored) {
      identifierCache.set(clean, stored);
      return stored;
    }
  } catch (_) {}
  return null;
};

const setCachedEmail = (identifier, email) => {
  if (!identifier || !email) return;
  const clean = identifier.trim().toLowerCase();
  identifierCache.set(clean, email);
  try {
    localStorage.setItem(`enactus_login_id_${clean}`, email);
  } catch (_) {}
};

// Preload dashboard code in the background during idle time
let dashboardPreloaded = false;
const preloadDashboardChunks = () => {
  if (dashboardPreloaded) return;
  dashboardPreloaded = true;
  try {
    import('./dashboard/DashboardLayout');
    import('./dashboard/DashboardHome');
  } catch (_) {}
};

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, { message: 'يرجى إدخال البريد الإلكتروني أو كود العضو (7 أرقام)' }),
  password: z.string().min(1, { message: 'يرجى إدخال كلمة المرور (الرقم القومي)' }),
});

export default function LoginPage() {
  const { isAuthenticated, signIn } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const location = useLocation();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  // Pre-resolve member code or national ID in the background as the user types
  const preResolveIdentifier = useCallback(async (rawInput) => {
    if (!rawInput) return;
    const clean = rawInput.trim().toLowerCase();
    if (clean.includes('@') || clean.length < 4) return;
    if (getCachedEmail(clean)) return;

    if (inFlightResolutions.has(clean)) {
      return inFlightResolutions.get(clean);
    }

    const promise = (async () => {
      try {
        const { data: resolvedEmail } = await supabase.rpc('get_member_login_email', {
          p_identifier: clean,
        });
        if (resolvedEmail) {
          setCachedEmail(clean, resolvedEmail);
          return resolvedEmail;
        } else {
          const fallback = `${clean}@portal.enactusqena.org`;
          setCachedEmail(clean, fallback);
          return fallback;
        }
      } catch {
        const fallback = `${clean}@portal.enactusqena.org`;
        setCachedEmail(clean, fallback);
        return fallback;
      } finally {
        inFlightResolutions.delete(clean);
      }
    })();

    inFlightResolutions.set(clean, promise);
    return promise;
  }, []);

  // Preload dashboard in background as soon as page mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      preloadDashboardChunks();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Prevent browser back button from re-entering dashboard after signing out
  useEffect(() => {
    if (location.state?.loggedOut) {
      window.history.pushState(null, '', window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href);
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [location.state?.loggedOut]);

  if (isAuthenticated) {
    const destination = location.state?.from || '/dashboard';
    return <Navigate to={destination} replace />;
  }

  const onSubmit = async (values) => {
    setServerError('');
    if (!isSupabaseConfigured) {
      setServerError(t('supabaseNotConfigured'));
      return;
    }

    const input = values.identifier.trim();
    let emailToUse = getCachedEmail(input) || input;

    // If identifier is member code or national ID and not yet resolved
    if (!emailToUse.includes('@')) {
      if (inFlightResolutions.has(input.toLowerCase())) {
        emailToUse = await inFlightResolutions.get(input.toLowerCase());
      } else {
        emailToUse = await preResolveIdentifier(input) || `${input}@portal.enactusqena.org`;
      }
    }

    try {
      const { error } = await signIn(emailToUse, values.password.trim());
      if (error) {
        setServerError(
          isAr
            ? 'فشل تسجيل الدخول. يرجى التحقق من كود العضو / البريد والرقم القومي (كلمة المرور).'
            : 'Login failed. Please verify your member code / email and National ID.'
        );
        return;
      }
      const destination = location.state?.from || '/dashboard';
      navigate(destination, { replace: true });
    } catch {
      setServerError(t('loginGenericError'));
    }
  };

  return (
    <div
      className="page-container-padding"
      style={{
        paddingTop: '120px',
        paddingBottom: '100px',
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: '520px' }}>
        <div
          className="glass-panel gold-border-glow card-shine responsive-panel-p"
          style={{
            borderRadius: '28px',
            padding: '3rem 2.5rem',
            background: 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(10, 11, 16, 0.98))',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 184, 0, 0.2)',
            position: 'relative',
          }}
        >
          <SEO title={t('loginTitle')} noindex={true} />
          <div style={{ position: 'absolute', top: '1.25rem', insetInlineEnd: '1.25rem' }}>
            <LanguageToggle />
          </div>

          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '2px solid rgba(255, 184, 0, 0.5)',
                margin: '0 auto 1rem auto',
                boxShadow: '0 0 25px rgba(255, 184, 0, 0.3)',
                background: '#0d0d12',
              }}
            >
              <img src="/assets/E2.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            <span className="badge-gold font-cinzel" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              INTERNAL MEMBER PORTAL
            </span>

            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 1.8rem)', fontWeight: 900, color: '#fff', marginBottom: '0.25rem' }}>
              {t('loginTitle')}
            </h1>
            <p style={{ color: '#a0a0b2', fontSize: '0.85rem', margin: 0 }}>
              {t('loginSubtitle')}
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div
              style={{
                background: 'rgba(255, 184, 0, 0.1)',
                border: '1px solid rgba(255, 184, 0, 0.4)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                color: '#ffd54f',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{t('supabaseNotConfigured')}</span>
            </div>
          )}

          {serverError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                color: '#fca5a5',
                fontSize: '0.88rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Identifier Field: Email or 7-Digit Member Code */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  color: '#ffd54f',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  marginBottom: '0.4rem',
                }}
              >
                {isAr
                  ? 'البريد الإلكتروني أو كود العضو (7 أرقام)'
                  : 'Email or Member Code (7 digits)'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-email"
                  type="text"
                  autoComplete="username"
                  placeholder={
                    isAr ? '2026001 أو islam@gmail.com' : '2026001 or islam@gmail.com'
                  }
                  {...register('identifier', {
                    onChange: (e) => {
                      const val = e.target.value?.trim();
                      if (val && (val.length === 7 || val.length === 14)) {
                        preResolveIdentifier(val);
                      }
                    },
                  })}
                  onBlur={(e) => {
                    preResolveIdentifier(e.target.value);
                  }}
                  onFocus={() => {
                    preloadDashboardChunks();
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(10, 11, 16, 0.85)',
                    border: errors.identifier ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem 0.85rem 2.8rem',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    direction: 'ltr',
                    textAlign: 'left',
                  }}
                />
                <Mail
                  size={18}
                  color="#ffb800"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
              {errors.identifier && (
                <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                  {errors.identifier.message}
                </span>
              )}
            </div>

            {/* Password Field: National ID for members */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor="login-password" style={{ color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700 }}>
                  {isAr ? 'كلمة المرور (الرقم القومي للأعضاء)' : 'Password (National ID for members)'}
                </label>
                <Link
                  to="/forgot-password"
                  style={{ color: '#a3a3b2', fontSize: '0.82rem', textDecoration: 'none', transition: 'color 0.2s' }}
                >
                  {t('forgotPasswordLink')}
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={isAr ? 'الرقم القومي (14 رقماً)' : 'National ID (14 digits)'}
                  {...register('password')}
                  onFocus={() => {
                    preloadDashboardChunks();
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(10, 11, 16, 0.85)',
                    border: errors.password ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem 0.85rem 2.8rem',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    direction: 'ltr',
                    textAlign: 'left',
                  }}
                />
                <KeyRound
                  size={18}
                  color="#ffb800"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
              {errors.password && (
                <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Helper callout for members */}
            <div
              style={{
                background: 'rgba(255, 184, 0, 0.05)',
                border: '1px dashed rgba(255, 184, 0, 0.3)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                color: '#ffd54f',
                fontSize: '0.82rem',
                marginBottom: '1.5rem',
                lineHeight: 1.5,
              }}
            >
              {isAr
                ? '💡 للأعضاء الجدد: كود العضو مكون من 7 أرقام (مثال: 2026001)، وكلمة المرور الافتراضية هي رقمك القومي المكون من 14 رقماً.'
                : '💡 For new members: Your 7-digit Member Code (e.g., 2026001) is your login ID, and your default password is your 14-digit National ID.'}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.95rem',
                fontSize: '1.05rem',
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <Lock size={18} />
              <span>{isSubmitting ? t('loggingIn') : t('loginButton')}</span>
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#a3a3b2',
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              <span>العودة للرئيسية</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
