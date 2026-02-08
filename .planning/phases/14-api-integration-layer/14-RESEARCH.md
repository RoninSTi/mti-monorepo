# Phase 14: API Integration Layer - Research

**Researched:** 2026-02-08
**Domain:** React Query (TanStack Query v5) custom hooks, TypeScript integration, API state management
**Confidence:** HIGH

## Summary

Phase 14 creates a type-safe API integration layer using React Query (TanStack Query v5) custom hooks that connect the frontend to the existing Fastify backend. The research confirms that wrapping useQuery and useMutation in custom hooks is the 2026 industry standard for organizing API logic, providing consistent error handling, automatic cache invalidation, and optimistic updates across the application.

The project already has React Query v5 configured with optimal defaults (5-minute staleTime, single retry, no refetchOnWindowFocus) and TypeScript types manually maintained to match the backend Zod schemas. The integration layer follows a hook-per-operation pattern (useFactories, useCreateFactory, useUpdateFactory, etc.) where each custom hook encapsulates query keys, fetcher functions, error handling, and invalidation logic—keeping UI components focused on presentation while centralizing data management patterns.

Key insights from the research: Query keys should be organized as arrays with feature prefixes to avoid collisions, optimistic updates require the onMutate/onError/onSettled pattern for rollback safety, and error handling works best with a combination of global toast notifications (for background errors) and local error state (for validation errors). The separation of concerns between custom hooks (what data) and UI components (how to display) makes the codebase maintainable and testable.

**Primary recommendation:** Create a `hooks/` directory with feature-based files (useFactories.ts, useGateways.ts), export query key factories for consistency, implement the snapshot-and-rollback pattern for optimistic updates, and use TypeScript generics to ensure type safety from API response through to UI rendering.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.90.20+ | Server state management | Already installed (Phase 12), industry standard for API caching/mutations, React 18+ optimized |
| @tanstack/react-query-devtools | 5.91.3+ | Query debugging | Already installed, essential for development visibility into cache state |
| TypeScript | 5.9+ | Type safety | Already configured, enables end-to-end type safety from backend to UI |
| fetch API | Native | HTTP client | Already used in api.ts, sufficient for REST APIs, no additional dependencies needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.3.6 | Runtime validation | Already in project, useful for validating API responses match expected types |
| React Hook Form | 7.71.1 | Form integration | Already installed (Phase 13), pairs well with mutation hooks for form submission |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom hooks | Inline useQuery/useMutation | Custom hooks centralize logic, make testing easier, and ensure consistency. Inline usage leads to duplication and harder maintenance. |
| Manual types | tRPC or code generation | Manual types work well for small APIs and avoid build complexity. tRPC requires changing backend. Code generation adds build step but eliminates type drift. |
| fetch | Axios or ky | fetch is native and sufficient. Axios adds bundle size. ky has better DX but adds dependency. Project already uses fetch successfully. |
| React Query | SWR or RTK Query | React Query v5 is more feature-complete than SWR (better mutation support, more granular cache control). RTK Query couples state to Redux which isn't used here. |

**Installation:**

Already installed in Phase 12:
```bash
# No additional installations needed
# React Query v5.90.20+ already in frontend/package.json
# TypeScript types manually maintained in frontend/src/types/api.ts
```

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/
├── hooks/
│   ├── useFactories.ts       # Factory query + mutation hooks
│   ├── useGateways.ts        # Gateway query + mutation hooks
│   └── queryKeys.ts          # Centralized query key factory (optional but recommended)
├── lib/
│   ├── api.ts               # HTTP client (already exists)
│   └── query-client.ts      # React Query config (already exists)
├── types/
│   └── api.ts               # TypeScript types matching backend (already exists)
└── components/
    └── forms/               # Form components that consume hooks
```

**Rationale:**
- **hooks/**: Feature-based organization prevents query key collisions and makes hooks discoverable
- **queryKeys.ts**: Optional centralized key management for consistency (alternative: export keys from each hook file)
- **api.ts**: Existing HTTP client already handles errors and serialization
- **types/api.ts**: Manually maintained types mirror backend Zod schemas per project decision

### Pattern 1: Custom Hook per CRUD Operation

**What:** Wrap useQuery/useMutation in feature-specific hooks that export typed results and handle side effects.

**When to use:** Every API operation (list, get, create, update, delete).

**Example:**
```typescript
// Source: TanStack Query docs + community best practices
// hooks/useFactories.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Factory, CreateFactoryInput, PaginatedResponse } from '@/types/api'

