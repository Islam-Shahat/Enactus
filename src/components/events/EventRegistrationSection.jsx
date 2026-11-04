// src/components/events/EventRegistrationSection.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import Turnstile from '../Turnstile';

export default function EventRegistrationSection({ event }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Check event registration eligibility
  const now = new Date();
  const isConcluded = event?.ends_at ? new Date(event.ends_at) < now : false;
  const isRegistrationOpen = Boolean(event?.registration_open) && !isConcluded && event?.status !== 'completed' && event?.status !== 'cancelled';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError(isAr ? 'يرجى إدخال الاسم والبريد الإلكتروني' : 'Name and email are required');
      return;
    }

    if (!turnstileToken) {
      setError(isAr ? 'يرجى إكمال التحقق الأمني (Turnstile)' : 'Please complete bot security verification');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('register-event', {
        body: {
          event_id: event.id,
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          turnstile_token: turnstileToken,
        },
      });

      if (funcError || !data || data.error) {
        throw new Error(data?.error || funcError?.message || (isAr ? 'تعذر إتمام التسجيل' : 'Registration failed'));
      }

      setResult(data);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || (isAr ? 'حدث خطأ غير متوقع أثناء التسجيل' : 'An error occurred during registration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="register"
      className="glass-panel gold-border-glow"
      style={{
        borderRadius: '24px',
        padding: '2.5rem',
        background: 'linear-gradient(135deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))',
        border: '1px solid rgba(255, 184, 0, 0.3)',
        marginBottom: '3rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(255, 184, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffb800',
          }}
        >
          <Ticket size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: 0 }}>
            {isAr ? 'التسجيل وحجز تذكرة الحضور' : 'Event Registration & Tickets'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#a0a0b2', margin: '0.2rem 0 0 0' }}>
            {isAr ? 'احجز مقعدك مجاناً للحصول على رمز الدخول الرقمي المعتمد' : 'Reserve your seat to receive your digital ticket QR code'}
          </p>
        </div>
      </div>

      {result ? (
        /* Success State */
        <div
          style={{
            padding: '2rem',
            borderRadius: '16px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <CheckCircle2 size={48} color="#34d399" />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            {result.status === 'registered'
              ? (isAr ? 'تم تأكيد حجزك بنجاح!' : 'Your seat is confirmed!')
              : (isAr ? 'تمت إضافتك إلى قائمة الانتظار!' : 'You are on the waitlist!')}
          </h3>
          <p style={{ color: '#d1d5db', fontSize: '0.92rem', maxWidth: '480px', lineHeight: 1.6, margin: 0 }}>
            {result.status === 'registered'
              ? (isAr
                ? 'تم إصدار تذكرتك الرقمية الرسمية بنجاح. يرجى فتح التذكرة والاحتفاظ بها لإبراز رمز QR عند بوابات الدخول.'
                : 'Your digital ticket is ready. Please view your ticket to show the QR code at the door.')
              : (isAr
                ? 'نظراً لاكتمال السعة المقررة، تم وضعك على قائمة الانتظار وستصلك رسالة فور توفر مقعد شاغر.'
                : 'The event is currently at full capacity. You have been placed on the waitlist.')}
          </p>

          <div
            style={{
              background: '#161822',
              padding: '0.75rem 1.75rem',
              borderRadius: '10px',
              border: '1px dashed rgba(255, 184, 0, 0.4)',
              color: '#ffb800',
              fontWeight: 900,
              fontSize: '1.4rem',
              letterSpacing: '2px',
            }}
          >
            {result.ticket_code}
          </div>

          <Link
            to={`/ticket/${result.ticket_code}`}
            className="btn-primary"
            style={{
              padding: '0.8rem 2rem',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
            }}
          >
            <span>{isAr ? 'عرض تذكرتي ورمز QR الآن' : 'View My Ticket & QR'}</span>
            <ExternalLink size={18} />
          </Link>
        </div>
      ) : !isRegistrationOpen ? (
        /* Closed State */
        <div
          style={{
            padding: '2rem',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            color: '#9ca3af',
          }}
        >
          <Clock size={36} color="#88889a" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            {isAr ? 'باب التسجيل مغلق حالياً' : 'Registration Closed'}
          </h3>
          <p style={{ fontSize: '0.88rem', margin: 0 }}>
            {isConcluded
              ? (isAr ? 'انتهت هذه الفعالية بنجاح، ترقبوا فعالياتنا القادمة!' : 'This event has concluded.')
              : (isAr ? 'التسجيل غير متاح لهذه الفعالية حالياً.' : 'Registration is not currently open for this event.')}
          </p>
        </div>
      ) : (
        /* Open Registration Form */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#ffd54f', marginBottom: '0.4rem' }}>
                {isAr ? 'الاسم بالكامل *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isAr ? 'أحمد محمد علي' : 'Ahmed Mohamed Ali'}
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.25)',
                  color: '#fff',
                  fontSize: '0.92rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#ffd54f', marginBottom: '0.4rem' }}>
                {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="dashboard-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 184, 0, 0.25)',
                  color: '#fff',
                  fontSize: '0.92rem',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#ffd54f', marginBottom: '0.4rem' }}>
              {isAr ? 'رقم الهاتف / واتساب (اختياري)' : 'Phone Number (Optional)'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              className="dashboard-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                color: '#fff',
                fontSize: '0.92rem',
              }}
            />
          </div>

          {/* Turnstile verification */}
          <div style={{ margin: '0.5rem 0' }}>
            <Turnstile
              onVerify={(token) => setTurnstileToken(token)}
              onError={() => setError(isAr ? 'فشل التحقق الأمني' : 'Bot verification failed')}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="btn-primary"
            style={{
              padding: '0.85rem 2rem',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: loading || !turnstileToken ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Ticket size={18} />
            <span>{loading ? (isAr ? 'جاري حجز التذكرة...' : 'Reserving Ticket...') : (isAr ? 'تأكيد الحجز واستخراج التذكرة' : 'Confirm & Generate Ticket')}</span>
          </button>
        </form>
      )}
    </div>
  );
}

