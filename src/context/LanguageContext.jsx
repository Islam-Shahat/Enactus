// src/context/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import i18n from '../i18n';
import { setCurrentLang, t as translateLegacy } from '../lib/strings';
import { supabase } from '../lib/supabase';
import { formatDate, formatDateTime, formatCurrency, formatNumber, formatRelativeTime } from '../lib/formatters';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('enactus_lang');
      if (saved === 'ar' || saved === 'en') return saved;
    } catch {
      // fallback
    }
    return 'ar';
  });

  // Keep i18n and DOM synced with state
  useEffect(() => {
    try {
      localStorage.setItem('enactus_lang', lang);
    } catch {
      // ignore
    }

    setCurrentLang(lang);
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }

    const isRtl = lang === 'ar';
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('lang', lang);
    root.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    root.setAttribute('data-lang', lang);

    body.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    body.setAttribute('data-lang', lang);

    // Font stack swapping
    if (isRtl) {
      root.style.setProperty('--font-primary', 'var(--font-cairo), sans-serif');
      root.classList.remove('ltr');
      root.classList.add('rtl');
      body.classList.remove('ltr');
      body.classList.add('rtl');
    } else {
      root.style.setProperty('--font-primary', 'var(--font-outfit), sans-serif');
      root.classList.remove('rtl');
      root.classList.add('ltr');
      body.classList.remove('rtl');
      body.classList.add('ltr');
    }

    // Persist to profiles.locale if user is signed in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        supabase
          .from('profiles')
          .update({ locale: lang })
          .eq('id', user.id)
          .then(() => {});
      }
    });
  }, [lang]);

  const toggleLanguage = useCallback(() => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const setLanguage = useCallback((newLang) => {
    if (newLang === 'ar' || newLang === 'en') {
      setLang(newLang);
    }
  }, []);

  // Universal translation helper
  const t = useCallback(
    (key, options) => {
      // Try i18next first (namespaced or flat)
      if (i18n.isInitialized && i18n.exists(key)) {
        return i18n.t(key, options);
      }
      // Fallback to strings.js
      const legacy = translateLegacy(key, lang);
      if (legacy && legacy !== key) return legacy;

      return i18n.t(key, options);
    },
    [lang]
  );

  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  const value = useMemo(
    () => ({
      lang,
      language: lang,
      isRTL,
      dir,
      toggleLanguage,
      setLanguage,
      t,
      formatDate: (d, opts) => formatDate(d, lang, opts),
      formatDateTime: (d) => formatDateTime(d, lang),
      formatCurrency: (amt) => formatCurrency(amt, lang),
      formatNumber: (n, opts) => formatNumber(n, lang, opts),
      formatRelativeTime: (d) => formatRelativeTime(d, lang),
    }),
    [lang, isRTL, dir, toggleLanguage, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      lang: 'ar',
      language: 'ar',
      isRTL: true,
      dir: 'rtl',
      toggleLanguage: () => {},
      setLanguage: () => {},
      t: (key) => translateLegacy(key, 'ar'),
      formatDate: (d, opts) => formatDate(d, 'ar', opts),
      formatDateTime: (d) => formatDateTime(d, 'ar'),
      formatCurrency: (amt) => formatCurrency(amt, 'ar'),
      formatNumber: (n, opts) => formatNumber(n, 'ar', opts),
      formatRelativeTime: (d) => formatRelativeTime(d, 'ar'),
    };
  }
  return context;
}