// Query key factory for factories feature
export const factoryKeys = {
  all: ['factories'] as const,
  lists: () => [...factoryKeys.all, 'list'] as const,
  list: (filters: { limit?: number; offset?: number }) =>
    [...factoryKeys.lists(), filters] as const,
  details: () => [...factoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...factoryKeys.details(), id] as const,
}

// List factories with pagination
export function useFactories(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: factoryKeys.list(params || {}),
    queryFn: async () => {
      const query = new URLSearchParams()
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.offset) query.set('offset', String(params.offset))
      return api.get<PaginatedResponse<Factory>>(`/factories?${query}`)
    },
  })
}

// Get single factory by ID
export function useFactory(id: string) {
  return useQuery({
    queryKey: factoryKeys.detail(id),
    queryFn: () => api.get<Factory>(`/factories/${id}`),
    enabled: !!id, // Don't fetch if id is empty
  })
}

// Create factory mutation
export function useCreateFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateFactoryInput) =>
      api.post<Factory>('/factories', data),
    onSuccess: () => {
      // Invalidate and refetch all factory lists
      queryClient.invalidateQueries({ queryKey: factoryKeys.lists() })
    },
  })
}
```

**Key principles:**
- Query keys as arrays with feature prefix prevent collisions
- Query key factories provide consistent structure and enable targeted invalidation
- enabled option prevents unnecessary fetches
- onSuccess invalidates cache to trigger automatic refetch
- Full TypeScript inference from API types through to UI

### Pattern 2: Optimistic Updates with Rollback

**What:** Update UI immediately before mutation completes, with automatic rollback on failure.

**When to use:** Any mutation where instant feedback improves UX (create, update, delete).

**Example:**
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates

export function useUpdateFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFactoryInput }) =>
      api.put<Factory>(`/factories/${id}`, data),

    // Step 1: Snapshot current state and update optimistically
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches (so they don't overwrite optimistic update)
      await queryClient.cancelQueries({ queryKey: factoryKeys.detail(id) })

      // Snapshot previous value for rollback
      const previousFactory = queryClient.getQueryData<Factory>(factoryKeys.detail(id))

      // Optimistically update cache
      if (previousFactory) {
        queryClient.setQueryData<Factory>(factoryKeys.detail(id), {
          ...previousFactory,
          ...data,
          updated_at: new Date().toISOString(), // Optimistic timestamp
        })
      }

      // Return context for error handler
      return { previousFactory }
    },

    // Step 2: Rollback on error
    onError: (err, { id }, context) => {
      // Restore previous state
      if (context?.previousFactory) {
        queryClient.setQueryData(factoryKeys.detail(id), context.previousFactory)
      }
    },

    // Step 3: Always refetch to ensure server state is accurate
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: factoryKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: factoryKeys.lists() })
    },
  })
}
```

**Critical steps:**
1. **onMutate**: Cancel ongoing queries, snapshot current data, update cache optimistically
2. **onError**: Restore snapshot if mutation fails
3. **onSettled**: Always refetch to sync with server state (called on both success and error)

### Pattern 3: User-Friendly Error Handling

**What:** Extract meaningful error messages from API responses and display them appropriately.

**When to use:** All queries and mutations (global for background errors, local for validation errors).

**Example:**
```typescript
// Source: https://tkdodo.eu/blog/react-query-error-handling

// lib/query-client.ts - Global error handling for background refetches
import { QueryClient, QueryCache } from '@tanstack/react-query'
import type { ApiError } from '@/types/api'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Only show toast for background errors, not initial fetches
      // Component-level error handling covers initial fetch failures
      const apiError = error as ApiError
      const message = apiError.message || 'An unexpected error occurred'

      // Show toast notification (requires toast library like sonner)
      console.error('Background query error:', message)
      // toast.error(message)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Component usage - local error handling
function FactoriesPage() {
  const { data, isError, error } = useFactories()

  if (isError) {
    const apiError = error as ApiError
    return (
      <div className="text-red-600">
        Failed to load factories: {apiError.message || 'Please try again'}
      </div>
    )
  }

  // ... rest of component
}
```

