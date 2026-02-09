import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Factory,
  CreateFactoryInput,
  UpdateFactoryInput,
  PaginatedResponse,
} from '@/types/api'

/**
 * Query key factory for factories.
 * Hierarchical structure enables precise cache invalidation.
 */
export const factoryKeys = {
  all: ['factories'] as const,
  lists: () => [...factoryKeys.all, 'list'] as const,
  list: (filters: { limit?: number; offset?: number }) =>
    [...factoryKeys.lists(), filters] as const,
  details: () => [...factoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...factoryKeys.details(), id] as const,
}

/**
 * Fetch paginated list of factories.
 */
export function useFactories(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: factoryKeys.list(params || {}),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.limit !== undefined) {
        searchParams.set('limit', params.limit.toString())
      }
      if (params?.offset !== undefined) {
        searchParams.set('offset', params.offset.toString())
      }
      const query = searchParams.toString()
      const endpoint = query ? `/factories?${query}` : '/factories'
      return api.get<PaginatedResponse<Factory>>(endpoint)
    },
  })
}

/**
 * Fetch single factory by ID.
 */
export function useFactory(id: string) {
  return useQuery({
    queryKey: factoryKeys.detail(id),
    queryFn: () => api.get<Factory>(`/factories/${id}`),
    enabled: !!id,
  })
}

/**
 * Create new factory.
 */
export function useCreateFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateFactoryInput) =>
      api.post<Factory>('/factories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: factoryKeys.lists() })
    },
  })
}

/**
 * Update existing factory with optimistic update.
 */
export function useUpdateFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFactoryInput }) =>
      api.put<Factory>(`/factories/${id}`, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches for this factory
      await queryClient.cancelQueries({ queryKey: factoryKeys.detail(id) })

      // Snapshot previous value
      const previous = queryClient.getQueryData<Factory>(factoryKeys.detail(id))

      // Optimistically update with new data
      if (previous) {
        queryClient.setQueryData<Factory>(factoryKeys.detail(id), {
          ...previous,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }

      return { previous }
    },
    onError: (_err, { id }, context) => {
      // Rollback to previous value on error
      if (context?.previous) {
        queryClient.setQueryData(factoryKeys.detail(id), context.previous)
      }
    },
    onSettled: (_data, _error, { id }) => {
      // Sync with server regardless of success/error
      queryClient.invalidateQueries({ queryKey: factoryKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: factoryKeys.lists() })
    },
  })
}

/**
 * Delete (soft-delete) factory.
 */
export function useDeleteFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/factories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: factoryKeys.lists() })
    },
  })
}
