import { useQuery } from '@tanstack/react-query';
import {
  getApplicationsOpen, getCommittee, getNewsArticle, listAlumni, listBoard, listCommittees, listFaqs,
  listGallery, listNews, listPartners, listSponsorshipTiers, listStats,
} from '../services/siteContent';
import { getEventBySlug, listPublicEvents } from '../services/events';
import { useLanguage } from '../context/LanguageContext';

// Each hook takes the old mock data as an optional fallback so pages never break:
//   const { data: events = [], isLoading } = useEvents(mockEvents);
// Wire `lang` dynamically to the LanguageContext so when language toggles, content updates.

export const useEvents = (mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['events', activeLang], queryFn: () => listPublicEvents(mock, activeLang) });
};

export const useEvent = (slug, mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['events', slug, activeLang], queryFn: () => getEventBySlug(slug, mock, activeLang), enabled: Boolean(slug) });
};

export const useCommittees = (mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['committees', activeLang], queryFn: () => listCommittees(mock, activeLang) });
};

export const useCommittee = (slug, mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['committees', slug, activeLang], queryFn: () => getCommittee(slug, mock, activeLang), enabled: Boolean(slug) });
};

export const useBoard = (mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['board', activeLang], queryFn: () => listBoard(mock, activeLang) });
};

export const useAlumni = (mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['alumni', activeLang], queryFn: () => listAlumni(mock, activeLang) });
};

export const useFaqs = (mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['faqs', activeLang], queryFn: () => listFaqs(mock, activeLang) });
};

export const useSponsorshipTiers = (mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['tiers', activeLang], queryFn: () => listSponsorshipTiers(mock, activeLang) });
};

export const useNews = (mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['news', activeLang], queryFn: () => listNews(mock, activeLang) });
};

export const useNewsArticle = (slug, mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['news', slug, activeLang], queryFn: () => getNewsArticle(slug, mock, activeLang), enabled: Boolean(slug) });
};

export const usePartners = (mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['partners', activeLang], queryFn: () => listPartners(mock, activeLang) });
};

export const useStats = (mock = [], explicitLang) => {
  const { lang } = useLanguage();
  const activeLang = explicitLang ?? lang;
  return useQuery({ queryKey: ['stats', activeLang], queryFn: () => listStats(mock, activeLang) });
};

export const useGallery = (mock = []) => useQuery({ queryKey: ['gallery'], queryFn: () => listGallery(mock) });

export const useApplicationsOpen = () =>
  useQuery({ queryKey: ['applications-open'], queryFn: () => getApplicationsOpen(true), staleTime: 30 * 1000 });