**Error handling strategy:**
- **Global handler**: Background refetch errors show toast notifications (non-blocking)
- **Local handler**: Initial fetch errors shown inline in component (blocking)
- **Validation errors**: 400-level errors handled locally with specific messages
- **Server errors**: 500-level errors can propagate to Error Boundary

### Anti-Patterns to Avoid

- **Passing arguments to refetch():** refetch() doesn't accept arguments. Use query keys with parameters instead—query keys are reactive and changing them triggers a refetch automatically.
- **Mixing useEffect with useQuery:** useQuery already manages state. Don't wrap it in useEffect—this creates unnecessary re-renders and complexity.
- **String query keys:** Always use array keys even for simple queries. `['factories']` not `'factories'`. Arrays enable filters and prevent future refactoring pain.
- **Overusing useQuery:** Don't create hundreds of query subscribers in a single component. For large lists, use virtualization and paginated queries.
- **Missing QueryClientProvider:** Wrap app root with QueryClientProvider once in main.tsx (already done in Phase 12).
- **Invalidating too broadly:** `invalidateQueries({ queryKey: ['factories'] })` invalidates ALL factory queries. Use precise keys like `factoryKeys.lists()` to avoid unnecessary refetches.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query deduplication | Custom request tracking | React Query's built-in deduplication | Query handles concurrent requests to same endpoint automatically |
| Stale data detection | Manual timestamp comparison | React Query staleTime config | Already configured globally (5 minutes), handles staleness transparently |
| Cache invalidation | Manual cache clearing | invalidateQueries + query keys | Type-safe, precise, and automatic refetching |
| Optimistic updates | Manual state management | React Query onMutate/onError/onSettled | Handles rollback, concurrent updates, and race conditions correctly |
| Loading/error states | useState + useEffect | useQuery/useMutation status | Built-in states (idle, loading, error, success) with better race condition handling |
| Request retries | Custom retry logic | React Query retry config | Exponential backoff, configurable per-query, already set globally (1 retry) |
| Background sync | Manual intervals | React Query refetchInterval | Built-in polling with pause/resume on window focus |

**Key insight:** React Query v5 has spent years solving edge cases (race conditions, cache invalidation, concurrent mutations, request deduplication) that seem simple but are complex to implement correctly. Use the built-in solutions—they're battle-tested across thousands of production apps.

## Common Pitfalls

### Pitfall 1: Request Waterfalls

**What goes wrong:** Components fetch data sequentially instead of in parallel, creating slow loading times.

**Why it happens:** Nested components each call useQuery, but child components don't render until parent data loads.

**How to avoid:**
- Use parallel queries in the parent component
- Consider prefetching data at the route level
- For critical data, fetch in the layout component (AppLayout) so it's ready when pages render

**Warning signs:** Network tab shows sequential requests with delays between them.

**Example:**
```typescript
// ❌ BAD: Waterfall
function FactoryPage({ id }: { id: string }) {
  const { data: factory } = useFactory(id) // Request 1
  if (!factory) return null
  return <GatewayList factoryId={factory.id} /> // Request 2 starts after Request 1
}

// ✅ GOOD: Parallel
function FactoryPage({ id }: { id: string }) {
  const factoryQuery = useFactory(id)
  const gatewaysQuery = useGateways({ factory_id: id }) // Both start immediately

  if (factoryQuery.isLoading || gatewaysQuery.isLoading) return <Spinner />
  if (factoryQuery.isError || gatewaysQuery.isError) return <ErrorMessage />

  return <FactoryWithGateways factory={factoryQuery.data} gateways={gatewaysQuery.data} />
}
```

### Pitfall 2: Stale Query Keys

**What goes wrong:** Query key doesn't include all dependencies, causing stale data to be displayed when filters change.

**Why it happens:** Forgetting to include filter parameters in query key array.

**How to avoid:** Include ALL dependencies in query key—if it affects what data is fetched, it must be in the key.

**Warning signs:** Changing filters doesn't trigger a refetch, old data still displayed.

**Example:**
```typescript
// ❌ BAD: Missing dependency
function useGateways(factoryId?: string) {
  return useQuery({
    queryKey: ['gateways'], // Always same key regardless of factory filter!
    queryFn: () => api.get(`/gateways?factory_id=${factoryId}`),
  })
}

// ✅ GOOD: Key includes dependency
function useGateways(params?: { factory_id?: string }) {
  return useQuery({
    queryKey: ['gateways', 'list', params || {}], // Key changes when params change
    queryFn: () => {
      const query = new URLSearchParams()
      if (params?.factory_id) query.set('factory_id', params.factory_id)
      return api.get(`/gateways?${query}`)
    },
  })
}
```

