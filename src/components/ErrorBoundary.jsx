import React from 'react';
import { Sentry } from '../lib/sentry';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    try {
      Sentry.captureException(error, { extra: errorInfo });
    } catch {
      // Sentry optional fallback
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDashboard = this.props.variant === 'dashboard';

      return (
        <div
          role="alert"
          style={{
            minHeight: isDashboard ? '60vh' : '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1.5rem',
            textAlign: 'center',
          }}
        >
          <div
            className="glass-panel gold-border-glow"
            style={{
              maxWidth: '520px',
              width: '100%',
              borderRadius: '20px',
              padding: '2.5rem 2rem',
              background: 'linear-gradient(150deg, rgba(22, 24, 34, 0.98), rgba(12, 13, 18, 0.98))',
              color: '#ffffff',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: '#ffd54f' }}>
              حدث خطأ غير متوقع
            </h2>

            <p style={{ fontSize: '0.92rem', color: '#a0a0b2', lineHeight: 1.6, margin: '0 0 1.75rem 0' }}>
              نعتذر عن هذا الخطأ المؤقت. تم تسجيل المشكلة تلقائياً وسيعمل الفريق على فحصها. يمكنك إعادة المحاولة الآن.
            </p>

            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.7rem 1.4rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <RefreshCw size={16} />
                <span>إعادة المحاولة / Reload</span>
              </button>

              <a
                href={isDashboard ? '/dashboard' : '/'}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.7rem 1.4rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Home size={16} />
                <span>الرئيسية</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

