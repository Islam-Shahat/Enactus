import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { setCurrentLang, t as translateString } from '../lib/strings';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('enactus_lang');
      if (saved === 'ar' || saved === 'en') return saved;
    } catch {
      // fallback if localStorage is disabled
    }
    return 'ar';
  });

  useEffect(() => {
    try {
      localStorage.setItem('enactus_lang', lang);
    } catch {
      // ignore
    }

    setCurrentLang(lang);

    const isRtl = lang === 'ar';
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('lang', lang);
    root.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    root.setAttribute('data-lang', lang);

    body.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    body.setAttribute('data-lang', lang);

    if (isRtl) {
      root.classList.remove('ltr');
      root.classList.add('rtl');
      body.classList.remove('ltr');
      body.classList.add('rtl');
    } else {
      root.classList.remove('rtl');
      root.classList.add('ltr');
      body.classList.remove('rtl');
      body.classList.add('ltr');
    }
  }, [lang]);

  const toggleLanguage = useCallback(() => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const setLanguage = useCallback((newLang) => {
    if (newLang === 'ar' || newLang === 'en') {
      setLang(newLang);
    }
  }, []);

  const t = useCallback(
    (key) => translateString(key, lang),
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
      t: (key) => translateString(key, 'ar'),
    };
  }
  return context;
}