### Pitfall 3: Over-Invalidating Cache

**What goes wrong:** Every mutation invalidates all queries, causing excessive refetching and poor performance.

**Why it happens:** Using broad query keys like `['factories']` instead of precise keys like `['factories', 'list']`.

**How to avoid:** Use query key factories with hierarchical structure, invalidate only what changed.

**Warning signs:** Network tab shows many unnecessary requests after a mutation, UI feels sluggish.

**Example:**
```typescript
// ❌ BAD: Over-invalidation
export function useCreateFactory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/factories', data),
    onSuccess: () => {
      // Invalidates EVERYTHING with 'factories' prefix (lists, details, etc.)
      queryClient.invalidateQueries({ queryKey: ['factories'] })
    },
  })
}

// ✅ GOOD: Precise invalidation
export function useCreateFactory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/factories', data),
    onSuccess: () => {
      // Only invalidates list queries, not individual factory details
      queryClient.invalidateQueries({ queryKey: factoryKeys.lists() })
    },
  })
}
```

### Pitfall 4: Missing Error Types

**What goes wrong:** Error handling code accesses properties that don't exist, causing "undefined is not an object" errors.

**Why it happens:** Assuming API errors always have the same structure.

**How to avoid:** Type guard API errors and provide fallback messages for unexpected error shapes.

**Warning signs:** Application crashes when API returns unexpected error format.

**Example:**
```typescript
// ❌ BAD: Assumes error structure
function FactoriesPage() {
  const { error } = useFactories()
  return <div>{error.message}</div> // Crashes if error doesn't have .message
}

// ✅ GOOD: Safe error handling
function FactoriesPage() {
  const { isError, error } = useFactories()

  if (isError) {
    const apiError = error as ApiError
    const message = apiError?.message || 'An unexpected error occurred'
    return <div className="text-red-600">Error: {message}</div>
  }

  // ... rest of component
}
```

### Pitfall 5: Optimistic Update Race Conditions

**What goes wrong:** Multiple mutations run concurrently, last one wins, UI shows wrong state.

**Why it happens:** Not canceling ongoing queries before optimistic update, or missing onSettled refetch.

**How to avoid:** Always use the full onMutate → onError → onSettled pattern with cancelQueries.

**Warning signs:** UI shows stale data after mutation, or shows wrong data when multiple updates happen quickly.

**Solution:** Follow Pattern 2 (Optimistic Updates with Rollback) exactly—the cancelQueries call prevents race conditions.

## Code Examples

Verified patterns from official sources:

### Factory CRUD Hooks

```typescript
// hooks/useFactories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Factory,
  CreateFactoryInput,
  UpdateFactoryInput,
  PaginatedResponse
} from '@/types/api'

// Query key factory
export const factoryKeys = {
  all: ['factories'] as const,
  lists: () => [...factoryKeys.all, 'list'] as const,
  list: (filters: { limit?: number; offset?: number }) =>
    [...factoryKeys.lists(), filters] as const,
  details: () => [...factoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...factoryKeys.details(), id] as const,
}

// List factories
export function useFactories(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: factoryKeys.list(params || {}),
    queryFn: async () => {
      const query = new URLSearchParams()
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.offset) query.set('offset', String(params.offset))
      return api.get<PaginatedResponse<Factory>>(`/factories?${query}`)
    },
  })
}

// Get single factory
export function useFactory(id: string) {
  return useQuery({
    queryKey: factoryKeys.detail(id),
    queryFn: () => api.get<Factory>(`/factories/${id}`),
    enabled: !!id,
  })
}

// Create factory
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

// Update factory (with optimistic update)
export function useUpdateFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFactoryInput }) =>
      api.put<Factory>(`/factories/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: factoryKeys.detail(id) })
      const previousFactory = queryClient.getQueryData<Factory>(factoryKeys.detail(id))

      if (previousFactory) {
        queryClient.setQueryData<Factory>(factoryKeys.detail(id), {
          ...previousFactory,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousFactory }
    },
    onError: (err, { id }, context) => {
      if (context?.previousFactory) {
        queryClient.setQueryData(factoryKeys.detail(id), context.previousFactory)
      }
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: factoryKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: factoryKeys.lists() })
    },
  })
}

