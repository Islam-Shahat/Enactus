import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, User, KeyRound, Sparkles, Shield, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [role, setRole] = useState('member'); // 'member' | 'board'
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!credential || !password) {
      setError('يرجى ملء جميع الحقول للمتابعة');
      return;
    }
    setError('');
    setIsLoggedIn(true);
  };

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px', minHeight: '85vh', display: 'flex', alignItems: 'center' }}>
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
          {/* Logo */}
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
              بوابة كتيبة إيناكوس قنا
            </h1>
            <p style={{ color: '#a0a0b2', fontSize: '0.85rem', margin: 0 }}>
              تسجيل الدخول للأعضاء ومجلس الإدارة
            </p>
          </div>

          {!isLoggedIn ? (
            <div>
              {/* Role Toggle */}
              <div
                className="role-toggle-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '0.35rem',
                  borderRadius: '12px',
                  marginBottom: '1.75rem',
                  border: '1px solid rgba(255, 184, 0, 0.2)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setRole('member')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: role === 'member' ? 'linear-gradient(135deg, #ffd752, #c47c00)' : 'transparent',
                    color: role === 'member' ? '#08080a' : '#c5c5d6',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                  }}
                >
                  عضو الكتيبة (Member)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('board')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: role === 'board' ? 'linear-gradient(135deg, #ffd752, #c47c00)' : 'transparent',
                    color: role === 'board' ? '#08080a' : '#c5c5d6',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                  }}
                >
                  مجلس الإدارة (Board / Head)
                </button>
              </div>

              {error && (
                <div style={{ background: 'rgba(255, 68, 68, 0.15)', border: '1px solid #ff4444', borderRadius: '10px', padding: '0.65rem 1rem', color: '#ff8888', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {role === 'member' ? 'البريد أو كود العضوية (Member Pass Code)' : 'البريد المؤسسي للإدارة'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      placeholder={role === 'member' ? 'مثال: ENACTUS-SVU-5821 أو بريدك' : 'head@enactus-qena.org'}
                      value={credential}
                      onChange={(e) => setCredential(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem 0.85rem 2.8rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        direction: 'ltr',
                        textAlign: 'right',
                      }}
                    />
                    <User size={18} color="#ffb800" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '1.75rem' }}>
                  <label style={{ display: 'block', color: '#ffd54f', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    كلمة المرور (Password)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(10, 11, 16, 0.85)',
                        border: '1px solid rgba(255, 184, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem 0.85rem 2.8rem',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        direction: 'ltr',
                        textAlign: 'right',
                      }}
                    />
                    <KeyRound size={18} color="#ffb800" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '0.95rem',
                    fontSize: '1.05rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <Lock size={18} />
                  <span>دخول البورتال الداخلي</span>
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#a0a0b2' }}>
                  لست عضواً بعد؟{' '}
                  <Link to="/join" style={{ color: '#ffd54f', fontWeight: 700, textDecoration: 'none' }}>
                    قدّم الآن واترك أثرك
                  </Link>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 184, 0, 0.2)', border: '2px solid #ffb800', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffd54f', margin: '0 auto 1.25rem auto' }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
                أهلاً بك مجدداً يا بطل!
              </h2>
              <p style={{ color: '#c5c5d6', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                تم تسجيل دخولك بنجاح كـ <strong>{role === 'member' ? 'عضو في كتيبة إيناكوس قنا' : 'قائد في مجلس الإدارة'}</strong>. مرحباً بك في مساحة المهام وملفات مشاريع الصعيد.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link to="/" className="btn-primary" style={{ justifyContent: 'center' }}>
                  <span>العودة للصفحة الرئيسية</span>
                </Link>
                <button
                  onClick={() => setIsLoggedIn(false)}
                  className="btn-secondary"
                  style={{ justifyContent: 'center' }}
                >
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
