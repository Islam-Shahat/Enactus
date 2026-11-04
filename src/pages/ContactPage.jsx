import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Phone, MapPin, Send, Check, AlertCircle, Loader2 } from 'lucide-react';
import { FacebookIcon } from '../components/Icons';
import SEO from '../components/SEO';
import Turnstile from '../components/Turnstile';
import { contactFormSchema } from '../lib/schemas';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

export default function ContactPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      subject: 'استفسار عام',
      message: '',
      honeypot: '',
    },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const payload = {
        kind: 'contact',
        fullName: values.fullName,
        email: values.email,
        subject: values.subject,
        message: values.message,
        honeypot: values.honeypot || '',
        turnstileToken: turnstileToken || undefined,
      };

      const { data, error } = await supabase.functions.invoke('contact-form', {
        body: payload,
      });

      if (error || data?.error) {
        setServerError(
          data?.error || (isAr ? 'تعذر إرسال الرسالة، يرجى المحاولة لاحقاً.' : 'Failed to send message, please try again.')
        );
        return;
      }

      setSent(true);
      reset();
    } catch (err) {
      console.error('[ContactPage] submission error:', err);
      setServerError(
        isAr ? 'حدث خطأ غير متوقع أثناء الإرسال. يرجى المحاولة مرة أخرى.' : 'An unexpected error occurred. Please try again.'
      );
    }
  };

  return (
    <div className="page-container-padding" dir={dir} style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={isAr ? 'تواصل معنا' : 'Contact Us'}
        description={isAr
          ? 'تواصل مع كتيبة إيناكوس قنا - جامعة جنوب الوادي: استفسارات الشراكات، الرعايات، والتطوع.'
          : 'Get in touch with Enactus Qena - South Valley University: Partnerships, sponsorships, and inquiries.'}
      />
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            GET IN TOUCH
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            {isAr ? (
              <>تواصل مع <span className="gold-gradient-text">إيناكوس قنا</span></>
            ) : (
              <>Connect with <span className="gold-gradient-text">Enactus Qena</span></>
            )}
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            {isAr
              ? 'يسعدنا استقبال استفساراتكم واقتراحاتكم وشراكاتكم. فريقنا مستعد للإجابة على جميع تساؤلاتكم طوال أيام الأسبوع:'
              : 'We welcome your inquiries, proposals, and partnership discussions. Our team is ready to assist you throughout the week:'}
          </p>
        </div>

        {/* Contact Layout: Info Cards + Form */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.25fr',
            gap: '3rem',
            alignItems: 'start',
          }}
          className="contact-grid"
        >
          {/* Info Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Location */}
            <div className="glass-panel gold-glow-hover responsive-card-p" style={{ borderRadius: '20px', padding: '2rem 1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 184, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb800', flexShrink: 0 }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {isAr ? 'مقر النشاط' : 'Campus Headquarters'}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#a0a0b2' }}>South Valley University Campus</span>
                </div>
              </div>
              <p style={{ color: '#c5c5d6', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>
                {isAr
                  ? 'المقر المركزي لـ Enactus: الحرم الجامعي الرئيسي، مجمع الأنشطة الطلابية، جامعة جنوب الوادي، طريق قنا - سفاجا، محافظة قنا، جمهورية مصر العربية.'
                  : 'Central HQ: Main University Campus, Student Activities Complex, South Valley University, Qena - Safaga Road, Qena, Egypt.'}
              </p>
            </div>

            {/* Email & Phone */}
            <div className="glass-panel gold-glow-hover responsive-card-p" style={{ borderRadius: '20px', padding: '2rem 1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 184, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb800', flexShrink: 0 }}>
                  <Mail size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {isAr ? 'البريد الرسمي' : 'Official Email'}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#ffd54f' }}>enactus.svu@gmail.com</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 184, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb800', flexShrink: 0 }}>
                  <Phone size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {isAr ? 'هاتف وواتساب الـ PR' : 'PR Phone & WhatsApp'}
                  </h3>
                  <span style={{ fontSize: '0.9rem', color: '#ffd54f', direction: 'ltr', display: 'inline-block' }}>+20 109 238 4119</span>
                </div>
              </div>
            </div>

            {/* Social channels */}
            <div className="glass-panel responsive-card-p" style={{ borderRadius: '20px', padding: '2rem 1.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
                {isAr ? 'قنوات التواصل الاجتماعي' : 'Social Channels'}
              </h3>
              <p style={{ color: '#a0a0b2', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                {isAr
                  ? 'تابع أكثر من 11,700 متابع على صفحتنا الرسمية لمعرفة آخر الأخبار والفعاليات أولاً بأول.'
                  : 'Follow over 11,700 supporters on our official channels for up-to-the-minute updates.'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href="https://www.facebook.com/Enactus.svu"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
                >
                  <FacebookIcon size={16} />
                  <span>Facebook (11.7K+)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div
            className="glass-panel gold-border-glow responsive-card-p"
            style={{
              borderRadius: '24px',
              padding: '3rem 2.5rem',
              background: 'linear-gradient(145deg, rgba(22, 24, 34, 0.95), rgba(12, 13, 18, 0.98))',
            }}
          >
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
              {isAr ? 'أرسل لنا رسالة مباشرة' : 'Send Us a Direct Message'}
            </h2>
            <p style={{ color: '#a5a5b8', fontSize: '0.95rem', marginBottom: '2rem' }}>
              {isAr
                ? 'املأ البيانات وسيقوم المسؤول المختص بالرد عليك عبر الإيميل أو الواتساب.'
                : 'Fill in your details and our team will get back to you via email or WhatsApp.'}
            </p>

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

            {!sent ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Honeypot anti-bot trap */}
                <div style={{ display: 'none', position: 'absolute', left: '-9999px' }} aria-hidden="true">
                  <input type="text" tabIndex={-1} autoComplete="off" {...register('honeypot')} />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {isAr ? 'الاسم بالكامل *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? 'اسمك الكريم' : 'Your Name'}
                    {...register('fullName')}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.85)',
                      border: errors.fullName ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  />
                  {errors.fullName && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                      {errors.fullName.message}
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
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

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {isAr ? 'موضوع الرسالة *' : 'Subject *'}
                  </label>
                  <select
                    {...register('subject')}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 11, 16, 0.85)',
                      border: errors.subject ? '1px solid #ef4444' : '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  >
                    <option value={isAr ? 'استفسار عام' : 'General Inquiry'}>
                      {isAr ? 'استفسار عام' : 'General Inquiry'}
                    </option>
                    <option value={isAr ? 'طلب رعاية أو شراكة' : 'Sponsorship & Partnerships'}>
                      {isAr ? 'طلب رعاية أو شراكة' : 'Sponsorship & Partnerships'}
                    </option>
                    <option value={isAr ? 'استفسار عن التقديم والمقابلات' : 'Recruitment Inquiries'}>
                      {isAr ? 'استفسار عن التقديم والمقابلات' : 'Recruitment Inquiries'}
                    </option>
                    <option value={isAr ? 'تغطية إعلامية وصحفية' : 'Media & Press Coverage'}>
                      {isAr ? 'تغطية إعلامية وصحفية' : 'Media & Press Coverage'}
                    </option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {isAr ? 'نص الرسالة *' : 'Message Body *'}
                  </label>
                  <textarea
                    rows="4"
                    placeholder={isAr ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
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
                    fontSize: '1.05rem',
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>{isAr ? 'جاري الإرسال...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>{isAr ? 'إرسال الرسالة الآن' : 'Send Message Now'}</span>
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
                  {isAr ? 'تم استلام رسالتك بنجاح!' : 'Message Received Successfully!'}
                </h3>
                <p style={{ color: '#c5c5d6', fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  {isAr
                    ? 'شكراً لتواصلك معنا. سنقوم بالرد على بريدك الإلكتروني في أقرب وقت.'
                    : 'Thank you for reaching out. Our team will review your message and reply via email promptly.'}
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
                >
                  {isAr ? 'إرسال رسالة أخرى' : 'Send Another Message'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
