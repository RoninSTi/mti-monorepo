# Phase 17: Quality & Polish - Research

**Researched:** 2026-02-08
**Domain:** Frontend quality assurance, TypeScript strict mode, responsive design, validation patterns, documentation
**Confidence:** HIGH

## Summary

Phase 17 focuses on production readiness through five core areas: TypeScript strict mode enablement, form validation patterns, responsive design, component consistency, and developer documentation. The existing codebase already has strong foundations (strict: true is enabled, React Hook Form + Zod is in use, Tailwind CSS v4 is configured), so this phase is primarily about verification, edge case handling, and documentation rather than major refactoring.

The research reveals that TypeScript's strict mode in the current tsconfig.app.json is already enabled with additional strictness flags (noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch). The forms already use Zod validation with clear error messages. Tailwind CSS v4 uses a mobile-first approach with five default breakpoints. The main work will be:
1. Verifying zero TypeScript errors across the codebase
2. Auditing all forms for consistent error handling
3. Testing responsive behavior at desktop (1920x1080) and tablet (768x1024) breakpoints
4. Documenting component patterns observed in FactoriesPage and GatewaysPage
5. Creating a comprehensive README for 5-minute setup

**Primary recommendation:** Focus on verification and documentation rather than major code changes. The architecture is sound; ensure consistency and document patterns.

## Standard Stack

The established libraries/tools for frontend quality assurance and production readiness:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type safety | Industry standard with strict mode for production apps |
| ESLint | 9.39.1 | Code quality | Catches bugs, enforces patterns, React-specific rules |
| Vite | 7.2.4+ | Build tool | Fast builds, optimized production output, HMR |
| React Hook Form | 7.71.1+ | Form handling | Performance-optimized, minimal re-renders, great DX |
| Zod | 4.3.6+ | Schema validation | Type-safe validation, excellent TypeScript integration |
| Tailwind CSS | 4.1.18+ | Styling | Utility-first, responsive design, v4 performance improvements |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typescript-eslint | 8.46.4+ | TypeScript linting | Already configured, can enable type-aware rules |
| @hookform/resolvers | 5.2.2+ | Validation bridge | Connects Zod schemas to React Hook Form |
| Prettier | (optional) | Code formatting | If team wants auto-formatting beyond ESLint |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ESLint | Biome | Faster but less mature ecosystem (2026) |
| React Hook Form | Formik | More opinionated, heavier bundle, fewer features |
| Zod | Yup | No TypeScript inference, separate type definitions needed |

**Installation:**
All dependencies are already installed. No additional packages required for Phase 17.

## Architecture Patterns

### Current Project Structure (Verified)
```
frontend/src/
├── components/         # UI components and forms
│   ├── ui/            # shadcn/ui primitives (Button, Input, Dialog, etc.)
│   ├── forms/         # Controlled forms with Zod validation
│   └── layout/        # AppLayout, Sidebar
├── hooks/             # Custom React Query hooks (useFactories, useGateways)
├── lib/               # Utilities (cn, API client)
├── pages/             # Route components (FactoriesPage, GatewaysPage)
├── types/             # TypeScript type definitions
├── main.tsx           # App entry point
└── index.css          # Tailwind imports
```

### Pattern 1: Page Component with CRUD Operations
**What:** Standard pattern for list/detail pages with create, read, update, delete operations
**When to use:** All entity management pages (factories, gateways, future entities)
**Example:**
```typescript
// Source: Verified in FactoriesPage.tsx and GatewaysPage.tsx
export function EntityPage() {
  // UI state (dialogs, modals)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Entity | null>(null)
  const [deletingItem, setDeletingItem] = useState<Entity | null>(null)

  // Data fetching with React Query
  const { data, isLoading, isError, error } = useEntities()

  // Mutations
  const createEntity = useCreateEntity()
  const updateEntity = useUpdateEntity()
  const deleteEntity = useDeleteEntity()

  // Handler functions
  async function handleCreate(formData: FormData) {
    try {
      await createEntity.mutateAsync(formData)
      toast.success('Entity created successfully')
      setIsCreateDialogOpen(false)
    } catch {
      toast.error('Failed to create entity')
    }
  }

  // Loading state
  if (isLoading) {
    return <LoadingSpinner />
  }

  // Error state
  if (isError) {
    return <ErrorCard error={error} />
  }

  // Main UI: Header + Table + Dialogs
  return (
    <div className="space-y-6">
      {/* Page header with title and "Add" button */}
      {/* Data table with actions */}
      {/* Create/Edit/Delete dialogs */}
    </div>
  )
}
```