// Delete factory (soft delete)
export function useDeleteFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/factories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: factoryKeys.lists() })
    },
  })
}
```

### Gateway CRUD Hooks

```typescript
// hooks/useGateways.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Gateway,
  CreateGatewayInput,
  UpdateGatewayInput,
  PaginatedResponse
} from '@/types/api'

// Query key factory
export const gatewayKeys = {
  all: ['gateways'] as const,
  lists: () => [...gatewayKeys.all, 'list'] as const,
  list: (filters: { factory_id?: string; limit?: number; offset?: number }) =>
    [...gatewayKeys.lists(), filters] as const,
  details: () => [...gatewayKeys.all, 'detail'] as const,
  detail: (id: string) => [...gatewayKeys.details(), id] as const,
}

// List gateways (with optional factory filter)
export function useGateways(params?: {
  factory_id?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: gatewayKeys.list(params || {}),
    queryFn: async () => {
      const query = new URLSearchParams()
      if (params?.factory_id) query.set('factory_id', params.factory_id)
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.offset) query.set('offset', String(params.offset))
      return api.get<PaginatedResponse<Gateway>>(`/gateways?${query}`)
    },
  })
}

// Get single gateway
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
    mutationFn: (data: CreateGatewayInput) =>
      api.post<Gateway>('/gateways', data),
    onSuccess: (newGateway) => {
      // Invalidate all lists (general and factory-specific)
      queryClient.invalidateQueries({ queryKey: gatewayKeys.lists() })
    },
  })
}

