import React, { useState } from 'react';
import { Star, MessageSquare, Ticket, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function EventFeedbackSection({ event, defaultTicketCode = '' }) {
  const [ticketCode, setTicketCode] = useState(defaultTicketCode);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ticketCode.trim()) {
      setError('يرجى إدخال رمز التذكرة الخاص بك.');
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      setError('يرجى تحديد التقييم من 1 إلى 5 نجوم.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('submit-feedback', {
        body: {
          ticket_code: ticketCode.trim(),
          rating: Number(rating),
          comment: comment.trim() || null,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'فشل إرسال التقييم');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء إرسال التقييم. تأكد من صحة رمز التذكرة وحضورك للفعالية.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="glass-panel"
      id="feedback"
      style={{
        borderRadius: '20px',
        padding: '2.5rem',
        background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.05), rgba(12, 13, 20, 0.95))',
        border: '1px solid rgba(255, 184, 0, 0.2)',
        marginBottom: '3rem',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(255, 184, 0, 0.1)',
            border: '1px solid rgba(255, 184, 0, 0.3)',
            color: '#ffb800',
            marginBottom: '1rem',
          }}
        >
          <MessageSquare size={28} />
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
          شاركنا رأيك في الفعالية
        </h2>
        <p style={{ color: '#b5b5c6', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto' }}>
          تقييمك وملاحظاتك تساهم بشكل مباشر في تطوير الفعاليات القادمة وتقديم تجربة أفضل لمجتمع إيناكتس.
        </p>
      </div>

      {success ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
            شكراً جزيلاً لمشاركتك!
          </h3>
          <p style={{ color: '#d1fae5', fontSize: '0.95rem', margin: 0 }}>
            تم تسجيل تقييمك وملاحظاتك بنجاح وسنقوم بمراجعتها بدقة لتطوير فعالياتنا المستقبلية.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: '560px', margin: '0 auto' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1.25rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '12px',
                color: '#fca5a5',
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Ticket Code */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="ticket-code-input"
              style={{ display: 'block', color: '#e0e0ec', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}
            >
              رمز التذكرة (Ticket Code) *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="ticket-code-input"
                type="text"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                placeholder="مثال: ENQ-A1B2C3"
                dir="ltr"
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.75rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 184, 0, 0.25)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <Ticket
                size={18}
                color="#ffb800"
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
            </div>
            <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.4rem' }}>
              يمكن فقط لمن تم تأكيد حضورهم الفعالية تقديم التقييم.
            </div>
          </div>

          {/* Star Rating */}
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <label style={{ display: 'block', color: '#e0e0ec', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              تقييمك العام للفعالية *
            </label>
            <div style={{ display: 'inline-flex', gap: '0.6rem', direction: 'ltr' }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} من 5 نجوم`}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      outline: 'none',
                      transition: 'transform 0.15s ease',
                      transform: (hoverRating || rating) >= star ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    <Star
                      size={32}
                      color={isFilled ? '#ffb800' : '#4b5563'}
                      fill={isFilled ? '#ffb800' : 'none'}
                    />
                  </button>
                );
              })}
            </div>
            <div style={{ color: '#ffb800', fontSize: '0.88rem', fontWeight: 700, marginTop: '0.5rem' }}>
              {rating === 5 && 'ممتازة جداً (5 / 5)'}
              {rating === 4 && 'جيدة جداً (4 / 5)'}
              {rating === 3 && 'جيدة (3 / 5)'}
              {rating === 2 && 'مقبولة (2 / 5)'}
              {rating === 1 && 'تحتاج إلى تحسين (1 / 5)'}
            </div>
          </div>

          {/* Comment */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label
              htmlFor="comment-textarea"
              style={{ display: 'block', color: '#e0e0ec', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}
            >
              ملاحظاتك ومقترحاتك (اختياري)
            </label>
            <textarea
              id="comment-textarea"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ما الذي أعجبك؟ وما الذي تود أن نغيره أو نضيفه في الفعاليات القادمة؟"
              maxLength={1000}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>جاري إرسال التقييم...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>إرسال التقييم</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

