import { useQuery } from '@tanstack/react-query';
import {
  getApplicationsOpen, listCommittees, listGallery, listNews, listPartners, listStats, listTeam,
} from '../services/siteContent';
import { getEventBySlug, listPublicEvents } from '../services/events';

// Each hook takes the old mock data as an optional fallback so pages never break:
//   const { data: events = [] } = useEvents(mockEvents);

export const useEvents = (mock = []) =>
  useQuery({ queryKey: ['events'], queryFn: () => listPublicEvents(mock) });
export const useEvent = (slug, mock = []) =>
  useQuery({ queryKey: ['events', slug], queryFn: () => getEventBySlug(slug, mock), enabled: Boolean(slug) });
export const useStats = (mock = []) => useQuery({ queryKey: ['stats'], queryFn: () => listStats(mock) });
export const usePartners = (mock = []) => useQuery({ queryKey: ['partners'], queryFn: () => listPartners(mock) });
export const useTeam = (mock = []) => useQuery({ queryKey: ['team'], queryFn: () => listTeam(mock) });
export const useCommittees = (mock = []) => useQuery({ queryKey: ['committees'], queryFn: () => listCommittees(mock) });
export const useNews = (mock = []) => useQuery({ queryKey: ['news'], queryFn: () => listNews(mock) });
export const useGallery = (mock = []) => useQuery({ queryKey: ['gallery'], queryFn: () => listGallery(mock) });
export const useApplicationsOpen = () =>
  useQuery({ queryKey: ['applications-open'], queryFn: () => getApplicationsOpen(true), staleTime: 30 * 1000 });
