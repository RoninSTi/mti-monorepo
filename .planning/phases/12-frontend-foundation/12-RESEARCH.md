# Phase 12: Frontend Foundation - Research

**Researched:** 2026-02-08
**Domain:** React frontend with Vite, TypeScript, and modern tooling
**Confidence:** HIGH

## Summary

Phase 12 establishes a React frontend application using Vite as the build tool, TypeScript for type safety, and a modern UI stack consisting of Tailwind CSS, shadcn/ui components, React Query for server state, and React Hook Form for form handling. The research confirms that this stack represents the current industry standard for React applications in 2026, with excellent developer experience, fast build times (Vite is 40x faster than Create React App), and production-ready tooling.

The backend API already exists (Fastify on port 3000 with endpoints at `/api/factories` and `/api/gateways`), so the frontend primarily needs to configure proxy settings during development and create a typed API client with React Query for data fetching. The theming infrastructure using CSS variables is natively supported in Tailwind v4, making theme switching straightforward to implement in future phases.

**Primary recommendation:** Use `npm create vite@latest` with the react-ts template as the foundation, configure Tailwind v4 with the official @tailwindcss/vite plugin, initialize shadcn/ui via CLI, and set up React Query with DevTools for debugging. This approach provides a battle-tested, maintainable foundation that scales from development to production.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ | UI framework | Industry standard, required for React Query v5 (uses useSyncExternalStore) |
| Vite | 7.3.1+ | Build tool & dev server | 40x faster builds than CRA, native ESM, excellent HMR, official React template |
| TypeScript | 5.0+ | Type safety | First-class support in Vite, catches errors at compile time, required by project |
| Tailwind CSS | 4.x | Utility-first CSS | Industry standard, v4 uses CSS variables natively, official Vite plugin |
| shadcn/ui | Latest | UI component library | Copy-paste components (full control), built on Radix UI, Tailwind-based |
| TanStack Query v5 | 5.90.20+ | Server state management | Industry standard for API state, automatic caching/refetching, requires React 18+ |
| React Hook Form | Latest | Form handling | TypeScript-first, excellent DX, minimal re-renders, standard for complex forms |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query-devtools | Latest | Debug queries/mutations | Development only (auto-excluded in production builds) |
| @tailwindcss/vite | Latest | Tailwind v4 Vite plugin | Required for Tailwind v4 integration with Vite |
| @types/node | Latest | Node.js types for Vite config | Required for path resolution in vite.config.ts |
| vite-tsconfig-paths | Optional | Auto-load TS path aliases | Alternative to manual path alias configuration |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vite | Webpack/Parcel | Vite is 40x faster and has better DX; Webpack is more mature but slower |
| TanStack Query | SWR/RTK Query | SWR is simpler but less powerful; RTK Query couples state to Redux |
| React Hook Form | Formik | Formik is more mature but has more re-renders and worse TypeScript support |
| shadcn/ui | Material-UI/Chakra | MUI/Chakra are npm packages (less control); shadcn gives you the code |
| Tailwind v4 | Tailwind v3 | v3 works but v4 has native CSS variables, simplified config, better DX |

**Installation:**
```bash
# Create Vite project with React + TypeScript template
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install Tailwind CSS with Vite plugin (v4)
npm install tailwindcss @tailwindcss/vite

# Install React Query and DevTools
npm install @tanstack/react-query @tanstack/react-query-devtools

# Install React Hook Form
npm install react-hook-form

# Install Node types for Vite config
npm install -D @types/node

# Initialize shadcn/ui (interactive CLI)
npx shadcn@latest init
# Then add components as needed:
npx shadcn@latest add button
```

## Architecture Patterns

### Recommended Project Structure

