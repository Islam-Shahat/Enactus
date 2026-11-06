import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Lock, AlertCircle, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { t } from '../lib/strings';
import LanguageToggle from '../components/LanguageToggle';
import SEO from '../components/SEO';

const resetSchema = z
  .object({
    password: z.string().min(8, { message: t('passwordMinLength') }),
    confirmPassword: z.string().min(1, { message: 'يرجى تأكيد كلمة المرور' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t('passwordsDoNotMatch'),
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage() {
  const { session, updatePassword } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    let mounted = true;

    // Supabase detectSessionInUrl automatically extracts recovery token
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setHasValidSession(true);
      }
      setIsVerifying(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || s) {
        setHasValidSession(true);
      }
      setIsVerifying(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const { error } = await updatePassword(values.password);
      if (error) {
        setServerError(error.message || t('invalidRecoveryLink'));
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch {
      setServerError(t('invalidRecoveryLink'));
    }
  };

  if (isVerifying) {
    return (
      <div
        style={{
          minHeight: '75vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffd54f',
        }}
      >
        <p>{t('loading')}</p>
      </div>
    );
  }

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
          dir={dir}
          style={{
            borderRadius: '28px',
            padding: '3rem 2.5rem',
            background: 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(10, 11, 16, 0.98))',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 184, 0, 0.2)',
            position: 'relative',
          }}
        >
          <SEO title={isAr ? 'تعيين كلمة مرور جديدة' : 'Reset Password'} noindex={true} />
          <div style={{ position: 'absolute', top: '1.25rem', insetInlineEnd: '1.25rem' }}>
            <LanguageToggle />
          </div>
          {!hasValidSession && !session ? (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '2px solid #ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                <AlertCircle size={32} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
                رابط غير صالح
              </h2>
              <p style={{ color: '#c5c5d6', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                {t('invalidRecoveryLink')}
              </p>
              <Link to="/forgot-password" className="btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
                <span>طلب رابط جديد</span>
              </Link>
            </div>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
                  <KeyRound size={30} />
                </div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '0.4rem' }}>
                  {t('resetTitle')}
                </h1>
                <p style={{ color: '#a0a0b2', fontSize: '0.88rem', margin: 0 }}>
                  {t('resetSubtitle')}
                </p>
              </div>

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
                <div style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="reset-password" style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {t('newPasswordLabel')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="reset-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
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
                    <Lock
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

                <div style={{ marginBottom: '1.75rem' }}>
                  <label htmlFor="reset-confirmPassword" style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {t('confirmPasswordLabel')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="reset-confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      {...register('confirmPassword')}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: errors.confirmPassword ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem 0.85rem 2.8rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        direction: 'ltr',
                        textAlign: 'left',
                      }}
                    />
                    <ShieldCheck
                      size={18}
                      color="#ffb800"
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                      {errors.confirmPassword.message}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '0.95rem',
                    fontSize: '1rem',
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    marginBottom: '1.25rem',
                  }}
                >
                  <span>{isSubmitting ? t('updatingPassword') : t('updatePasswordButton')}</span>
                </button>

                <div style={{ textAlign: 'center' }}>
                  <Link
                    to="/login"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#a0a0b2',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                    }}
                  >
                    <ArrowIcon size={14} />
                    <span>{t('backToLogin')}</span>
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

