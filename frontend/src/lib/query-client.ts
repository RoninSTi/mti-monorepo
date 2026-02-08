import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - avoids excessive refetching
      retry: 1,                  // Single retry on failure
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
    },
  },
})
