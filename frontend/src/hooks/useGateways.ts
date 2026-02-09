import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Gateway, CreateGatewayInput, UpdateGatewayInput, PaginatedResponse } from '@/types/api'

// Query key factory for hierarchical cache invalidation
export const gatewayKeys = {
  all: ['gateways'] as const,
  lists: () => [...gatewayKeys.all, 'list'] as const,
  list: (filters: { factory_id?: string; limit?: number; offset?: number }) =>
    [...gatewayKeys.lists(), filters] as const,
  details: () => [...gatewayKeys.all, 'detail'] as const,
  detail: (id: string) => [...gatewayKeys.details(), id] as const,
}

// List gateways with optional factory filter
export function useGateways(params?: { factory_id?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: gatewayKeys.list(params || {}),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.factory_id) searchParams.set('factory_id', params.factory_id)
      if (params?.limit) searchParams.set('limit', params.limit.toString())
      if (params?.offset) searchParams.set('offset', params.offset.toString())

      const query = searchParams.toString()
      return api.get<PaginatedResponse<Gateway>>(`/gateways${query ? `?${query}` : ''}`)
    },
  })
}

// Get single gateway by ID
export function useGateway(id: string) {
  return useQuery({
    queryKey: gatewayKeys.detail(id),
    queryFn: () => api.get<Gateway>(`/gateways/${id}`),
    enabled: !!id,
  })
}

// Create gateway
export function useCreateGateway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateGatewayInput) => api.post<Gateway>('/gateways', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.lists() })
    },
  })
}

// Update gateway with optimistic update
export function useUpdateGateway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGatewayInput }) =>
      api.put<Gateway>(`/gateways/${id}`, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: gatewayKeys.detail(id) })

      // Snapshot previous value
      const previous = queryClient.getQueryData<Gateway>(gatewayKeys.detail(id))

      // Optimistically update to the new value
      if (previous) {
        queryClient.setQueryData<Gateway>(gatewayKeys.detail(id), {
          ...previous,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }

      return { previous }
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(gatewayKeys.detail(id), context.previous)
      }
    },
    onSettled: (_data, _error, { id }) => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: gatewayKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: gatewayKeys.lists() })
    },
  })
}

// Delete gateway (soft delete)
export function useDeleteGateway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/gateways/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.lists() })
    },
  })
}