### Pattern 2: Form Component with Zod Validation
**What:** Reusable form component with schema validation and error display
**When to use:** All forms that need validation (create/edit dialogs)
**Example:**
```typescript
// Source: Verified in FactoryForm.tsx and GatewayForm.tsx
export const entityFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  email: z.string().email('Must be a valid email address'),
  optional_field: z.string().max(200).optional().or(z.literal('')),
})

export type EntityFormData = z.infer<typeof entityFormSchema>

interface EntityFormProps {
  defaultValues?: Partial<EntityFormData>
  onSubmit: (data: EntityFormData) => Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
}

export function EntityForm({ defaultValues, onSubmit, isSubmitting, submitLabel }: EntityFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<EntityFormData>({
    resolver: zodResolver(entityFormSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  )
}
```

### Pattern 3: Custom React Query Hook
**What:** Abstraction for API calls with loading, error, and data states
**When to use:** All API interactions (CRUD operations)
**Example:**
```typescript
// Source: Pattern observed in useFactories.tsx and useGateways.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useEntities(params?: QueryParams) {
  return useQuery({
    queryKey: ['entities', params],
    queryFn: () => apiClient.getEntities(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInput) => apiClient.createEntity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })
}
```

### Pattern 4: Responsive Design with Tailwind
**What:** Mobile-first responsive utilities with Tailwind's breakpoint system
**When to use:** All UI components and layouts
**Example:**
```typescript
// Source: Tailwind CSS v4 documentation + current codebase usage
// Mobile-first: base styles apply to all sizes, breakpoints apply upward

// Layout spacing: mobile → tablet → desktop
<div className="space-y-4 md:space-y-6">

// Grid: 1 column → 2 columns → 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Typography: smaller on mobile
<h1 className="text-2xl md:text-3xl font-bold">

// Tables: horizontal scroll on mobile, fixed on desktop
<div className="overflow-x-auto">
  <Table>...</Table>
</div>

// Dialog widths: full width on mobile, constrained on desktop
<DialogContent className="w-full md:max-w-lg">
```

### Anti-Patterns to Avoid

- **Using `any` type instead of proper types:** Defeats the purpose of TypeScript strict mode. Use `unknown` and type guards instead.
- **Ignoring form validation errors:** Always display `errors.field.message` near the input field for immediate user feedback.
- **Fixed pixel widths without responsive variants:** Always provide mobile-first base styles with responsive overrides.
- **Inline API calls in components:** Always use custom hooks (React Query) for data fetching to enable caching and error handling.
- **Not handling loading/error states:** Every data-fetching component must handle `isLoading`, `isError`, and empty data cases.
- **Using `sm:` prefix for mobile:** Tailwind is mobile-first; `sm:` means "small screens and up", not "only small screens".

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation logic | Custom validation functions | Zod + React Hook Form + @hookform/resolvers | Schema validation, TypeScript inference, error handling, field-level validation, touched/dirty states |
| API state management | useState + useEffect with fetch | @tanstack/react-query | Automatic caching, background refetching, optimistic updates, loading/error states, request deduplication |
| Responsive breakpoints | Custom CSS media queries | Tailwind's breakpoint system (sm:, md:, lg:, xl:, 2xl:) | Consistent breakpoints, mobile-first, composable utilities, less CSS to write |
| Toast notifications | Custom notification system | Sonner (already installed) | Accessible, animated, stackable, promise-based, TypeScript support |
| Component styling | Plain CSS or inline styles | Tailwind CSS utilities + cn() helper | Consistent design tokens, no CSS naming conflicts, tree-shakeable, faster development |
| Date formatting | Custom date functions | Built-in `Intl.DateTimeFormat` or date-fns (if needed) | Locale-aware, timezone support, edge case handling |