```
frontend/
├── public/                  # Static assets (favicon, images)
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # shadcn/ui components (from CLI)
│   │   └── ...            # Custom components
│   ├── features/          # Feature-based modules (future phases)
│   │   ├── factories/     # Factory management feature
│   │   └── gateways/      # Gateway management feature
│   ├── lib/               # Utility functions, helpers
│   │   ├── api.ts         # API client with base configuration
│   │   ├── utils.ts       # shadcn/ui utilities (cn helper)
│   │   └── query-client.ts # React Query client config
│   ├── hooks/             # Custom React hooks
│   │   └── use-*.ts       # Hook files (use-factories.ts, etc.)
│   ├── types/             # TypeScript type definitions
│   │   └── api.ts         # API response types matching backend
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point with providers
│   └── index.css          # Global styles + Tailwind import
├── vite.config.ts         # Vite configuration (proxy, plugins)
├── tsconfig.json          # TypeScript configuration (paths)
├── tailwind.config.js     # Tailwind configuration (if needed)
├── components.json        # shadcn/ui configuration
└── package.json
```

### Pattern 1: Provider Setup in main.tsx

**What:** Wrap the app with QueryClientProvider and optionally add DevTools
**When to use:** Every React Query project needs this at the root
**Example:**
```typescript
// Source: https://tanstack.com/query/v5/docs/framework/react/installation
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

### Pattern 2: Vite Proxy Configuration for Backend API

**What:** Configure Vite dev server to proxy API requests to the Fastify backend
**When to use:** When frontend (port 5173) needs to connect to backend (port 3000)
**Example:**
```typescript
// Source: https://vite.dev/config/server-options
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // No rewrite needed - backend expects /api prefix
      },
    },
  },
})
```

### Pattern 3: API Client with Type Safety

**What:** Centralized API client with base configuration and typed methods
**When to use:** All projects need a single source of truth for API calls
**Example:**
```typescript
// src/lib/api.ts
// Source: Best practices from React Query community
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }
    return response.json()
  },

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }
    return response.json()
  },

  // PUT, DELETE methods follow same pattern
}

