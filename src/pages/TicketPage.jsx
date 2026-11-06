// src/pages/TicketPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  ArrowRight,
  Sparkles,
  Share2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { REGISTRATION_STATUSES, formatEventDateTime } from '../lib/eventHelpers';
import SEO from '../components/SEO';

export default function TicketPage() {
  const { code } = useParams();
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    if (!code) return;

    setLoading(true);
    setError(null);

    supabase.functions
      .invoke('ticket-lookup', {
        body: { code },
      })
      .then(({ data, error: funcError }) => {
        if (!active) return;
        if (funcError || !data || data.error) {
          setError(data?.error || (isAr ? 'لم يتم العثور على التذكرة المطلوبة' : 'Ticket not found'));
          setTicketData(null);
        } else {
          setTicketData(data);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || (isAr ? 'حدث خطأ أثناء تحميل بيانات التذكرة' : 'Failed to load ticket'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [code, isAr]);

  const handlePrint = () => {
    window.print();
  };

  const statusConfig = REGISTRATION_STATUSES.find((s) => s.key === ticketData?.status);

  return (
    <div
      dir={dir}
      style={{
        minHeight: '85vh',
        padding: '3rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SEO
        title={isAr ? 'تذكرة الدخول الرسمية • إيناكوس قنا' : 'Event Entry Ticket • Enactus Qena'}
        description={isAr ? 'تذكرة الحضور الرسمية لفعاليات إيناكوس قنا' : 'Official attendee ticket'}
        noindex={true}
      />

      {loading ? (
        <div style={{ textAlign: 'center', color: '#ffd54f' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 184, 0, 0.2)',
              borderTopColor: '#ffb800',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p>{isAr ? 'جاري التحقق من التذكرة...' : 'Verifying ticket...'}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div
          className="glass-panel"
          style={{
            maxWidth: '450px',
            padding: '2.5rem',
            borderRadius: '20px',
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <AlertCircle size={48} color="#f87171" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
            {isAr ? 'تذكرة غير صالحة' : 'Invalid Ticket'}
          </h2>
          <p style={{ color: '#a0a0b2', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <Link
            to="/events"
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
            }}
          >
            <ArrowRight size={16} />
            <span>{isAr ? 'تصفح الفعاليات الأخرى' : 'Browse Other Events'}</span>
          </Link>
        </div>
      ) : ticketData ? (
        <div
          style={{
            width: '100%',
            maxWidth: '540px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* Printable Ticket Card */}
          <div
            id="printable-ticket"
            className="glass-panel gold-border-glow"
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              background: 'linear-gradient(165deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))',
              border: '2px solid rgba(255, 184, 0, 0.35)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              position: 'relative',
            }}
          >
            {/* Top Banner / Event Cover */}
            <div
              style={{
                height: '140px',
                background: ticketData.event?.cover_url
                  ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(12, 13, 18, 0.95)), url(${ticketData.event.cover_url}) center/cover`
                  : 'linear-gradient(135deg, rgba(255, 184, 0, 0.2), rgba(20, 22, 32, 0.95))',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge-gold font-cinzel" style={{ fontSize: '0.72rem' }}>
                  ENACTUS QENA • OFFICIAL TICKET
                </span>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: statusConfig?.color || 'rgba(255, 255, 255, 0.1)',
                    color: statusConfig?.text || '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {statusConfig?.label[lang] || statusConfig?.label.ar || ticketData.status}
                </span>
              </div>

              <div>
                <h1
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    color: '#fff',
                    margin: 0,
                    textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                  }}
                >
                  {isAr ? ticketData.event?.title_ar : ticketData.event?.title_en || ticketData.event?.title_ar}
                </h1>
              </div>
            </div>

            {/* Ticket Body */}
            <div style={{ padding: '2rem 1.75rem' }}>
              {/* Attendee Greeting */}
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#a0a0b2' }}>
                  {isAr ? 'مرحباً بك يا' : 'Welcome,'}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffd54f' }}>
                  {ticketData.attendee_first_name}
                </div>
              </div>

              {/* QR Code Container */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#ffffff',
                  padding: '1.25rem',
                  borderRadius: '16px',
                  width: '210px',
                  margin: '0 auto 1.5rem',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)',
                }}
              >
                <QRCodeSVG
                  value={ticketData.ticket_code}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Ticket Code Display */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px dashed rgba(255, 184, 0, 0.4)',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#88889a', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {isAr ? 'رمز الدخول الرقمي' : 'Digital Ticket Code'}
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffb800', letterSpacing: '3px', marginTop: '0.2rem' }}>
                  {ticketData.ticket_code}
                </div>
              </div>

              {/* Event Info Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '0.75rem',
                  fontSize: '0.88rem',
                  color: '#c5c5d6',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} color="#ffb800" />
                  <span>
                    {formatEventDateTime(ticketData.event?.starts_at, ticketData.event?.ends_at, lang)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} color="#ffb800" />
                  <span>
                    {isAr
                      ? ticketData.event?.venue_ar || ticketData.event?.venue_en
                      : ticketData.event?.venue_en || ticketData.event?.venue_ar}
                  </span>
                </div>

                {ticketData.checked_in_at && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 600 }}>
                    <CheckCircle2 size={16} />
                    <span>
                      {isAr
                        ? `تم تسجيل الحضور في: ${new Date(ticketData.checked_in_at).toLocaleTimeString()}`
                        : `Checked in at ${new Date(ticketData.checked_in_at).toLocaleTimeString()}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Footer / Perforation effect */}
            <div
              style={{
                padding: '0.85rem 1.5rem',
                background: 'rgba(0, 0, 0, 0.4)',
                borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: '#88889a',
              }}
            >
              <span>{isAr ? 'صالحة لدخول شخص واحد فقط' : 'Valid for single attendee'}</span>
              <span>Enactus Qena • 2026</span>
            </div>
          </div>

          {/* Action Buttons (Excluded from print via CSS) */}
          <div className="no-print" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary"
              style={{
                padding: '0.7rem 1.4rem',
                borderRadius: '10px',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              <Printer size={16} />
              <span>{isAr ? 'طباعة التذكرة / حفظ PDF' : 'Print / Save PDF'}</span>
            </button>

            {ticketData.status === 'attended' && (
              <Link
                to={`/events/${ticketData.event?.slug}#feedback`}
                className="btn-secondary"
                style={{
                  padding: '0.7rem 1.4rem',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: '#c084fc',
                }}
              >
                <Sparkles size={16} />
                <span>{isAr ? 'تقييم الفعالية' : 'Submit Feedback'}</span>
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          nav, footer, .no-print {
            display: none !important;
          }
          #printable-ticket {
            box-shadow: none !important;
            border: 2px solid #000000 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          #printable-ticket h1, #printable-ticket div, #printable-ticket span {
            color: #000000 !important;
          }
        }
      `}</style>
    </div>
  );
}

