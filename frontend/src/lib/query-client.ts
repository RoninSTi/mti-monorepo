import { QueryClient, QueryCache } from '@tanstack/react-query'
import type { ApiError } from '@/types/api'

const queryCache = new QueryCache({
  onError: (error) => {
    const apiError = error as ApiError
    const message = apiError?.message || 'An unexpected error occurred'
    console.error('Background query error:', message)
  },
})

export const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - avoids excessive refetching
      retry: 1,                  // Single retry on failure
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
    },
  },
})
