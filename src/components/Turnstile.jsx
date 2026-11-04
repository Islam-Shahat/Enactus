import React, { useEffect, useRef, useState } from 'react';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export default function Turnstile({ onVerify, onError, onExpire, theme = 'dark', className = '' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(Boolean(window.turnstile));
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  // 1. Load script only on pages where this component mounts
  useEffect(() => {
    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }

    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        console.warn('[turnstile] Failed to load Turnstile script');
        if (onError) onError();
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => setScriptLoaded(true));
    }
  }, [onError]);

  // 2. Render widget when script is loaded and container is ready
  useEffect(() => {
    if (!siteKey) {
      // In development when site key is not configured, inform and provide dummy token
      if (onVerify) {
        onVerify('dev-bypass-turnstile-token');
      }
      return;
    }

    if (!scriptLoaded || !window.turnstile || !containerRef.current) return;

    try {
      if (widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        callback: (token) => {
          if (onVerify) onVerify(token);
        },
        'error-callback': () => {
          if (onError) onError();
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
      });
    } catch (err) {
      console.warn('[turnstile] Render error:', err);
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (_) {
          // ignore cleanup errors
        }
      }
    };
  }, [scriptLoaded, siteKey, theme, onVerify, onError, onExpire]);

  if (!siteKey) {
    return (
      <div style={{ fontSize: '0.75rem', color: '#888', textAlign: 'center', margin: '0.5rem 0' }}>
        <span>(Turnstile verification enabled • Dev mode bypass active)</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`turnstile-container ${className}`}
      style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}
    />
  );
}