**Key insight:** Frontend development in 2026 has mature solutions for common problems. The combination of TypeScript + React Query + React Hook Form + Zod + Tailwind handles 90% of application needs without custom abstractions.

## Common Pitfalls

### Pitfall 1: TypeScript Strict Mode Violations After Enabling
**What goes wrong:** Enabling strict mode reveals hundreds of implicit `any` types and null/undefined issues that compiled before.
**Why it happens:** JavaScript to TypeScript migration often leaves type assertions incomplete. The codebase currently has `strict: true` but may have edge cases.
**How to avoid:**
- Run `npm run build` (which runs `tsc -b`) to verify zero TypeScript errors
- Check for `@ts-ignore` or `@ts-expect-error` comments and resolve them
- Ensure all function parameters and return types are explicitly typed
- Handle nullable fields with optional chaining (`?.`) or null checks
**Warning signs:**
- Build completes but with warnings
- IDE shows errors that don't fail the build
- Type errors only appear in production builds

### Pitfall 2: Incomplete Form Validation Messages
**What goes wrong:** Forms submit without validation, or show generic "Invalid" messages instead of specific guidance.
**Why it happens:** Developer forgets to display `errors.field.message` or doesn't provide custom error messages in Zod schema.
**How to avoid:**
- Always render error messages below each input: `{errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}`
- Provide clear messages in Zod schemas: `z.string().min(1, 'Email is required').email('Must be a valid email address')`
- Test all validation paths (required, min/max length, format validation, custom rules)
- Never rely on browser HTML5 validation alone (can be bypassed)
**Warning signs:**
- Users submit invalid forms
- Error messages are too generic ("String must contain at least 1 character(s)")
- No visual feedback when validation fails

### Pitfall 3: Responsive Design Tested Only on Desktop
**What goes wrong:** Application works perfectly on developer's 1920x1080 monitor but breaks on tablet (768x1024) with horizontal scroll or truncated content.
**Why it happens:** Developers test on desktop browsers without responsive design testing. Tailwind's mobile-first approach is misunderstood.
**How to avoid:**
- Use browser DevTools responsive mode to test at 768px width (tablet) and 375px width (mobile)
- Test both portrait (768x1024) and landscape (1024x768) tablet orientations
- Verify tables, forms, and dialogs don't cause horizontal scroll
- Use Tailwind's responsive utilities: `className="w-full md:w-1/2 lg:w-1/3"`
- Avoid fixed widths: prefer `max-w-*` utilities with `w-full`
**Warning signs:**
- Tables extend beyond viewport on tablet
- Dialogs are wider than screen
- Text overflows containers
- Need to pinch-zoom to read content

