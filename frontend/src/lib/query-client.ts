import { QueryClient, QueryCache } from '@tanstack/react-query'

const queryCache = new QueryCache({
  onError: (error) => {
    // Handle both ApiError (from fetch) and generic Error objects
    const message = error instanceof Error
      ? error.message
      : 'An unexpected error occurred'
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
