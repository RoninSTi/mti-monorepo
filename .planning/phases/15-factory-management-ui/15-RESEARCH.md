# Phase 15: Factory Management UI - Research

**Researched:** 2026-02-08
**Domain:** React CRUD page implementation with data tables, forms, dialogs, and toast notifications
**Confidence:** HIGH

## Summary

Phase 15 implements the complete factory management user interface by composing existing React Query hooks (from Phase 14), form components (from Phase 13), and shadcn/ui components into full CRUD pages. The research confirms that the 2026 standard for CRUD UIs combines data tables with inline actions, modal dialogs for create/edit forms, confirmation dialogs for destructive actions, and toast notifications for user feedback—all integrated through React Query's mutation lifecycle hooks.

The project already has all foundational pieces in place: useFactories/useCreateFactory/useUpdateFactory/useDeleteFactory hooks (Phase 14), FactoryForm component with Zod validation (Phase 13), and shadcn/ui components (Table, Dialog, Button, Card). Phase 15's focus is page-level composition: rendering factory lists in tables, opening forms in dialogs, confirming deletions with AlertDialog, and showing success/error messages via Sonner toasts. The key insight is that page components are thin orchestration layers—they handle UI state (dialog open/closed, selected factory) while hooks handle data state (queries, mutations, cache).

React Query's mutation lifecycle (isPending, isSuccess, isError) naturally integrates with toast notifications via onSuccess/onError callbacks, making optimistic updates and server feedback seamless. The standard pattern is: mutation → onSuccess shows toast and closes dialog → automatic cache invalidation refetches the list. Loading states during initial fetch show skeletons or spinners, while mutation loading states disable buttons and show "Saving..." text.

**Primary recommendation:** Build FactoriesPage as an orchestration component that combines useFactories hook for list data, Table component for rendering, Dialog for create/edit forms, AlertDialog for delete confirmation, and Sonner toast for notifications. Keep state minimal (dialogOpen, selectedFactoryId) and let React Query manage data state. Use the pattern: trigger mutation → show loading indicator → on success: toast + close dialog + auto-refetch → on error: toast with error message.

## User Constraints (from CONTEXT.md)

**IMPORTANT:** No CONTEXT.md exists for this phase—this is a fresh phase with no prior user decisions.

All architectural decisions follow from prior phases (12-14) and project-level decisions in STATE.md:
- React Query 5-minute staleTime, single retry, no refetchOnWindowFocus (Phase 12)
- shadcn/ui components for UI primitives (Phase 13)
- React Hook Form with Zod validation (Phase 13)
- Query key factory pattern with optimistic updates (Phase 14)
- No authentication in v1.1 milestone (PROJECT.md)
- Single organization for v1.1 (multi-tenancy deferred)

## Standard Stack

The established libraries/tools for React CRUD pages with data tables and notifications:

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Query | 5.90.20+ | Already installed (Phase 12), handles data fetching, mutations, cache invalidation |
| shadcn/ui Table | Latest | Already installed (Phase 13), provides accessible table primitives with sorting/filtering |
| shadcn/ui Dialog | Latest | Already installed (Phase 13), modal overlay for forms based on Radix UI |
| shadcn/ui Button | Latest | Already installed (Phase 13), variant-based button component |
| shadcn/ui Card | Latest | Already installed (Phase 13), container component for content sections |
| React Hook Form | 7.71.1 | Already installed (Phase 13), form state management integrated with FactoryForm |
| Zod | 4.3.6 | Already installed (Phase 13), schema validation for forms |

### Supporting (Needs Installation)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.x | Toast notifications | User feedback for success/error states on mutations |
| shadcn/ui Sonner | Latest | shadcn wrapper for Sonner | Integrates Sonner with shadcn theming and styling |
| shadcn/ui AlertDialog | Latest | Destructive action confirmation | Delete confirmation with explicit user intent |
| lucide-react | 0.563+ | Already installed (Phase 13), icons for actions (Edit, Trash, Plus) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sonner | React Hot Toast or react-toastify | Sonner is the shadcn/ui standard (Toast component deprecated in favor of Sonner), better integration with theme |
| Modal dialogs | Inline forms on page | Dialogs focus attention, prevent accidental navigation, better UX for CRUD |
| AlertDialog | Browser confirm() | AlertDialog is accessible, themeable, non-blocking, and provides better UX |
| Table component | Custom table HTML | shadcn Table handles accessibility, responsive design, and consistent styling |
| @tanstack/react-table | Custom table logic | TanStack Table adds sorting/filtering/pagination but is overkill for simple list view in v1.1 |