// Update gateway (with optimistic update)
export function useUpdateGateway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGatewayInput }) =>
      api.put<Gateway>(`/gateways/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: gatewayKeys.detail(id) })
      const previousGateway = queryClient.getQueryData<Gateway>(gatewayKeys.detail(id))

      if (previousGateway) {
        queryClient.setQueryData<Gateway>(gatewayKeys.detail(id), {
          ...previousGateway,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousGateway }
    },
    onError: (err, { id }, context) => {
      if (context?.previousGateway) {
        queryClient.setQueryData(gatewayKeys.detail(id), context.previousGateway)
      }
    },
    onSettled: (_data, _error, { id }) => {
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
```

### Form Integration Example

```typescript
// components/forms/FactoryForm.tsx (integration example)
import { useCreateFactory, useUpdateFactory } from '@/hooks/useFactories'
import type { ApiError } from '@/types/api'

function FactoryForm({ factoryId, onSuccess }: FactoryFormProps) {
  const createFactory = useCreateFactory()
  const updateFactory = useUpdateFactory()

  const handleSubmit = async (data: CreateFactoryInput) => {
    try {
      if (factoryId) {
        await updateFactory.mutateAsync({ id: factoryId, data })
      } else {
        await createFactory.mutateAsync(data)
      }
      onSuccess?.()
    } catch (error) {
      const apiError = error as ApiError
      // Show error in form (using react-hook-form setError or toast)
      console.error('Failed to save factory:', apiError.message)
    }
  }

  const isSubmitting = createFactory.isPending || updateFactory.isPending

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {/* Form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Factory'}
      </button>
    </form>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux for server state | React Query for server state | 2020-2021 | Eliminates boilerplate, automatic caching, better DX |
| Class components + lifecycle methods | Hooks (useQuery/useMutation) | 2019 | More composable, easier to test, less code |
| Manual optimistic updates | onMutate/onError/onSettled pattern | React Query v2 (2020) | Safer rollback, handles race conditions |
| String query keys | Array query keys | React Query v3 (2021) | Better TypeScript support, hierarchical invalidation |
| Callbacks (onSuccess/onError on queries) | Callbacks only on mutations | React Query v5 (2023) | Prevents stale closure bugs, clearer separation of concerns |
| useQuery generics | Automatic type inference | React Query v5 (2023) | Less boilerplate, better type safety |

**Deprecated/outdated:**
- **onSuccess/onError/onSettled on useQuery**: Removed in v5 due to stale closure issues. Use these callbacks only on useMutation.
- **React Query v3 query keys**: String keys still work but array keys are strongly recommended (better TypeScript support).
- **setLogger**: Replaced with more flexible logging approach in v4+.
- **useInfiniteQuery with getPreviousPageParam**: Still supported but less common—most apps use simple pagination instead of infinite scroll.

## Open Questions

Things that couldn't be fully resolved:

1. **Type Sharing Strategy: Manual vs Code Generation**
   - What we know: Project currently uses manual type maintenance (frontend types mirror backend Zod schemas). This works well for small APIs and avoids build complexity.
   - What's unclear: As API grows (30+ endpoints), will manual maintenance become error-prone? Code generation (openapi-typescript, zod-to-ts) eliminates drift but adds build step.
   - Recommendation: Continue manual types for v1.1 (only 10 endpoints). Revisit code generation if type drift becomes an issue (detect via tests comparing runtime responses to types).

2. **Global Error Handling vs Component-Level**
   - What we know: TkDodo recommends combining global toast notifications (background errors) with local error display (initial fetch failures). This prevents duplicate notifications.
   - What's unclear: Project doesn't have a toast library yet. Should this phase include toast integration or defer to Phase 15 (Factory UI)?
   - Recommendation: Phase 14 should export error messages from hooks, Phase 15 can add toast library and wire it up. This keeps Phase 14 focused on data fetching.

3. **Query Key Organization: Single File vs Feature Files**
   - What we know: Two valid patterns exist: centralized queryKeys.ts (all keys in one file) vs distributed (keys exported from each hook file). Both work, tradeoffs are discoverability vs coupling.
   - What's unclear: Which pattern scales better for this specific project size (17 phases, ~10-15 hooks)?
   - Recommendation: Export keys from each hook file (e.g., factoryKeys from useFactories.ts). This keeps related code together and avoids central file becoming a bottleneck. If key sharing across features becomes needed, extract shared keys at that point.

## Sources

### Primary (HIGH confidence)

- [TanStack Query Official Docs - Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - Official optimistic update pattern with onMutate/onError/onSettled
- [TanStack Query Official Docs - Query Keys](https://tanstack.com/query/v5/docs/react/guides/query-keys) - Query key structure and best practices
- [TkDodo's Blog - React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling) - Authoritative error handling patterns from React Query maintainer
- [TkDodo's Blog - Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query) - Mutation patterns and common pitfalls
- Existing codebase: frontend/src/lib/query-client.ts (React Query already configured), frontend/src/types/api.ts (types defined), frontend/src/lib/api.ts (HTTP client ready)

### Secondary (MEDIUM confidence)

- [Building Reusable Queries with TanStack Query](https://oluwadaprof.medium.com/building-reusable-queries-with-tanstack-query-a618c5bc82ff) - January 2026 article on structuring hooks for scalability
- [React Query Best Practices: Separating Concerns with Custom Hooks](https://majidlotfinia.medium.com/react-query-best-practices-separating-concerns-with-custom-hooks-3f1bc9051fa2) - Custom hook organization patterns
- [Pitfalls of React Query](https://nickb.dev/blog/pitfalls-of-react-query/) - Common mistakes and how to avoid them
- [Type-Safe Shared Packages in Turborepo Monorepos](https://www.magnumcode.com/blog/turborepo-shared-types-monorepo) - TypeScript type sharing patterns (context for manual type decision)
- [Query Key Manager](https://next.jqueryscript.net/tanstack/query-key-manager/) - Type-safe query key management library (alternative to manual key factories)

### Tertiary (LOW confidence)

- WebSearch results for "React Query custom hooks patterns 2026" - Community discussions and recent articles
- WebSearch results for "TanStack Query query keys best practices 2026" - Community consensus on key structure
- GitHub TanStack/query discussions - Real-world problems and solutions from users

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - React Query v5 already installed and configured, TypeScript types already defined, HTTP client already implemented
- Architecture: HIGH - Custom hook pattern verified in official docs and maintained by TkDodo (React Query maintainer), optimistic update pattern is official recommendation
- Pitfalls: HIGH - Documented pitfalls come from official blog (TkDodo), confirmed by community discussions
- Error handling: HIGH - Pattern from official maintainer blog, verified with official docs
- Type sharing: MEDIUM - Manual type maintenance is project decision, works for current scale, but long-term scalability uncertain

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - React Query v5 is stable, patterns are mature)
