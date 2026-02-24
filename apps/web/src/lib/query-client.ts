import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Never retry connectivity failures — the API server isn't reachable.
        // Retrying would just flood the console with duplicate 500 errors.
        if (error instanceof Error && error.name === 'ServerUnavailableError') return false;
        // For real API errors, allow one retry.
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false, // Never auto-retry mutations — user should re-trigger explicitly
    },
  },
});
