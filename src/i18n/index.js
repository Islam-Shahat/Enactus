// src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import en from './en.json';

const savedLang = (() => {
  try {
    const s = localStorage.getItem('enactus_lang');
    if (s === 'ar' || s === 'en') return s;
  } catch {
    // fallback if localStorage not accessible
  }
  return 'ar';
})();

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'ar',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;