// Type definitions matching backend
export interface Factory {
  id: string
  organization_id: string
  name: string
  location: string | null
  timezone: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

### Pattern 4: React Query Custom Hook

**What:** Encapsulate API calls in custom hooks with React Query
**When to use:** Every API endpoint should have a corresponding hook
**Example:**
```typescript
// src/hooks/use-factories.ts
// Source: https://tanstack.com/query/v5/docs/framework/react/guides/queries
import { useQuery } from '@tanstack/react-query'
import { api, PaginatedResponse, Factory } from '@/lib/api'

export function useFactories(limit = 10, offset = 0) {
  return useQuery({
    queryKey: ['factories', limit, offset],
    queryFn: () =>
      api.get<PaginatedResponse<Factory>>(
        `/factories?limit=${limit}&offset=${offset}`
      ),
  })
}

// Usage in component:
// const { data, isLoading, error } = useFactories()
```

### Pattern 5: Tailwind v4 CSS Variables for Theming

**What:** Use @theme directive to define CSS variables for colors
**When to use:** Setting up theming infrastructure for future dark mode/theme switching
**Example:**
```css
/* src/index.css */
/* Source: https://tailwindcss.com/docs/theme */
@import "tailwindcss";

@theme {
  /* Primary colors */
  --color-primary: oklch(0.5 0.2 250);
  --color-primary-foreground: oklch(0.98 0.01 250);

  /* Background colors */
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.1 0 0);

  /* Border colors */
  --color-border: oklch(0.9 0 0);
}

/* Dark mode overrides (future phase) */
@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: oklch(0.1 0 0);
    --color-foreground: oklch(0.98 0 0);
  }
}
```

### Pattern 6: shadcn/ui Component Usage

**What:** Import and use shadcn/ui components after installation via CLI
**When to use:** Building UI with consistent, accessible components
**Example:**
```typescript
// After: npx shadcn@latest add button
// Source: https://ui.shadcn.com/docs/installation/vite
import { Button } from '@/components/ui/button'

export function MyComponent() {
  return (
    <div>
      <Button variant="default">Click me</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Installing shadcn/ui via npm:** shadcn/ui is NOT an npm package. Use the CLI to copy components into your project. Installing via npm will fail.
- **Using require() in Vite config:** Vite uses ESM. Use `import` statements, not `require()`. This is a common migration mistake from CRA.
- **Not setting changeOrigin in proxy:** Without `changeOrigin: true`, the Host header won't match the backend, causing request failures.
- **Hardcoding API URLs:** Use environment variables (`import.meta.env.VITE_API_URL`) so the same code works in dev/staging/production.
- **Skipping staleTime configuration:** React Query's default staleTime is 0, causing excessive refetches. Set appropriate staleTime (e.g., 5 minutes) for better performance.
- **Fetching in useEffect instead of React Query:** Manual fetching with useEffect leads to cache duplication, race conditions, and more code. Always use React Query for API calls.
- **Not using TypeScript generics with useQuery:** Type the query result with `useQuery<ResponseType>` for full type safety.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client with retries, caching | Custom fetch wrapper with cache logic | React Query (TanStack Query) | React Query handles caching, refetching, deduplication, retries, background sync, optimistic updates. Custom solutions miss edge cases (request waterfalls, race conditions, stale-while-revalidate). |
| Form validation | Manual useState + validation logic | React Hook Form + Zod | React Hook Form optimizes re-renders, provides excellent TypeScript support, integrates with Zod for schema validation. Manual forms have performance issues at scale. |
| Accessible UI components | DIY dropdowns, dialogs, tooltips | shadcn/ui (built on Radix UI) | Accessibility is hard (keyboard navigation, ARIA, focus management). shadcn/ui components are battle-tested and accessible by default. |
| CSS-in-JS theming | Custom CSS variable management | Tailwind v4 @theme directive | Tailwind v4 has built-in CSS variable support with theme variables. Hand-rolling theme switching misses edge cases (SSR flash, media query handling). |
| API request deduplication | Track in-flight requests manually | React Query automatic deduplication | Multiple components calling the same query only triggers one network request. Custom deduplication is complex and error-prone. |
| Environment variable loading | Custom .env parser | Vite's built-in import.meta.env | Vite automatically loads .env files and exposes VITE_-prefixed variables. Custom loading misses mode-specific files (.env.production, etc.). |

**Key insight:** Modern frontend development has standardized solutions for common problems. The ecosystem has matured significantly - React Query, React Hook Form, and shadcn/ui represent years of community iteration and edge case handling. Custom solutions will miss these learnings and require ongoing maintenance as your application scales.

## Common Pitfalls

### Pitfall 1: Environment Variable Misconfiguration

**What goes wrong:** Variables not accessible in browser code, or CORS errors due to wrong API URL
**Why it happens:**
- Forgetting the `VITE_` prefix (only VITE_-prefixed variables are exposed to client code for security)
- Using `process.env` instead of `import.meta.env` (Vite uses import.meta.env, not Node.js process.env)
- Wrong .env file placement (must be in project root, not src/)
**How to avoid:**
- Always prefix client-side variables with `VITE_` (e.g., `VITE_API_URL`)
- Access via `import.meta.env.VITE_API_URL`, not `process.env.VITE_API_URL`
- Use .env for defaults, .env.local for local overrides (gitignored)
**Warning signs:**
- "undefined is not a function" when accessing env vars
- CORS errors because API URL is undefined
- Variables work locally but not in production

### Pitfall 2: Path Alias Configuration Mismatch

**What goes wrong:** IDE shows no errors, but Vite build fails with "Cannot find module '@/components/...'"
**Why it happens:**
- TypeScript compiler (tsconfig.json) knows about aliases, but Vite doesn't
- Forgot to install @types/node for path.resolve in vite.config.ts
- Alias configured in tsconfig.json but not in vite.config.ts
**How to avoid:**
- Configure BOTH tsconfig.json (for TypeScript) AND vite.config.ts (for Vite bundler)
- Install @types/node: `npm install -D @types/node`
- Alternatively, use vite-tsconfig-paths plugin to auto-sync from tsconfig
**Warning signs:**
- Import works in IDE but fails at runtime
- "Cannot find module" error only during build, not in IDE
- Path imports work with relative paths (../../) but not aliases (@/)

### Pitfall 3: React Query Overuse and Performance

**What goes wrong:** Application becomes slow with hundreds of useQuery calls, excessive re-renders
**Why it happens:**
- Using useQuery in every component without considering render performance
- Creating request waterfalls (child components query after parent renders)
- Not setting appropriate staleTime (defaults to 0, causing constant refetches)
**How to avoid:**
- Set global staleTime default (e.g., 5 minutes) for most queries
- Use query keys thoughtfully - structure them hierarchically (['factories', id])
- Prefetch data in parent components to avoid waterfalls
- Use React Query DevTools to identify performance issues
**Warning signs:**
- Slow page loads despite fast API responses
- Network tab shows duplicate requests for the same endpoint
- DevTools shows hundreds of active query subscribers

### Pitfall 4: shadcn/ui Incorrect Installation

**What goes wrong:** Components don't render, "Cannot find module '@/components/ui/button'" error
**Why it happens:**
- Trying to install shadcn/ui via npm (it's not an npm package - it's a code generator)
- Not running `npx shadcn@latest init` before adding components
- Path alias (@/) not configured before shadcn init
- Tailwind CSS not installed/configured before shadcn
**How to avoid:**
- Install Tailwind CSS FIRST
- Configure path alias (@/) in tsconfig.json and vite.config.ts BEFORE shadcn init
- Run `npx shadcn@latest init` to set up configuration
- Then add components with `npx shadcn@latest add [component-name]`
**Warning signs:**
- "Cannot find module" errors for @/components/ui/*
- Components render but have no styles
- shadcn CLI complains about missing configuration

### Pitfall 5: Vite Proxy CORS Issues

**What goes wrong:** API calls work in production but fail in development with CORS errors
**Why it happens:**
- Proxy not configured, so browser makes request from localhost:5173 to localhost:3000 (different origins)
- Missing `changeOrigin: true` in proxy config (Host header doesn't match backend)
- Proxy path doesn't match API routes (e.g., proxy '/api' but calling '/factories')
**How to avoid:**
- Always set `changeOrigin: true` in proxy configuration
- Match proxy paths to backend routes (backend uses /api prefix, so proxy /api)
- Don't rewrite paths if backend expects the prefix (no rewrite needed here)
- Test proxy with `curl http://localhost:5173/api/health` (should hit backend)
**Warning signs:**
- CORS errors only in development, not production
- Network tab shows request to localhost:5173/api instead of localhost:3000/api
- Preflight OPTIONS requests failing

### Pitfall 6: TypeScript Configuration Scope

**What goes wrong:** Type errors in vite.config.ts, or src/ files not type-checked
**Why it happens:**
- Vite scaffolds with tsconfig.json, tsconfig.app.json, and tsconfig.node.json
- vite.config.ts uses tsconfig.node.json (Node types), src/ uses tsconfig.app.json (DOM types)
- Developers modify only tsconfig.json, missing the split configuration
**How to avoid:**
- Understand the three configs: tsconfig.json (references others), tsconfig.app.json (app code), tsconfig.node.json (Vite config)
- Add path aliases to BOTH tsconfig.json AND tsconfig.app.json
- Don't delete the reference configs - Vite needs this separation
**Warning signs:**
- Type errors in vite.config.ts despite correct types
- Path aliases work in config but not in app code (or vice versa)
- Build passes but IDE shows errors (or vice versa)

## Code Examples

Verified patterns from official sources:

### Basic Fetch with React Query

```typescript
// Source: https://tanstack.com/query/v5/docs/framework/react/overview
import { useQuery } from '@tanstack/react-query'

interface Todo {
  id: number
  title: string
  completed: boolean
}

function TodoList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: async (): Promise<Todo[]> => {
      const response = await fetch('/api/todos')
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    },
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {data?.map(todo => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  )
}
```

### React Hook Form with TypeScript

```typescript
// Source: https://react-hook-form.com/get-started
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'

type FormData = {
  name: string
  location: string
  timezone: string
}

export function FactoryForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  const onSubmit = (data: FormData) => {
    console.log(data)
    // Use React Query mutation here
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name', { required: 'Name is required' })} />
      {errors.name && <span>{errors.name.message}</span>}

      <input {...register('location')} />

      <input {...register('timezone', { required: true })} />
      {errors.timezone && <span>Timezone is required</span>}

      <Button type="submit">Submit</Button>
    </form>
  )
}
```

### shadcn/ui cn() Utility

```typescript
// Source: https://ui.shadcn.com/docs/installation/vite
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage: Merge Tailwind classes without conflicts
<Button className={cn('bg-blue-500', isActive && 'bg-green-500')}>
  Click me
</Button>
```

### Vite Environment Variable Usage

```typescript
// Source: https://vite.dev/guide/env-and-mode
// .env (in project root)
VITE_API_URL=http://localhost:3000/api

// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// TypeScript support (src/vite-env.d.ts)
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create React App | Vite | 2021-2022 | 40x faster builds, better DX, native ESM |
| Tailwind v3 PostCSS config | Tailwind v4 Vite plugin | 2024 | Simplified setup, native CSS variables, no tailwind.config.js needed |
| React Query v4 | React Query v5 (TanStack Query) | 2023 | Requires React 18+, better TypeScript, improved API |
| fetch/axios without caching | React Query for all API calls | 2021-present | Automatic caching, background refetch, optimistic updates |
| Material-UI/Ant Design (npm packages) | shadcn/ui (copy-paste components) | 2023-present | Full control over components, no bundle size bloat from unused components |
| Manual form state management | React Hook Form | 2019-present | Better performance (fewer re-renders), excellent TypeScript support |

**Deprecated/outdated:**
- **Create React App:** No longer maintained, replaced by Vite, Next.js, Remix
- **Webpack for new projects:** Still used in legacy apps, but Vite is faster and simpler for new projects
- **Tailwind v3 without Vite plugin:** v4 has official @tailwindcss/vite plugin, don't use PostCSS config manually
- **React Query v4:** v5 is current, requires React 18+, has breaking changes but better API
- **Redux for server state:** Use React Query for server state, Redux only for complex client state

## Open Questions

Things that couldn't be fully resolved:

1. **Mono-repo vs separate repositories**
   - What we know: Frontend will be a separate codebase from backend (backend is in same repo currently)
   - What's unclear: Should frontend live in `/frontend` subdirectory, or separate repo entirely?
   - Recommendation: Start with `/frontend` subdirectory in same repo for v1.1. Shared types (Factory, Gateway) can be imported from backend. Evaluate mono-repo tools (Turborepo, Nx) in future milestone if complexity grows.

2. **API type sharing strategy**
   - What we know: Backend has TypeScript types (Factory, Gateway, etc.) that frontend needs
   - What's unclear: Should frontend duplicate types, import from backend, or use OpenAPI/tRPC code generation?
   - Recommendation: For v1.1, manually define types in frontend matching backend schemas. Consider tRPC or OpenAPI codegen in future milestone when API stabilizes and team grows.

3. **Exact shadcn/ui components needed**
   - What we know: Phase requires "shadcn/ui components installed and accessible", Button component must be importable
   - What's unclear: Which other components to install upfront vs. add as needed?
   - Recommendation: Install Button component only for Phase 12 verification. Add Table, Form, Dialog, etc. in Phase 13 when building actual UI features. shadcn components are added individually via CLI, so no overhead in waiting.

4. **Production environment variable management**
   - What we know: Development uses .env with VITE_ prefix, production needs different API URL
   - What's unclear: How will production environment variables be injected (Docker, CI/CD, hosting platform)?
   - Recommendation: For v1.1, use .env.production for production API URL. Document that VITE_ variables are embedded at BUILD time (not runtime), so rebuilds needed for URL changes. Address runtime config in future milestone if needed.

## Sources

### Primary (HIGH confidence)

- [Vite Official Guide - Getting Started](https://vite.dev/guide/) - Scaffolding, features, configuration
- [Tailwind CSS - Installing with Vite](https://tailwindcss.com/docs/guides/vite) - Tailwind v4 Vite plugin setup
- [Tailwind CSS - Theme Variables](https://tailwindcss.com/docs/theme) - CSS variables for theming
- [shadcn/ui - Vite Installation](https://ui.shadcn.com/docs/installation/vite) - Complete setup steps for shadcn with Vite
- [TanStack Query v5 - Installation](https://tanstack.com/query/v5/docs/framework/react/installation) - React Query setup
- [React Hook Form - Get Started](https://react-hook-form.com/get-started) - Basic setup and TypeScript usage
- [Vite - Environment Variables](https://vite.dev/guide/env-and-mode) - VITE_ prefix, import.meta.env usage

### Secondary (MEDIUM confidence)

- [Complete Guide to Setting Up React with TypeScript and Vite (2026)](https://medium.com/@robinviktorsson/complete-guide-to-setting-up-react-with-typescript-and-vite-2025-468f6556aaf2) - Comprehensive 2026 setup guide
- [How to Set Up a Production-Ready React Project with TypeScript and Vite](https://oneuptime.com/blog/post/2026-01-08-react-typescript-vite-production-setup/view) - Production best practices
- [Shadcn UI Best Practices for 2026](https://medium.com/write-a-catalyst/shadcn-ui-best-practices-for-2026-444efd204f44) - Component organization, accessibility mistakes
- [Simplifying API Proxies in Vite: A Guide to vite.config.js](https://medium.com/@eric_abell/simplifying-api-proxies-in-vite-a-guide-to-vite-config-js-a5cc3a091a2f) - Proxy configuration examples
- [Separate API Layers In React Apps - 6 Steps Towards Maintainable Code](https://profy.dev/article/react-architecture-api-layer) - API client organization patterns
- [React Query Complete Beginner's Guide - TanStack Query v5 + React + Vite](https://dev.to/myogeshchavan97/react-query-complete-beginners-guide-tanstack-query-v5-react-vite-4h60) - Complete setup tutorial

### Tertiary (LOW confidence)

- [React Environment Setup (2026): Node + Vite + the Gotchas That Waste Hours](https://thelinuxcode.com/react-environment-setup-2026-node-vite-the-gotchas-that-waste-hours/) - Common mistakes and gotchas
- [Pitfalls of React Query](https://nickb.dev/blog/pitfalls-of-react-query/) - Performance issues with overuse
- Community discussions on path aliases, proxy configuration, environment variables

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries have official documentation, are widely adopted, and have clear version requirements
- Architecture: HIGH - Patterns verified with official docs (Vite, TanStack Query, shadcn/ui), confirmed by multiple 2026 sources
- Pitfalls: MEDIUM-HIGH - Most pitfalls from official troubleshooting docs and recent community discussions; some are anecdotal but verified across multiple sources

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - stack is stable, Vite/React/TanStack have predictable release cycles)

**Notes:**
- Backend API already exists (Fastify on port 3000) with routes at `/api/factories` and `/api/gateways`
- CORS is already configured on backend via @fastify/cors plugin
- No authentication required for v1.1 (per STATE.md decision)
- Frontend will run on Vite default port 5173 during development
- Proxy configuration maps `/api` requests from 5173 → 3000
