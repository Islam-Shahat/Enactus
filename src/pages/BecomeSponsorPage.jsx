import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sponsorshipTiers } from '../data/enactusData';
import { useSponsorshipTiers } from '../hooks/usePublicContent';
import SEO from '../components/SEO';
import Turnstile from '../components/Turnstile';
import { sponsorFormSchema } from '../lib/schemas';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { Send, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function BecomeSponsorPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const { data: tiers = sponsorshipTiers } = useSponsorshipTiers(sponsorshipTiers);

  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(sponsorFormSchema),
    defaultValues: {
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      tier: 'الباقة الماسية (Diamond Sponsor)',
      message: '',
      honeypot: '',
    },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const payload = {
        kind: 'sponsor',
        fullName: values.contactPerson,
        organization: values.companyName,
        email: values.email,
        phone: values.phone,
        packageInterest: values.tier,
        subject: `طلب رعاية: ${values.tier}`,
        message: values.message,
        honeypot: values.honeypot || '',
        turnstileToken: turnstileToken || undefined,
      };

      const { data, error } = await supabase.functions.invoke('contact-form', {
        body: payload,
      });

      if (error || data?.error) {
        setServerError(
          data?.error || (isAr ? 'تعذر إرسال طلب الرعاية، يرجى المحاولة لاحقاً.' : 'Failed to submit inquiry, please try again.')
        );
        return;
      }

      setSubmitted(true);
      reset();

      // Golden confetti celebration
      import('canvas-confetti').then((m) => {
        const confetti = m.default || m;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ffd700', '#ffaa00', '#ffffff'],
        });
      });
    } catch (err) {
      console.error('[BecomeSponsorPage] submission error:', err);
      setServerError(
        isAr ? 'حدث خطأ غير متوقع أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.' : 'An unexpected error occurred. Please try again.'
      );
    }
  };

  return (
    <div className="page-container-padding" dir={dir} style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={isAr ? 'باقات الرعاية والشراكة' : 'Sponsorship Packages'}
        description={isAr
          ? 'اربط علامتك التجارية بأعظم قصة نجاح شبابية في الصعيد. استكشف باقات رعاية إيناكوس قنا 2026.'
          : 'Partner with Enactus Qena: Explore sponsorship packages, corporate partnerships, and youth empowerment in Upper Egypt.'}
      />
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            BECOME A SPONSOR • PARTNER WITH IMPACT
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            {isAr ? (
              <>اربط علامتك التجارية <span className="gold-gradient-text">بأعظم قصة نجاح في الصعيد</span></>
            ) : (
              <>Align Your Brand <span className="gold-gradient-text">With Upper Egypt's Greatest Story</span></>
            )}
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            {isAr
              ? 'نقدم لشركائنا من الشركات والمؤسسات منصة فريدة للوصول لأكثر من 15,000 طالب وطالبة ومئات الآلاف عبر المنصات الرقمية، والمساهمة في تحقيق أهداف التنمية المستدامة (SDGs).'
              : 'Empower sustainable community ventures and reach over 15,000 university students and hundreds of thousands across digital channels.'}
          </p>
        </div>

        {/* Form Section */}
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div
            className="glass-panel gold-border-glow responsive-card-p"
            style={{
              borderRadius: '24px',
              padding: '3.5rem 3rem',
              background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.98))',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span className="badge-gold font-cinzel">PARTNERSHIP INQUIRY</span>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: '#fff', marginTop: '0.5rem', marginBottom: '0.4rem' }}>
                {isAr ? 'نموذج طلب الرعاية والتواصل' : 'Sponsorship & Partnership Request Form'}
              </h2>
              <p style={{ color: '#a5a5b8', fontSize: '0.95rem', margin: 0 }}>
                {isAr
                  ? 'املأ النموذج وسيتواصل معك مسؤول العلاقات العامة (PR) بملف الرعاية الرسمي في أقل من 24 ساعة.'
                  : 'Submit your inquiry and our PR director will share the official sponsorship prospectus within 24 hours.'}
              </p>
            </div>

            {serverError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{serverError}</span>
              </div>
            )}

            {!submitted ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Honeypot anti-bot trap */}
                <div style={{ display: 'none', position: 'absolute', left: '-9999px' }} aria-hidden="true">
                  <input type="text" tabIndex={-1} autoComplete="off" {...register('honeypot')} />
                </div>

                <div className="form-grid-2" style={{ marginBottom: '1.25rem' }}>
                  <div>
                    <label htmlFor="sponsor-companyName" style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      {isAr ? 'اسم الشركة أو المؤسسة *' : 'Company or Organization Name *'}
                    </label>
                    <input
                      id="sponsor-companyName"
                      type="text"
                      placeholder={isAr ? 'مثال: شركة النيل للتطوير' : 'e.g. Nile Development Co.'}
                      {...register('companyName')}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: errors.companyName ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    />
                    {errors.companyName && (
                      <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                        {errors.companyName.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sponsor-contactPerson" style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      {isAr ? 'اسم المسؤول / الممثل *' : 'Contact Person / Representative *'}
                    </label>
                    <input
                      id="sponsor-contactPerson"
                      type="text"
                      placeholder={isAr ? 'الاسم والمنصب' : 'Name & Position'}
                      {...register('contactPerson')}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: errors.contactPerson ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    />
                    {errors.contactPerson && (
                      <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                        {errors.contactPerson.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '1.25rem' }}>
                  <div>
                    <label htmlFor="sponsor-email" style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      {isAr ? 'البريد الإلكتروني الرسمي *' : 'Official Business Email *'}
                    </label>
                    <input
                      id="sponsor-email"
                      type="email"
                      placeholder="partner@company.com"
                      {...register('email')}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: errors.email ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        direction: 'ltr',
                        textAlign: isAr ? 'right' : 'left',
                      }}
                    />
                    {errors.email && (
                      <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                        {errors.email.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sponsor-phone" style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      {isAr ? 'رقم الهاتف / الواتساب *' : 'Phone / WhatsApp *'}
                    </label>
                    <input
                      id="sponsor-phone"
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      {...register('phone')}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: errors.phone ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        direction: 'ltr',
                        textAlign: isAr ? 'right' : 'left',
                      }}
                    />
                    {errors.phone && (
                      <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                        {errors.phone.message}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="sponsor-tier" style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {isAr ? 'الباقة المطلوبة *' : 'Interested Sponsorship Tier *'}
                  </label>
                  <select
                    id="sponsor-tier"
                    {...register('tier')}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.85)',
                      border: errors.tier ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  >
                    {tiers.map((t, i) => (
                      <option key={i} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="sponsor-message" style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {isAr ? 'تفاصيل أو استفسارات إضافية *' : 'Inquiry Details or Objectives *'}
                  </label>
                  <textarea
                    id="sponsor-message"
                    rows="3"
                    placeholder={isAr ? 'حدثنا عن أهدافكم الترويجية أو رغبتكم في رعاية مشروع محدد...' : 'Tell us about your brand goals or preferred community project sponsorship...'}
                    {...register('message')}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.85)',
                      border: errors.message ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                  {errors.message && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                      {errors.message.message}
                    </span>
                  )}
                </div>

                {/* Cloudflare Turnstile Verification */}
                <Turnstile onVerify={(t) => setTurnstileToken(t)} onExpire={() => setTurnstileToken('')} />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '1rem',
                    fontSize: '1.1rem',
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>{isAr ? 'جاري إرسال الطلب...' : 'Submitting Request...'}</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>{isAr ? 'إرسال طلب الرعاية الآن' : 'Submit Sponsorship Request'}</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 184, 0, 0.2)', border: '2px solid #ffb800', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffd54f', margin: '0 auto 1.5rem auto' }}>
                  <Check size={36} />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
                  {isAr ? 'تم استلام طلبكم بنجاح!' : 'Inquiry Received Successfully!'}
                </h3>
                <p style={{ color: '#c5c5d6', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                  {isAr
                    ? 'نشكركم على اهتمامكم بدعم وتمكين شباب إيناكوس قنا. سيقوم فريق العلاقات العامة بالتواصل معكم وإرسال ملف الرعاية الرسمي.'
                    : 'Thank you for partnering with Enactus Qena. Our PR director will connect with you with the official sponsorship prospectus.'}
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
                >
                  {isAr ? 'إرسال طلب جديد' : 'Submit Another Inquiry'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
