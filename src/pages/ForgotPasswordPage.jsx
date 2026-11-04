import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle2, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/strings';
import LanguageToggle from '../components/LanguageToggle';

const forgotSchema = z.object({
  email: z.email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }),
});

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values) => {
    try {
      await sendPasswordReset(values.email.trim());
    } catch (err) {
      // Intentionally neutral: do not disclose account status
      console.error('[sendPasswordReset]', err);
    } finally {
      setSubmitted(true);
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
      <div className="container" style={{ maxWidth: '500px' }}>
        <div
          className="glass-panel gold-border-glow card-shine responsive-panel-p"
          dir={dir}
          style={{
            borderRadius: '28px',
            padding: '3rem 2.5rem',
            background: 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(10, 11, 16, 0.98))',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8)',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: '1.25rem', insetInlineEnd: '1.25rem' }}>
            <LanguageToggle />
          </div>
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
              <Mail size={30} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '0.4rem' }}>
              {t('forgotTitle')}
            </h1>
            <p style={{ color: '#a0a0b2', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              {t('forgotSubtitle')}
            </p>
          </div>

          {submitted ? (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  color: '#86efac',
                  fontSize: '0.92rem',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                }}
              >
                <CheckCircle2 size={32} style={{ margin: '0 auto 0.75rem auto', display: 'block', color: '#22c55e' }} />
                <span>{t('resetNotice')}</span>
              </div>
              <Link to="/login" className="btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
                <span>{t('backToLogin')}</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ marginBottom: '1.75rem' }}>
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
                <Send size={16} />
                <span>{isSubmitting ? t('sendingLink') : t('sendResetLink')}</span>
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
          )}
        </div>
      </div>
    </div>
  );
}

