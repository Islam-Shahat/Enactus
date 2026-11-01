import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { t } from '../lib/strings';

const loginSchema = z.object({
  email: z.email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }),
  password: z.string().min(1, { message: 'يرجى إدخال كلمة المرور' }),
});

export default function LoginPage() {
  const { isAuthenticated, signIn } = useAuth();
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
      email: '',
      password: '',
    },
  });

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

    try {
      const { error } = await signIn(values.email.trim(), values.password);
      if (error) {
        setServerError(t('loginGenericError'));
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
            {/* Email Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                {t('emailLabel')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={t('emailPlaceholder')}
                  {...register('email')}
                  style={{
                    width: '100%',
                    background: 'rgba(10, 11, 16, 0.85)',
                    border: errors.email ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
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
              {errors.email && (
                <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700 }}>
                  {t('passwordLabel')}
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
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('passwordPlaceholder')}
                  {...register('password')}
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
