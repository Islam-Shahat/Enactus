import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => setJustReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !justReconnected) return null;

  return (
    <div
      dir={dir}
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100000,
        background: isOffline ? '#ef4444' : '#16a34a',
        color: '#ffffff',
        padding: '0.45rem 1rem',
        fontSize: '0.85rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.35)',
        transition: 'all 0.3s ease',
      }}
    >
      {isOffline ? (
        <>
          <WifiOff size={16} />
          <span>{isAr ? 'أنت غير متصل بالإنترنت حالياً' : 'You are currently offline'}</span>
        </>
      ) : (
        <>
          <CheckCircle2 size={16} />
          <span>{isAr ? 'تم استعادة الاتصال بالإنترنت' : 'Back online'}</span>
        </>
      )}
    </div>
  );
}