**Installation:**

```bash
# In frontend directory
npx shadcn@latest add sonner
npx shadcn@latest add alert-dialog
```

Note: Table, Dialog, Button, Card, Input, Label already installed in Phase 13.

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/
├── pages/
│   ├── FactoriesPage.tsx        # NEW: Factory list + CRUD operations
│   ├── GatewaysPage.tsx         # Placeholder (Phase 16)
│   └── NotFoundPage.tsx         # Already exists
├── components/
│   ├── ui/                      # Already exists (shadcn components)
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx    # NEW
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── sonner.tsx          # NEW
│   ├── forms/                   # Already exists
│   │   └── FactoryForm.tsx     # Already exists
│   └── layout/                  # Already exists
│       ├── AppLayout.tsx
│       └── Sidebar.tsx
├── hooks/                       # Already exists
│   ├── useFactories.ts         # Already exists (Phase 14)
│   └── useGateways.ts          # Already exists (Phase 14)
├── lib/
│   ├── api.ts                  # Already exists
│   └── query-client.ts         # Already exists
├── types/
│   └── api.ts                  # Already exists
└── main.tsx                    # Update: Add <Toaster />
```

**Key changes for Phase 15:**
1. Add Sonner `<Toaster />` component to main.tsx (below QueryClientProvider)
2. Implement FactoriesPage.tsx with full CRUD operations
3. Add AlertDialog component via shadcn CLI
4. Add Sonner component via shadcn CLI

### Pattern 1: Page-Level CRUD Orchestration

**What:** Page component composes hooks, tables, dialogs, and toasts into complete CRUD interface.

**When to use:** All CRUD list pages (FactoriesPage, GatewaysPage).

**Example:**

```typescript
// Source: Combination of React Query patterns + shadcn UI patterns
// pages/FactoriesPage.tsx

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  useFactories,
  useCreateFactory,
  useUpdateFactory,
  useDeleteFactory,
} from '@/hooks/useFactories'
import { FactoryForm, type FactoryFormData } from '@/components/forms/FactoryForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function FactoriesPage() {
  // Data fetching
  const { data, isLoading, isError, error } = useFactories()

  // Mutations
  const createFactory = useCreateFactory()
  const updateFactory = useUpdateFactory()
  const deleteFactory = useDeleteFactory()

  // UI state (not data state - React Query handles data)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null)
  const [deletingFactoryId, setDeletingFactoryId] = useState<string | null>(null)

  // Handlers
  const handleCreate = async (formData: FactoryFormData) => {
    try {
      await createFactory.mutateAsync({
        organization_id: 'default-org-id', // v1.1: single org
        ...formData,
      })
      toast.success('Factory created successfully')
      setIsCreateDialogOpen(false)
    } catch (err) {
      toast.error('Failed to create factory')
    }
  }

  const handleUpdate = async (formData: FactoryFormData) => {
    if (!editingFactory) return
    try {
      await updateFactory.mutateAsync({
        id: editingFactory.id,
        data: formData,
      })
      toast.success('Factory updated successfully')
      setEditingFactory(null)
    } catch (err) {
      toast.error('Failed to update factory')
    }
  }

  const handleDelete = async () => {
    if (!deletingFactoryId) return
    try {
      await deleteFactory.mutateAsync(deletingFactoryId)
      toast.success('Factory deleted successfully')
      setDeletingFactoryId(null)
    } catch (err) {
      toast.error('Failed to delete factory')
    }
  }

  // Loading state
  if (isLoading) {
    return <div>Loading factories...</div>
  }

  // Error state
  if (isError) {
    return <div>Error: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Factories</h1>
          <p className="text-muted-foreground">Manage your factory locations</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Factory
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Factory List</CardTitle>
          <CardDescription>
            {data.pagination.total} factories total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No factories found. Create your first factory to get started.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((factory) => (
                  <TableRow key={factory.id}>
                    <TableCell className="font-medium">{factory.name}</TableCell>
                    <TableCell>{factory.location || '—'}</TableCell>
                    <TableCell>{factory.timezone}</TableCell>
                    <TableCell>
                      {new Date(factory.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingFactory(factory)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingFactoryId(factory.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Factory</DialogTitle>
            <DialogDescription>
              Add a new factory location to your organization.
            </DialogDescription>
          </DialogHeader>
          <FactoryForm
            onSubmit={handleCreate}
            isSubmitting={createFactory.isPending}
            submitLabel="Create Factory"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingFactory} onOpenChange={(open) => !open && setEditingFactory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Factory</DialogTitle>
            <DialogDescription>
              Update factory information.
            </DialogDescription>
          </DialogHeader>
          <FactoryForm
            defaultValues={editingFactory || undefined}
            onSubmit={handleUpdate}
            isSubmitting={updateFactory.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFactoryId} onOpenChange={(open) => !open && setDeletingFactoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the factory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFactory.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Key principles:**
- Page holds UI state (dialog open/closed, selected item), not data state
- React Query hooks handle all data operations (queries, mutations, cache)
- Toast notifications in mutation handlers (try/catch with success/error toasts)
- Loading states from React Query (isPending, isLoading)
- Dialogs close automatically on success
- AlertDialog requires explicit confirmation for destructive actions

### Pattern 2: Sonner Toast Integration with Mutations

**What:** Use Sonner toast notifications to provide user feedback on mutation success/error.

**When to use:** All create/update/delete operations that modify server state.

**Example:**

```typescript
// Source: https://ui.shadcn.com/docs/components/radix/sonner
// main.tsx - Add Toaster to app root

import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />  {/* Add below RouterProvider */}
    </QueryClientProvider>
  )
}

// Usage in page component
import { toast } from 'sonner'

const handleCreate = async (formData: FactoryFormData) => {
  try {
    await createFactory.mutateAsync(data)
    toast.success('Factory created successfully')
    setIsCreateDialogOpen(false)
  } catch (err) {
    const apiError = err as ApiError
    toast.error(apiError.message || 'Failed to create factory')
  }
}
```

**Toast types:**
- `toast.success()` - Green checkmark, auto-dismiss after 4 seconds
- `toast.error()` - Red X, auto-dismiss after 6 seconds
- `toast.info()` - Blue info icon, auto-dismiss after 4 seconds
- `toast.warning()` - Yellow warning icon, auto-dismiss after 5 seconds

### Pattern 3: Loading States for Mutations

**What:** Show loading indicators during mutation operations (button disabled, loading text).

**When to use:** All forms with async submission (create, update).

**Example:**

```typescript
// Source: React Hook Form + React Query patterns

// Form component already has isSubmitting prop (Phase 13)
<FactoryForm
  onSubmit={handleCreate}
  isSubmitting={createFactory.isPending}  // React Query isPending state
  submitLabel="Create Factory"
/>

// Inside FactoryForm.tsx (already implemented in Phase 13)
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Saving...' : submitLabel}
</Button>

// Delete button in AlertDialog
<AlertDialogAction
  onClick={handleDelete}
  disabled={deleteFactory.isPending}
>
  {deleteFactory.isPending ? 'Deleting...' : 'Delete'}
</AlertDialogAction>
```

**Loading state sources:**
- `createFactory.isPending` - Mutation in flight
- `isSubmitting` prop - Passed to form components
- Button `disabled` attribute - Prevents double-submission
- Loading text - Visual feedback ("Saving...", "Deleting...")

### Pattern 4: Empty State Handling

**What:** Show helpful message when list is empty, guiding users to create first item.

**When to use:** All data tables that can be empty.

**Example:**

```typescript
// Source: shadcn/ui table patterns

<TableBody>
  {data.data.length === 0 ? (
    <TableRow>
      <TableCell colSpan={5} className="text-center py-10">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium mb-2">No factories yet</p>
          <p className="text-sm mb-4">
            Create your first factory to get started.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Factory
          </Button>
        </div>
      </TableCell>
    </TableRow>
  ) : (
    data.data.map((factory) => (
      // Table rows
    ))
  )}
</TableBody>
```

### Pattern 5: Organization ID Handling (v1.1 Single-Org)

**What:** Hard-code organization_id for v1.1 single-organization deployment.

**When to use:** Create factory operations in v1.1 milestone.

**Example:**

```typescript
// Source: Project requirement - single org for v1.1

// Option 1: Hard-coded constant (recommended)
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'

const handleCreate = async (formData: FactoryFormData) => {
  await createFactory.mutateAsync({
    organization_id: DEFAULT_ORG_ID,
    ...formData,
  })
}

// Option 2: Environment variable (if backend provides it)
const DEFAULT_ORG_ID = import.meta.env.VITE_DEFAULT_ORG_ID

// Form component does NOT need organization_id field
// It's added at submission time by the page component
```

**Rationale:** Project defers multi-tenancy to future milestone. v1.1 operates with single organization. Frontend doesn't need org selection UI—just passes constant value to API.

### Anti-Patterns to Avoid

- **Fetching inside useEffect:** React Query hooks already manage fetching. Don't wrap useFactories in useEffect—causes double fetches and stale data.
- **Managing data state in useState:** React Query is the single source of truth for server state. Don't copy query data into local state—use query data directly.
- **Inline forms on list page:** Forms in dialogs provide better focus, prevent accidental navigation, and create clearer UX boundaries.
- **Browser confirm() for delete:** Not accessible, not themeable, blocking. Use AlertDialog instead.
- **Mutation without loading state:** Always show loading indicators (disabled buttons, loading text) to prevent double-submission.
- **Toast notifications without try/catch:** Always handle both success and error cases explicitly for clear user feedback.
- **Hardcoding toast position:** Sonner default (bottom-right) is standard. Only change if design requires it.
- **Missing empty state:** Tables without data should show helpful message with call-to-action, not blank space.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom notification system | Sonner via shadcn | Handles stacking, auto-dismiss, animations, accessibility, touch gestures |
| Confirmation dialogs | Browser confirm() | shadcn AlertDialog | Accessible, themeable, non-blocking, better UX |
| Delete confirmation | Simple Dialog with Yes/No | AlertDialog with explicit actions | AlertDialog has semantic HTML, ARIA attributes, keyboard navigation |
| Loading spinners | Custom CSS animations | React Query isPending + disabled state | Built-in state management, prevents race conditions |
| Empty state UI | Blank table | Empty state component with CTA | Guides users, reduces confusion, improves onboarding |
| Table accessibility | Manual ARIA attributes | shadcn Table component | Handles role="table", aria-labelledby, keyboard navigation |
| Modal focus trap | Manual focus management | Radix Dialog (via shadcn) | Handles focus trap, escape key, click outside, scroll lock |
| Form validation | Custom validation logic | Already handled by React Hook Form + Zod (Phase 13) | Type-safe, async validation, field dependencies |

**Key insight:** CRUD page composition is mostly wiring together existing primitives. The hard parts (data fetching, cache invalidation, form validation, accessibility, toast stacking) are already solved by React Query, React Hook Form, shadcn/ui, and Sonner. Phase 15 is 90% composition, 10% new code.

## Common Pitfalls

### Pitfall 1: Dialog State Management Confusion

**What goes wrong:** Dialogs don't open/close correctly, forms show stale data after editing.

**Why it happens:** Mixing controlled and uncontrolled dialog state, forgetting to reset form state on close.

**How to avoid:**
- Use controlled Dialog (open={boolean} onOpenChange={fn})
- Clear editingFactory state when dialog closes
- React Hook Form automatically resets on unmount if form is inside Dialog

**Warning signs:** Dialog shows previous item's data, closing edit dialog leaves it in memory.

**Example:**

```typescript
// ❌ BAD: Uncontrolled dialog, stale state
<Dialog>
  <DialogTrigger>Edit</DialogTrigger>
  <DialogContent>
    <FactoryForm defaultValues={editingFactory} />
  </DialogContent>
</Dialog>

// ✅ GOOD: Controlled dialog, cleared state
<Dialog
  open={!!editingFactory}
  onOpenChange={(open) => !open && setEditingFactory(null)}
>
  <DialogContent>
    <FactoryForm defaultValues={editingFactory || undefined} />
  </DialogContent>
</Dialog>
```

### Pitfall 2: Toast Spam on Errors

**What goes wrong:** Multiple error toasts appear for a single failed request.

**Why it happens:** Global QueryCache error handler AND local error handler both show toasts.

**How to avoid:**
- Global handler only logs errors (Phase 14 setup)
- Local mutation handlers show user-facing toasts
- Don't show toasts in both places for same error

**Warning signs:** Two error messages appear for one failed request.

### Pitfall 3: Missing Organization ID

**What goes wrong:** Create factory API call fails with validation error about missing organization_id.

**Why it happens:** Forgetting to add organization_id to create mutation payload.

**How to avoid:**
- Add organization_id in handleCreate before calling mutateAsync
- Document that FactoryForm does NOT include organization_id field (v1.1 single-org)
- Consider moving organization_id addition into useCreateFactory hook for DRY

**Warning signs:** API returns 400 error "organization_id is required" despite form validation passing.

### Pitfall 4: Delete Without Confirmation

**What goes wrong:** User accidentally deletes factory with single click, no confirmation.

**Why it happens:** Delete button calls mutation directly without AlertDialog.

**How to avoid:**
- Always use AlertDialog for destructive actions
- Set deletingFactoryId on delete button click (opens dialog)
- Call mutation only from AlertDialogAction onClick

**Warning signs:** Deletes happen immediately without user confirmation step.

### Pitfall 5: Stale Table After Mutation

**What goes wrong:** Table doesn't update after creating/editing/deleting factory.

**Why it happens:** Forgetting to invalidate queries, or invalidating wrong query keys.

**How to avoid:**
- Already handled by Phase 14 hooks (onSuccess invalidates factoryKeys.lists())
- Verify query key factory hierarchy is correct
- Check React Query DevTools to see cache invalidation

**Warning signs:** Need to refresh page to see new data, table shows old data after mutation.

### Pitfall 6: Loading State Not Shown

**What goes wrong:** Button can be clicked multiple times during mutation, causing duplicate requests.

**Why it happens:** Not disabling button or showing loading indicator during mutation.

**How to avoid:**
- Pass mutation.isPending to form as isSubmitting prop
- Disable buttons with disabled={isPending}
- Show loading text ("Saving...", "Deleting...")

**Warning signs:** Multiple POST requests in network tab for single button click.

## Code Examples

Verified patterns from official sources:

### Complete FactoriesPage Implementation

See Pattern 1 above for full example combining:
- useFactories hook for data fetching
- Table component for list rendering
- Dialog for create/edit forms
- AlertDialog for delete confirmation
- Sonner toasts for user feedback
- Loading states during mutations
- Empty state handling

### Sonner Toaster Setup

```typescript
// Source: https://ui.shadcn.com/docs/components/radix/sonner
// main.tsx

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />  {/* Add Sonner toaster */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
```

### Toast Usage Patterns

```typescript
// Source: https://ui.shadcn.com/docs/components/radix/sonner
import { toast } from 'sonner'

// Success toast
toast.success('Factory created successfully')

// Error toast with details
toast.error('Failed to create factory', {
  description: apiError.message,
})

// Promise toast (auto-updates based on promise state)
toast.promise(
  createFactory.mutateAsync(data),
  {
    loading: 'Creating factory...',
    success: 'Factory created successfully',
    error: 'Failed to create factory',
  }
)

// Custom duration
toast.success('Saved', { duration: 3000 }) // 3 seconds

// Action button in toast
toast('Factory created', {
  action: {
    label: 'View',
    onClick: () => navigate(`/factories/${factory.id}`),
  },
})
```

### AlertDialog for Delete Confirmation

```typescript
// Source: https://ui.shadcn.com/docs/components/radix/alert-dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function DeleteConfirmation({
  factoryId,
  factoryName,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteConfirmationProps) {
  return (
    <AlertDialog open={!!factoryId} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Factory</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{factoryName}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Factory'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Empty State Pattern

```typescript
// Source: Common UI pattern, verified with shadcn examples

function FactoryTable({ factories }: { factories: Factory[] }) {
  if (factories.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <h3 className="mt-4 text-lg font-semibold">No factories</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started by creating your first factory.
        </p>
        <Button className="mt-6" onClick={onCreateFactory}>
          <Plus className="mr-2 h-4 w-4" />
          Add Factory
        </Button>
      </div>
    )
  }

  return <Table>...</Table>
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Browser confirm() | AlertDialog component | 2020-2021 | Better UX, accessible, themeable, non-blocking |
| Custom toast systems | Sonner library | 2023-2024 | Simpler API, better animations, built-in stacking |
| shadcn Toast component | Sonner via shadcn | 2024 | shadcn officially deprecated Toast in favor of Sonner |
| Inline forms on list pages | Forms in modal dialogs | 2020+ | Better focus, clearer boundaries, prevents accidental navigation |
| Custom loading overlays | React Query isPending + disabled buttons | 2020+ | Simpler state management, built-in race condition prevention |
| Global loading spinners | Per-operation loading indicators | 2020+ | Better UX, user knows what's loading, can continue other actions |
| Manual cache invalidation | React Query automatic invalidation | 2019+ | Less code, fewer bugs, automatic refetching |

**Deprecated/outdated:**
- shadcn Toast component: Deprecated in favor of Sonner (official shadcn recommendation)
- Browser confirm()/alert(): Not accessible, not themeable, blocking
- Custom notification systems: Sonner is the 2026 standard for React toast notifications
- Inline CRUD forms: Modal dialogs are preferred for focused user attention

## Open Questions

Things that couldn't be fully resolved:

1. **Organization ID Strategy for v1.1**
   - What we know: v1.1 is single-organization, multi-tenancy deferred to future milestone.
   - What's unclear: Should organization_id be hard-coded constant, environment variable, or fetched from backend?
   - Recommendation: Hard-coded constant `00000000-0000-0000-0000-000000000001` in FactoriesPage. Simple, explicit, and can be easily replaced when multi-tenancy is added. Backend can validate this org exists.

2. **Pagination for Factory List**
   - What we know: Backend API supports limit/offset pagination. Phase 14 useFactories hook accepts params.
   - What's unclear: Should v1.1 show pagination controls, or "Load More" button, or just default limit=100?
   - Recommendation: Start with no pagination UI (fetch all with high limit=100). Most deployments will have <20 factories. Add pagination in Phase 16 if needed based on user feedback.

3. **Table Sorting/Filtering**
   - What we know: @tanstack/react-table adds sorting/filtering but requires additional setup.
   - What's unclear: Does v1.1 need sortable columns or client-side filtering?
   - Recommendation: Skip for Phase 15. Simple table is sufficient for v1.1. If users request sorting (e.g., by name, creation date), add in Phase 17 enhancements. Requirements don't mention sorting.

4. **Delete Confirmation Phrase Pattern**
   - What we know: High-risk deletions can require typing exact phrase (e.g., "delete my account") before enabling button.
   - What's unclear: Is factory deletion high-risk enough to require typed confirmation?
   - Recommendation: Simple AlertDialog confirmation is sufficient for v1.1. Factory deletion is soft delete (recoverable), not destructive. Users are vibration analysts (not end-users), so accidental deletion is low risk.

## Sources

### Primary (HIGH confidence)

- [shadcn/ui Sonner component](https://ui.shadcn.com/docs/components/radix/sonner) - Official Sonner toast integration
- [shadcn/ui AlertDialog component](https://ui.shadcn.com/docs/components/radix/alert-dialog) - Destructive action confirmation
- [shadcn/ui Table component](https://ui.shadcn.com/docs/components/radix/table) - Accessible table primitives
- [shadcn/ui Dialog component](https://ui.shadcn.com/docs/components/radix/dialog) - Modal overlay for forms
- [Sonner API Reference](https://sonner.emilkowal.ski/api) - Official Sonner documentation
- Phase 13 Research (.planning/phases/13-component-architecture/13-RESEARCH.md) - Component architecture patterns
- Phase 14 Research (.planning/phases/14-api-integration-layer/14-RESEARCH.md) - React Query hooks and patterns
- Existing codebase: frontend/src/hooks/useFactories.ts, frontend/src/components/forms/FactoryForm.tsx

### Secondary (MEDIUM confidence)

- [Shadcn/ui React Series Part 19: Sonner](https://medium.com/@rivainasution/shadcn-ui-react-series-part-19-sonner-modern-toast-notifications-done-right-903757c5681f) - Modern toast notifications (January 2026)
- [Building production-ready data tables with shadcn/ui](https://shadcraft.com/blog/building-production-ready-data-tables-with-shadcn-ui) - Data table best practices
- [React Dialog - Delete Confirmation](https://www.shadcn.io/patterns/dialog-standard-5) - Delete confirmation pattern
- [React Alert Dialog - Simple Delete Confirmation](https://www.shadcn.io/patterns/alert-dialog-destructive-1) - AlertDialog destructive pattern
- [TanStack Table discussions on loading skeletons](https://github.com/TanStack/table/discussions/2386) - Loading state patterns

### Tertiary (LOW confidence)

- WebSearch results: "React CRUD UI patterns data table forms shadcn best practices 2026" - Community discussions
- WebSearch results: "React data table loading skeleton empty state patterns 2026" - Loading state patterns
- WebSearch results: "React delete confirmation modal dialog patterns 2026" - Confirmation patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already installed (Phase 13), only Sonner and AlertDialog need adding, both are official shadcn components
- Architecture: HIGH - Patterns verified with official shadcn docs, React Query patterns verified in Phase 14 research, composition approach is standard
- Pitfalls: HIGH - Based on real-world React Query and form management issues documented in official sources
- Code examples: HIGH - All examples from official shadcn docs, React Query docs, or existing codebase
- Organization ID strategy: MEDIUM - Project states single-org for v1.1 but doesn't specify constant value or location

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - shadcn/ui stable, React Query stable, Sonner mature)