### Pitfall 4: Inconsistent Component Patterns Across Pages
**What goes wrong:** Different pages use different hook patterns, error handling approaches, or state management styles, making the codebase harder to maintain.
**Why it happens:** Multiple developers or iterative development without pattern documentation. Code reviews don't catch inconsistencies.
**How to avoid:**
- Document established patterns in README (this phase's goal)
- Use FactoriesPage and GatewaysPage as reference implementations
- Establish conventions: always use React Query for data fetching, always show loading states with Loader2 icon, always use toast for success/error feedback
- Code review checklist: "Does this follow the pattern from FactoriesPage?"
**Warning signs:**
- Some pages use React Query, others use useEffect + fetch
- Error handling varies (some pages show error cards, others just console.log)
- Loading indicators differ across pages
- Form validation patterns inconsistent

### Pitfall 5: Outdated or Missing README Documentation
**What goes wrong:** New developer clones the repo and spends hours figuring out how to run the project, install dependencies, or understand the architecture.
**Why it happens:** README was created once and never updated as the project evolved. Developers assume knowledge is obvious.
**How to avoid:**
- Test README by following it exactly on a fresh machine or dev container
- Include all prerequisites (Node.js version, npm/pnpm, environment variables)
- Document the "happy path": clone → install → configure → run in under 5 minutes
- List common commands: `npm run dev`, `npm run build`, `npm run lint`
- Explain project structure and key patterns (link to this research doc)
**Warning signs:**
- README is generic Vite template
- No setup instructions for environment variables
- Missing prerequisite versions (Node, npm)
- No explanation of project structure

### Pitfall 6: Not Testing Empty States and Edge Cases
**What goes wrong:** Application crashes or shows confusing UI when there's no data, API errors, or network failures.
**Why it happens:** Developers test "happy path" with seeded data but don't test empty lists, failed requests, or slow networks.
**How to avoid:**
- Test with empty database (no factories, no gateways)
- Simulate network errors (disconnect internet, use browser DevTools offline mode)
- Test loading states by throttling network in DevTools
- Verify all data accesses handle undefined/null: `data?.field` or `data?.items?.length === 0`
- Current codebase already handles these well (see FactoriesPage empty state), but verify all pages
**Warning signs:**
- White screen when API is unreachable
- "Cannot read property of undefined" errors in console
- Tables show "undefined" instead of empty state message
- Loading indicators never disappear on error

## Code Examples

Verified patterns from current codebase and official documentation:

### TypeScript Strict Mode Configuration
```json
// Source: frontend/tsconfig.app.json (verified)
{
  "compilerOptions": {
    "strict": true,                           // Enables all strict flags
    "noUnusedLocals": true,                  // Error on unused variables
    "noUnusedParameters": true,              // Error on unused function params
    "noFallthroughCasesInSwitch": true,      // Error on switch fallthrough
    "noUncheckedSideEffectImports": true,    // Error on side-effect imports without type checking
    "skipLibCheck": true,                     // Skip .d.ts files (performance)
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }          // Path alias for imports
  }
}
```

### Form Validation with Error Messages
```typescript
// Source: frontend/src/components/forms/GatewayForm.tsx (verified)
export const gatewayFormSchema = z.object({
  name: z.string().min(1, 'Gateway name is required').max(100, 'Name must be 100 characters or less'),
  url: z.string().url('Must be a valid URL'),
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
  model: z.string().max(100).optional().or(z.literal('')),  // Optional field pattern
})

// Edit mode: password becomes optional
export const gatewayEditSchema = gatewayFormSchema.extend({
  password: z.string().optional().or(z.literal('')),
})

// In component:
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="admin@gateway.local"
    {...register('email')}
  />
  {errors.email && (
    <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
  )}
</div>
```

### Responsive Layout with Tailwind CSS v4
```typescript
// Source: Current codebase patterns + Tailwind CSS v4 docs
// Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)

// Page container: full width with max constraint
<div className="container mx-auto px-4 md:px-6 lg:px-8">

// Spacing: increases at larger breakpoints
<div className="space-y-4 md:space-y-6">

// Grid: 1 column → 2 columns at tablet → 3 at desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Typography: scales with screen size
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">

// Dialog width: full on mobile, constrained on desktop
<DialogContent className="w-full md:max-w-lg lg:max-w-2xl">

// Table overflow: horizontal scroll on small screens
<div className="overflow-x-auto">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead className="hidden md:table-cell">Created</TableHead>
      </TableRow>
    </TableHeader>
  </Table>
</div>
```

### Loading and Error States
```typescript
// Source: frontend/src/pages/FactoriesPage.tsx (verified pattern)
export function EntityPage() {
  const { data, isLoading, isError, error } = useEntities()

  // Loading state with spinner and message
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading entities...</p>
        </div>
      </div>
    )
  }

  // Error state with retry button
  if (isError) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Entities</CardTitle>
          <CardDescription>{error?.message || 'An unknown error occurred'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  // Safety check (TypeScript narrowing)
  if (!data) {
    return null
  }

  // Empty state
  if (data.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-muted-foreground">No entities yet</p>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Entity
        </Button>
      </div>
    )
  }

  // Main UI
  return <div>{/* ... */}</div>
}
```

### ESLint Configuration for React + TypeScript
```javascript
// Source: frontend/eslint.config.js (current) + recommended additions
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // Optional: enable type-aware linting for stricter checks
      // tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      // Required for type-aware linting:
      // parserOptions: {
      //   project: ['./tsconfig.app.json', './tsconfig.node.json'],
      //   tsconfigRootDir: import.meta.dirname,
      // },
    },
  },
])
```

### README Structure (Developer Setup)
```markdown
# Source: Frontend documentation best practices 2026

# MTI WiFi Management - Frontend

React + TypeScript + Vite application for managing WiFi gateways and factories.

## Prerequisites

- Node.js 20+ (check: `node --version`)
- npm 10+ (check: `npm --version`)
- Backend API running on `http://localhost:8000`

## Quick Start (< 5 minutes)

1. **Clone and navigate:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (if needed):**
   ```bash
   # Create .env.local if API URL is not http://localhost:8000
   echo "VITE_API_URL=http://localhost:8000" > .env.local
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Open http://localhost:5173 in your browser.

## Available Commands

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check (no emit)

## Project Structure

```
src/
├── components/    # UI components and forms
│   ├── ui/       # shadcn/ui primitives (Button, Input, Dialog)
│   ├── forms/    # Form components with Zod validation
│   └── layout/   # AppLayout, Sidebar
├── hooks/        # Custom React Query hooks
├── lib/          # Utilities (API client, cn helper)
├── pages/        # Route components
├── types/        # TypeScript type definitions
└── main.tsx      # App entry point
```

## Key Patterns

**Data Fetching:** Use React Query hooks (e.g., `useFactories()`, `useGateways()`)
**Forms:** React Hook Form + Zod validation (see `components/forms/`)
**Styling:** Tailwind CSS v4 with mobile-first responsive design
**State:** React Query for server state, useState for UI state

See `.planning/phases/17-quality-&-polish/17-RESEARCH.md` for detailed patterns.

## Troubleshooting

**Port 5173 already in use:** Kill existing process or set different port: `npm run dev -- --port 5174`
**API connection errors:** Verify backend is running on `http://localhost:8000`
**TypeScript errors:** Run `npm run build` to see all errors with line numbers

## Tech Stack

- React 19.2
- TypeScript 5.9
- Vite 7.2
- Tailwind CSS 4.1
- React Query 5.90
- React Hook Form 7.71
- Zod 4.3
- shadcn/ui components
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create React App | Vite | 2023-2024 | 40x faster builds, native ESM, better DX |
| Class components | Function components + hooks | 2019+ | Simpler code, better composition, less boilerplate |
| Prop drilling | React Query for server state | 2020+ | Eliminates useState + useEffect for API calls |
| CSS Modules / Styled Components | Tailwind CSS | 2020+ (v4: 2024+) | Faster development, smaller bundles, design system built-in |
| Manual validation | Zod + React Hook Form | 2021+ | Type-safe validation, schema reuse, better DX |
| Formik | React Hook Form | 2020+ | Better performance (fewer re-renders), smaller bundle |
| Webpack | Vite | 2020+ | Fast HMR, native ESM, simpler configuration |
| eslint-plugin-prettier | Separate Prettier + ESLint | 2023+ | Clearer separation, faster linting |

**Deprecated/outdated:**
- **PropTypes:** Replaced by TypeScript for type checking
- **defaultProps:** Deprecated in React 19; use default parameters instead
- **Class components:** Hooks cover all use cases; classes only needed for legacy code
- **@vitejs/plugin-react + Babel:** For performance, use @vitejs/plugin-react-swc (SWC instead of Babel)
- **eslint-plugin-prettier:** Run Prettier and ESLint separately to avoid conflicts

## Open Questions

Things that couldn't be fully resolved:

1. **Code splitting strategy**
   - What we know: Vite automatically code-splits dynamic imports; current bundle is 533kb (warns at 500kb+)
   - What's unclear: Whether route-based code splitting is needed or if current size is acceptable for v1.1
   - Recommendation: Measure actual load time on target devices; if < 3 seconds on 3G, defer optimization to later phase

2. **Type-aware ESLint rules**
   - What we know: `typescript-eslint` supports `recommendedTypeChecked` config for stricter rules
   - What's unclear: Performance impact on large codebases; whether it adds value beyond `strict: true`
   - Recommendation: Optional enhancement; enable if CI builds are fast enough (< 30 seconds)

3. **Responsive design testing at scale**
   - What we know: Need to test at 768x1024 (tablet) and 1920x1080 (desktop) per success criteria
   - What's unclear: Whether to test only critical user flows or every page
   - Recommendation: Test critical flows (create factory, create gateway, view lists) at both breakpoints; document any issues

4. **Documentation format preference**
   - What we know: README should enable 5-minute setup
   - What's unclear: Whether to create additional docs (CONTRIBUTING.md, ARCHITECTURE.md) or keep everything in README
   - Recommendation: Start with comprehensive README; split into separate docs only if it exceeds 200 lines

## Sources

### Primary (HIGH confidence)
- TypeScript Official Docs: https://www.typescriptlang.org/tsconfig/ - Verified strict mode flags
- Tailwind CSS v4 Docs: https://tailwindcss.com/docs/responsive-design - Breakpoints and mobile-first approach
- Current codebase: `frontend/src/` - Verified existing patterns in FactoriesPage, GatewaysPage, forms

### Secondary (MEDIUM confidence)
- [How to Configure TypeScript Strict Mode](https://oneuptime.com/blog/post/2026-01-24-typescript-strict-mode/view) - Incremental migration strategies
- [Tailwind CSS Best Practices 2025-2026](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns) - Design system patterns
- [How to Structure Your README File](https://www.freecodecamp.org/news/how-to-structure-your-readme-file/) - README best practices
- [React Query Error Handling | TkDodo's blog](https://tkdodo.eu/blog/react-query-error-handling) - Error handling patterns
- [The Best ESLint Rules for React Projects](https://dev.to/timwjames/the-best-eslint-rules-for-react-projects-30i8) - ESLint configuration

### Tertiary (LOW confidence - flagged for validation)
- [Creating Responsive Dialog and Drawer Components with shadcn/ui](https://www.nextjsshop.com/resources/blog/responsive-dialog-drawer-shadcn-ui) - Responsive patterns (blog post, not official docs)
- [Vite code splitting that just works](https://sambitsahoo.com/blog/vite-code-splitting-that-works.html) - Code splitting strategies (individual blog)

## Metadata

**Confidence breakdown:**
- TypeScript strict mode: HIGH - Official TypeScript docs + verified in codebase (tsconfig.app.json already has strict: true)
- Form validation patterns: HIGH - Verified in current forms (FactoryForm.tsx, GatewayForm.tsx) + official Zod/React Hook Form docs
- Responsive design: HIGH - Official Tailwind CSS v4 documentation + verified breakpoints
- Component patterns: HIGH - Directly verified in FactoriesPage.tsx and GatewaysPage.tsx
- Documentation best practices: MEDIUM - Community best practices from 2026, not official standards
- Code splitting: MEDIUM - Current build shows 533kb bundle with warning; need to test actual performance
- Type-aware linting: MEDIUM - Optional enhancement, not critical for Phase 17 success criteria

**Research date:** 2026-02-08
**Valid until:** 30 days (March 10, 2026) - Frontend ecosystem is relatively stable; TypeScript, React, and Tailwind patterns don't change frequently
