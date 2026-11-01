import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // public content rarely changes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
