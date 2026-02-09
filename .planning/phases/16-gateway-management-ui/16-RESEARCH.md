# Phase 16: Gateway Management UI - Research

**Researched:** 2026-02-08
**Domain:** Gateway CRUD page with factory filtering, password security, and factory name display
**Confidence:** HIGH

## Summary

Phase 16 implements the Gateway Management UI by directly replicating Phase 15's Factory Management patterns—same page structure, same dialog patterns, same toast notifications—with three gateway-specific extensions: (1) password security in edit mode (blank field with placeholder "Leave blank to keep current password", separate create/edit Zod schemas), (2) factory filtering via dropdown selector that filters the gateway table, and (3) displaying factory name in the gateway table by client-side lookup (backend returns only factory_id, frontend maps to factory names using useFactories data).

The research confirms that all foundational infrastructure is complete: GatewayForm component exists with mode='create'|'edit' prop and separate validation schemas (password required for create, optional for edit), useGateways hooks provide CRUD operations with factory_id filter support, and the backend API never exposes passwords in responses (GATEWAY-07 security requirement). The key insight is that Phase 16 is 95% replication of FactoriesPage with minor adaptations: password field uses mode prop to control validation, factory filter is a controlled select that updates useGateways query params, and gateway table shows factory names via client-side mapping of factory_id to factory.name.

Password security best practices from 2026 research confirm the existing GatewayForm implementation is correct: edit forms should display placeholder text like "Leave blank to keep current password," password fields should never pre-populate with existing values (security risk), and backend APIs should never return password values in GET responses. The standard pattern for optional password updates is separate Zod schemas (password required in create, optional in edit) with backend logic that only re-encrypts password if the field is provided in update requests.

**Primary recommendation:** Clone FactoriesPage structure to create GatewaysPage with three modifications: (1) pass mode='create'|'edit' prop to GatewayForm to toggle password validation, (2) add factory filter dropdown that controls useGateways factory_id param, (3) map gateway.factory_id to factory names by fetching factories list and creating id→name lookup. Split into two plans: Plan 01 implements core CRUD (table, dialogs, toasts, loading states), Plan 02 adds factory filtering (dropdown selector, filter state management, "All Factories" option).

## Standard Stack

The established libraries/tools for Gateway Management UI (identical to Phase 15):

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Query | 5.90.20+ | Already installed (Phase 12), data fetching for gateways and factories |
| shadcn/ui components | Latest | Already installed (Phase 15), Table, Dialog, AlertDialog, Button, Card, Select |
| Sonner | 2.x | Already installed (Phase 15), toast notifications for success/error |
| React Hook Form | 7.71.1 | Already installed (Phase 13), integrated with GatewayForm |
| Zod | 4.3.6 | Already installed (Phase 13), separate gatewayFormSchema and gatewayEditSchema |
| lucide-react | 0.563+ | Already installed (Phase 13), icons for actions (Edit, Trash, Plus, Filter) |

### Supporting (No Installation Required)

All dependencies already installed in Phase 15. Gateway-specific components (GatewayForm, useGateways hooks) already exist from Phases 13-14.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native select for factory filter | shadcn Select component | Native select sufficient for v1.1 (expect <20 factories), shadcn Select adds complexity |
| Client-side factory name lookup | Backend join query | Current API design separates concerns, client-side lookup is simpler than API changes |
| Single schema with conditional validation | Separate create/edit schemas | Separate schemas already implemented in GatewayForm, clearer intent |
| Password change confirmation | Trust single password input | Edit mode only updates if filled, confirmation would add friction |

**Installation:**

```bash
# No installation required - all dependencies exist
# GatewayForm: frontend/src/components/forms/GatewayForm.tsx (Phase 13-03)
# useGateways: frontend/src/hooks/useGateways.ts (Phase 14-02)
# Sonner, AlertDialog: frontend/src/components/ui/* (Phase 15-01)
```

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/
├── pages/
│   ├── FactoriesPage.tsx         # Already exists (Phase 15)
│   ├── GatewaysPage.tsx          # NEW: Gateway CRUD with factory filter
│   └── NotFoundPage.tsx
├── components/
│   ├── ui/
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── sonner.tsx
│   ├── forms/
│   │   ├── FactoryForm.tsx       # Already exists
│   │   └── GatewayForm.tsx       # Already exists (Phase 13-03)
│   └── layout/
├── hooks/
│   ├── useFactories.ts           # Already exists (Phase 14-01)
│   └── useGateways.ts            # Already exists (Phase 14-02)
└── types/
    └── api.ts                    # Already exists
```

**Key changes for Phase 16:**
1. Create GatewaysPage.tsx following FactoriesPage structure
2. No new components needed (GatewayForm exists, handles create/edit modes)
3. No new hooks needed (useGateways, useFactories exist)

### Pattern 1: GatewaysPage Structure (Clone of FactoriesPage)

**What:** Page component that orchestrates gateway CRUD operations with factory filtering.

**When to use:** Gateway management page (this phase only).

**Example:**

```typescript
// pages/GatewaysPage.tsx
import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2, Loader2 } from 'lucide-react'
import {
  useGateways,
  useCreateGateway,
  useUpdateGateway,
  useDeleteGateway,
} from '@/hooks/useGateways'
import { useFactories } from '@/hooks/useFactories'
import { GatewayForm, type GatewayFormData, type GatewayEditData } from '@/components/forms/GatewayForm'
import type { Gateway, CreateGatewayInput } from '@/types/api'
// ... import shadcn components (Table, Dialog, AlertDialog, Button, Card)

export function GatewaysPage() {
  // UI state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null)
  const [deletingGateway, setDeletingGateway] = useState<Gateway | null>(null)
  const [factoryFilter, setFactoryFilter] = useState<string>('') // '' = all factories

  // Data fetching (factory filter passed to useGateways)
  const gatewayParams = factoryFilter ? { factory_id: factoryFilter } : undefined
  const { data: gatewayData, isLoading, isError, error } = useGateways(gatewayParams)
  const { data: factoryData } = useFactories() // For factory dropdown and name lookup

  // Mutation hooks
  const createGateway = useCreateGateway()
  const updateGateway = useUpdateGateway()
  const deleteGateway = useDeleteGateway()

  // Factory name lookup (client-side mapping)
  const getFactoryName = (factory_id: string) => {
    if (!factoryData?.data) return factory_id
    const factory = factoryData.data.find(f => f.id === factory_id)
    return factory?.name || factory_id
  }

  // Handlers (similar to FactoriesPage)
  async function handleCreate(formData: GatewayFormData) {
    try {
      await createGateway.mutateAsync(formData as CreateGatewayInput)
      toast.success('Gateway created successfully')
      setIsCreateDialogOpen(false)
    } catch {
      toast.error('Failed to create gateway')
    }
  }

  async function handleUpdate(formData: GatewayEditData) {
    if (!editingGateway) return
    try {
      // Only include password if it was filled (not empty string)
      const updateData = formData.password
        ? formData
        : { ...formData, password: undefined }

      await updateGateway.mutateAsync({
        id: editingGateway.id,
        data: updateData,
      })
      toast.success('Gateway updated successfully')
      setEditingGateway(null)
    } catch {
      toast.error('Failed to update gateway')
    }
  }

  async function handleDelete() {
    if (!deletingGateway) return
    try {
      await deleteGateway.mutateAsync(deletingGateway.id)
      toast.success('Gateway deleted successfully')
      setDeletingGateway(null)
    } catch {
      toast.error('Failed to delete gateway')
      setDeletingGateway(null)
    }
  }

  // Loading/error states (same as FactoriesPage)
  if (isLoading) {
    return <Loader2 spinner with "Loading gateways..." />
  }

  if (isError) {
    return <Error card with retry button />
  }

  return (
    <div className="space-y-6">
      {/* Page header with Add Gateway button */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Gateways</h1>
          <p className="text-muted-foreground">Manage gateway connections</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus /> Add Gateway
        </Button>
      </div>

      {/* Factory filter dropdown */}
      <div className="flex items-center gap-4">
        <Label>Filter by factory:</Label>
        <select value={factoryFilter} onChange={(e) => setFactoryFilter(e.target.value)}>
          <option value="">All Factories</option>
          {factoryData?.data.map(factory => (
            <option key={factory.id} value={factory.id}>{factory.name}</option>
          ))}
        </select>
      </div>

      {/* Gateway table */}
      <Card>
        <CardHeader>
          <CardTitle>{gatewayData.pagination.total} gateways</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factory</TableHead>
                <TableHead>Gateway ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Firmware</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gatewayData.data.map(gateway => (
                <TableRow key={gateway.id}>
                  <TableCell>{getFactoryName(gateway.factory_id)}</TableCell>
                  <TableCell>{gateway.gateway_id}</TableCell>
                  <TableCell>{gateway.name}</TableCell>
                  <TableCell>{gateway.url}</TableCell>
                  <TableCell>{gateway.model || '—'}</TableCell>
                  <TableCell>{gateway.firmware_version || '—'}</TableCell>
                  <TableCell>
                    <Button onClick={() => setEditingGateway(gateway)}>
                      <Pencil />
                    </Button>
                    <Button onClick={() => setDeletingGateway(gateway)}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Gateway</DialogTitle>
          </DialogHeader>
          <GatewayForm
            factories={factoryData?.data || []}
            mode="create"  // Password required
            onSubmit={handleCreate}
            isSubmitting={createGateway.isPending}
            submitLabel="Create Gateway"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingGateway} onOpenChange={(open) => !open && setEditingGateway(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gateway</DialogTitle>
          </DialogHeader>
          <GatewayForm
            factories={factoryData?.data || []}
            mode="edit"  // Password optional
            defaultValues={editingGateway ? {
              factory_id: editingGateway.factory_id,
              gateway_id: editingGateway.gateway_id,
              name: editingGateway.name,
              url: editingGateway.url,
              email: editingGateway.email,
              password: '', // Always blank in edit mode (security)
              model: editingGateway.model || '',
              firmware_version: editingGateway.firmware_version || '',
            } : undefined}
            onSubmit={handleUpdate}
            isSubmitting={updateGateway.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog (identical to FactoriesPage) */}
      <AlertDialog open={!!deletingGateway} onOpenChange={(open) => !open && setDeletingGateway(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGateway?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteGateway.isPending}>
              {deleteGateway.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Key principles:**
- Page structure identical to FactoriesPage (useState for dialogs, mutation handlers with toasts)
- GatewayForm mode prop controls password validation (required vs optional)
- Factory filter state controls useGateways query params
- Client-side factory name lookup via getFactoryName helper
- Password field always defaulted to empty string in edit mode

### Pattern 2: Password Security in Edit Mode

**What:** Edit gateway form shows blank password field with placeholder, only updates password if user fills it.

**When to use:** Gateway edit dialog (not create dialog).

**Example:**

```typescript
// GatewayForm already implements this correctly (Phase 13-03)

// Separate schemas for create vs edit
export const gatewayFormSchema = z.object({
  password: z.string().min(1, 'Password is required'), // Required in create
  // ... other fields
})

export const gatewayEditSchema = gatewayFormSchema.extend({
  password: z.string().optional().or(z.literal('')), // Optional in edit
})

// Form component uses mode prop to select schema
function GatewayForm({ mode = 'create', defaultValues, ... }) {
  const schema = mode === 'edit' ? gatewayEditSchema : gatewayFormSchema

  return (
    <form>
      <Input
        type="password"
        placeholder={mode === 'edit' ? 'Leave blank to keep current password' : ''}
        {...register('password')}
      />
    </form>
  )
}

// Page component always defaults password to empty string in edit
<GatewayForm
  mode="edit"
  defaultValues={{
    ...editingGateway,
    password: '', // ALWAYS blank in edit mode
  }}
/>

// Update handler only includes password if filled
async function handleUpdate(formData: GatewayEditData) {
  const updateData = formData.password
    ? formData  // Include password if filled
    : { ...formData, password: undefined }  // Omit password if blank

  await updateGateway.mutateAsync({ id, data: updateData })
}
```

**Security principles:**
- Never fetch or display existing password (backend API never returns password per GATEWAY-07)
- Edit form defaults password field to empty string
- Placeholder text clearly indicates "leave blank to keep current"
- Backend only re-encrypts password if field is provided in update request
- Separate Zod schemas enforce password required in create, optional in edit

**Sources:**
- [React-admin PasswordInput Component](https://marmelab.com/react-admin/PasswordInput.html) - "Your API should never send the password in any of its responses"
- [React Hook Form Combined Add/Edit Form](https://jasonwatmore.com/post/2020/10/14/react-hook-form-combined-add-edit-create-update-form-example) - Pattern for mode-based form behavior

### Pattern 3: Factory Filtering with Dropdown Selector

**What:** Dropdown selector above table filters gateway list by factory, updates useGateways query params.

**When to use:** Gateway list page with multiple factories.

**Example:**

```typescript
export function GatewaysPage() {
  // Factory filter state
  const [factoryFilter, setFactoryFilter] = useState<string>('') // '' = all factories

  // Fetch gateways with optional factory filter
  const gatewayParams = factoryFilter ? { factory_id: factoryFilter } : undefined
  const { data: gatewayData } = useGateways(gatewayParams)

  // Fetch factories for dropdown and name lookup
  const { data: factoryData } = useFactories()

  return (
    <>
      {/* Factory filter dropdown */}
      <div className="flex items-center gap-4">
        <Label htmlFor="factory-filter">Filter by factory:</Label>
        <select
          id="factory-filter"
          value={factoryFilter}
          onChange={(e) => setFactoryFilter(e.target.value)}
          className="..."
        >
          <option value="">All Factories</option>
          {factoryData?.data.map(factory => (
            <option key={factory.id} value={factory.id}>
              {factory.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table shows filtered results */}
      <Table>
        {gatewayData.data.map(gateway => (
          <TableRow>...</TableRow>
        ))}
      </Table>
    </>
  )
}
```

**Key principles:**
- Factory filter state is simple string (factory_id or empty)
- Empty string means "all factories" (useGateways called without factory_id param)
- Changing filter triggers useGateways refetch with new params (React Query automatic)
- Dropdown uses factory.id as value, factory.name as display text
- Native select sufficient for v1.1 (expect <20 factories)

**Sources:**
- [Syncfusion React DropDownList Filtering](https://ej2.syncfusion.com/react/documentation/drop-down-list/filtering) - Dropdown filtering patterns
- [Material React Table Column Filtering](https://www.material-react-table.com/docs/guides/column-filtering) - Best practices for table filtering

### Pattern 4: Client-Side Factory Name Lookup

**What:** Gateway table displays factory name by mapping gateway.factory_id to factory.name using useFactories data.

**When to use:** Gateway table column that shows factory name (backend only returns factory_id).

**Example:**

```typescript
export function GatewaysPage() {
  // Fetch gateways (only includes factory_id, not factory name)
  const { data: gatewayData } = useGateways()

  // Fetch factories for name lookup
  const { data: factoryData } = useFactories()

  // Helper function for factory name lookup
  const getFactoryName = (factory_id: string): string => {
    if (!factoryData?.data) return factory_id // Fallback to ID if factories not loaded
    const factory = factoryData.data.find(f => f.id === factory_id)
    return factory?.name || factory_id // Fallback to ID if factory not found
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Factory</TableHead>
          <TableHead>Gateway ID</TableHead>
          {/* ... other columns */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {gatewayData?.data.map(gateway => (
          <TableRow key={gateway.id}>
            <TableCell>{getFactoryName(gateway.factory_id)}</TableCell>
            <TableCell>{gateway.gateway_id}</TableCell>
            {/* ... other cells */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

**Key principles:**
- Backend API returns gateway.factory_id only (not factory.name)
- Frontend fetches factories list separately with useFactories
- Client-side lookup function maps factory_id → factory.name
- Fallback to displaying factory_id if factories not loaded or factory not found
- Simple .find() lookup sufficient (expect <20 factories)

**Rationale:** Backend API design separates concerns (gateways route returns gateway data, factories route returns factory data). Client-side lookup is simpler than modifying backend to include JOIN queries. For v1.1 scale (<20 factories), client-side lookup has negligible performance impact.

### Anti-Patterns to Avoid

- **Showing existing password in edit form:** NEVER pre-populate password field with existing value. Always blank for security. Backend doesn't return password anyway (GATEWAY-07).
- **Requiring password in edit mode:** Password should be optional in edit (only update if filled). Don't force users to re-enter password when changing other fields.
- **Modifying backend API for factory name join:** Client-side lookup is simpler and maintains separation of concerns. Don't change backend GET /gateways to include factory.name.
- **Using shadcn Select for factory filter:** Native select is sufficient for <20 factories. Don't add complexity of shadcn Select component unless UX requires it.
- **Fetching factories on every render:** useFactories hook manages caching. React Query automatically caches factory data and only refetches when stale.
- **Duplicating GatewayForm component:** GatewayForm already handles create/edit modes with mode prop. Don't create separate CreateGatewayForm and EditGatewayForm components.
- **Hard-coding factory list in form:** Always pass factories prop from useFactories. Don't hard-code factory options in GatewayForm component.
- **Filtering gateways client-side:** Use useGateways factory_id param for server-side filtering. Don't fetch all gateways and filter in component (inefficient for large datasets).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password field validation | Custom password complexity rules | Existing Zod schema in GatewayForm | Password validation already implemented with min length, mode-based required/optional |
| Factory name lookup | Custom caching/memoization | React Query useFactories | React Query handles caching, stale-while-revalidate, automatic refetching |
| Factory filter state | Custom filter logic | React Query params with useState | useGateways accepts factory_id param, React Query automatically refetches on param change |
| Gateway table rendering | Custom table HTML | shadcn Table component (already used in FactoriesPage) | Handles accessibility, responsive design, consistent styling |
| Password update logic | Custom conditional mutation | Existing useUpdateGateway hook | Hook already handles password re-encryption if provided, skip if undefined |
| Empty state UI | Custom empty message | FactoriesPage empty state pattern | Proven pattern with call-to-action, already implemented |
| Loading states | Custom spinner logic | React Query isLoading/isPending | Built-in state management, same pattern as FactoriesPage |
| Toast notifications | Custom notification component | Sonner (already installed) | Handles stacking, auto-dismiss, animations, already configured in Phase 15 |

**Key insight:** Phase 16 requires ZERO new infrastructure. Every component, hook, and pattern already exists. GatewaysPage is 95% copy-paste from FactoriesPage with minor adaptations for password mode, factory filter, and factory name lookup.

## Common Pitfalls

### Pitfall 1: Password Field Pre-Population in Edit Mode

**What goes wrong:** Edit form shows existing password value, or developer attempts to fetch password from backend to pre-populate field.

**Why it happens:** Mistaken belief that edit forms should show all existing values, forgetting that passwords are sensitive credentials.

**How to avoid:**
- Backend API never returns password in GET responses (GATEWAY-07 security requirement)
- Always default password field to empty string in edit mode: `defaultValues={{ ...gateway, password: '' }}`
- GatewayForm mode="edit" shows placeholder "Leave blank to keep current password"
- Backend only re-encrypts password if password field provided in PUT request

**Warning signs:** TypeScript error "Property 'password' does not exist on type 'Gateway'", developer attempts to add password field to Gateway type, edit form shows "undefined" or null in password field.

**Example:**

```typescript
// ❌ BAD: Trying to show existing password (impossible, insecure)
<GatewayForm
  mode="edit"
  defaultValues={editingGateway} // password field doesn't exist on Gateway type
/>

// ❌ BAD: Trying to fetch password from backend
const { data: gateway } = useGateway(id)
const password = gateway.password // TypeScript error - password doesn't exist

// ✅ GOOD: Always blank password in edit mode
<GatewayForm
  mode="edit"
  defaultValues={{
    ...editingGateway,
    password: '', // Explicitly blank for security
  }}
/>
```

**Sources:**
- [React-admin PasswordInput](https://marmelab.com/react-admin/PasswordInput.html) - "Your API should never send the password in any of its responses"
- [MDN Input Password Security](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/password) - Best practices for password inputs

### Pitfall 2: Factory Name Not Showing (Missing Factory Data)

**What goes wrong:** Gateway table shows factory_id (UUID) instead of factory name, or shows blank factory column.

**Why it happens:** Forgetting to fetch factories list with useFactories, or getFactoryName helper called before factories loaded.

**How to avoid:**
- Always fetch factories with `const { data: factoryData } = useFactories()` at top of component
- getFactoryName helper includes fallback: `if (!factoryData?.data) return factory_id`
- Optional: Show loading skeleton for factory column until factories loaded
- React Query caches factory data, so useFactories doesn't cause extra requests

**Warning signs:** Gateway table shows UUIDs in factory column, table renders before factories loaded, console errors about undefined data.

**Example:**

```typescript
// ❌ BAD: Forgetting to fetch factories
export function GatewaysPage() {
  const { data: gatewayData } = useGateways()

  // No useFactories call!

  const getFactoryName = (factory_id) => {
    const factory = factoryData.data.find(...) // factoryData is undefined
    return factory?.name
  }
}

// ✅ GOOD: Fetch factories for name lookup
export function GatewaysPage() {
  const { data: gatewayData } = useGateways()
  const { data: factoryData } = useFactories() // Fetch factories

  const getFactoryName = (factory_id) => {
    if (!factoryData?.data) return factory_id // Fallback to ID
    const factory = factoryData.data.find(f => f.id === factory_id)
    return factory?.name || factory_id
  }
}
```

### Pitfall 3: Factory Filter Not Triggering Refetch

**What goes wrong:** User selects factory in dropdown, but table doesn't update to show filtered gateways.

**Why it happens:** Factory filter state not connected to useGateways params, or params object not memoized causing infinite refetch.

**How to avoid:**
- Compute params object conditionally: `const params = factoryFilter ? { factory_id: factoryFilter } : undefined`
- Pass params to useGateways: `useGateways(params)`
- Don't memoize params object (React Query handles query key changes automatically)
- React Query will automatically refetch when query key changes (factory_id param)

**Warning signs:** Dropdown changes but table doesn't update, infinite refetch loop, React Query DevTools shows multiple identical queries.

**Example:**

```typescript
// ❌ BAD: Filter state not connected to query
const [factoryFilter, setFactoryFilter] = useState('')
const { data } = useGateways() // Always fetches all gateways

<select onChange={(e) => setFactoryFilter(e.target.value)}>
  {/* Filter state changes but query doesn't */}
</select>

// ❌ BAD: Memoizing params object (usually unnecessary)
const params = useMemo(
  () => factoryFilter ? { factory_id: factoryFilter } : undefined,
  [factoryFilter]
)
const { data } = useGateways(params)

// ✅ GOOD: Params derived from filter state, passed to query
const [factoryFilter, setFactoryFilter] = useState('')
const params = factoryFilter ? { factory_id: factoryFilter } : undefined
const { data } = useGateways(params) // Refetches when params change

<select onChange={(e) => setFactoryFilter(e.target.value)}>
```

### Pitfall 4: Password Update Sending Empty String

**What goes wrong:** Edit gateway with blank password field sends password: '' to backend, backend rejects empty password or encrypts empty string.

**Why it happens:** Form submission includes all fields, even empty password field, backend updateGatewaySchema allows empty string.

**How to avoid:**
- Update handler filters out empty password: `const updateData = formData.password ? formData : { ...formData, password: undefined }`
- Backend updateGatewaySchema uses `.min(1).optional()` not `.optional()` (empty string fails validation)
- GatewayForm gatewayEditSchema uses `.optional().or(z.literal(''))` allowing empty string in form, handler filters it out
- Backend PUT /gateways/:id route only calls updatePassword if password field present

**Warning signs:** Backend validation error "password must be at least 1 character", encrypted empty string stored in database, password field required error on edit.

**Example:**

```typescript
// ❌ BAD: Sending empty password string to backend
async function handleUpdate(formData: GatewayEditData) {
  await updateGateway.mutateAsync({
    id: editingGateway.id,
    data: formData, // Includes password: '' if field was blank
  })
}

// ✅ GOOD: Filter out empty password before sending
async function handleUpdate(formData: GatewayEditData) {
  const updateData = formData.password
    ? formData  // Include password if filled
    : { ...formData, password: undefined }  // Omit password if blank

  await updateGateway.mutateAsync({
    id: editingGateway.id,
    data: updateData,
  })
}
```

### Pitfall 5: Missing Factories Prop in GatewayForm

**What goes wrong:** GatewayForm factory dropdown is empty or shows error, form cannot be submitted without factory selection.

**Why it happens:** Forgetting to pass factories prop to GatewayForm, or passing undefined before factories loaded.

**How to avoid:**
- Always pass factories from useFactories: `factories={factoryData?.data || []}`
- Empty array fallback prevents undefined error before factories load
- GatewayForm shows "Select a factory..." placeholder when factories array empty
- Optional: Disable GatewayForm submit button until factories loaded

**Warning signs:** Empty factory dropdown in create/edit dialogs, "Select a factory..." is only option, TypeScript error about missing factories prop.

**Example:**

```typescript
// ❌ BAD: Missing factories prop
<GatewayForm
  mode="create"
  onSubmit={handleCreate}
  // No factories prop!
/>

// ❌ BAD: Passing undefined factories
<GatewayForm
  factories={factoryData?.data} // Could be undefined before load
  mode="create"
/>

// ✅ GOOD: Always pass factories with empty array fallback
<GatewayForm
  factories={factoryData?.data || []} // Empty array if not loaded
  mode="create"
  onSubmit={handleCreate}
/>
```

### Pitfall 6: Forgetting to Use mode Prop

**What goes wrong:** Edit dialog shows password as required field, user cannot save changes without entering password.

**Why it happens:** Forgetting to pass mode="edit" to GatewayForm, defaults to mode="create" which requires password.

**How to avoid:**
- Create dialog: `<GatewayForm mode="create" />` (password required)
- Edit dialog: `<GatewayForm mode="edit" />` (password optional)
- GatewayForm uses mode to select schema: `const schema = mode === 'edit' ? gatewayEditSchema : gatewayFormSchema`
- Edit mode shows placeholder "Leave blank to keep current password"

**Warning signs:** Password field shows required error in edit dialog, user forced to re-enter password to save other changes, edit form behaves like create form.

**Example:**

```typescript
// ❌ BAD: Forgetting mode prop in edit dialog
<Dialog open={!!editingGateway}>
  <GatewayForm
    // No mode prop! Defaults to 'create'
    defaultValues={editingGateway}
    onSubmit={handleUpdate}
  />
</Dialog>

// ✅ GOOD: Explicit mode prop for edit dialog
<Dialog open={!!editingGateway}>
  <GatewayForm
    mode="edit"  // Password optional
    defaultValues={{ ...editingGateway, password: '' }}
    onSubmit={handleUpdate}
  />
</Dialog>
```

## Code Examples

Verified patterns from existing codebase and official sources:

### Complete GatewaysPage Implementation Structure

See Pattern 1 above for full example. Key sections:

```typescript
// State management (identical to FactoriesPage)
const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
const [editingGateway, setEditingGateway] = useState<Gateway | null>(null)
const [deletingGateway, setDeletingGateway] = useState<Gateway | null>(null)
const [factoryFilter, setFactoryFilter] = useState<string>('') // NEW: factory filter

// Data fetching with filter
const params = factoryFilter ? { factory_id: factoryFilter } : undefined
const { data: gatewayData } = useGateways(params)
const { data: factoryData } = useFactories() // For dropdown and name lookup

// Factory name lookup helper
const getFactoryName = (factory_id: string) => {
  if (!factoryData?.data) return factory_id
  return factoryData.data.find(f => f.id === factory_id)?.name || factory_id
}

// Password handling in update
async function handleUpdate(formData: GatewayEditData) {
  const updateData = formData.password
    ? formData
    : { ...formData, password: undefined }

  await updateGateway.mutateAsync({ id: editingGateway.id, data: updateData })
}
```

### GatewayForm Usage Patterns

```typescript
// Source: frontend/src/components/forms/GatewayForm.tsx (Phase 13-03)

// Create dialog - password required
<GatewayForm
  factories={factoryData?.data || []}
  mode="create"
  onSubmit={handleCreate}
  isSubmitting={createGateway.isPending}
  submitLabel="Create Gateway"
/>

// Edit dialog - password optional, defaulted to blank
<GatewayForm
  factories={factoryData?.data || []}
  mode="edit"
  defaultValues={{
    factory_id: gateway.factory_id,
    gateway_id: gateway.gateway_id,
    name: gateway.name,
    url: gateway.url,
    email: gateway.email,
    password: '', // ALWAYS blank in edit mode
    model: gateway.model || '',
    firmware_version: gateway.firmware_version || '',
  }}
  onSubmit={handleUpdate}
  isSubmitting={updateGateway.isPending}
  submitLabel="Save Changes"
/>
```

### Factory Filter Dropdown

```typescript
// Native select for factory filter (sufficient for v1.1)
<div className="flex items-center gap-4 mb-4">
  <Label htmlFor="factory-filter" className="font-medium">
    Filter by factory:
  </Label>
  <select
    id="factory-filter"
    value={factoryFilter}
    onChange={(e) => setFactoryFilter(e.target.value)}
    className={cn(
      'flex h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
    )}
  >
    <option value="">All Factories</option>
    {factoryData?.data.map(factory => (
      <option key={factory.id} value={factory.id}>
        {factory.name}
      </option>
    ))}
  </select>
  {factoryFilter && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setFactoryFilter('')}
    >
      Clear filter
    </Button>
  )}
</div>
```

### Gateway Table with Factory Name Column

```typescript
// Source: Pattern adapted from FactoriesPage table
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Factory</TableHead>
      <TableHead>Gateway ID</TableHead>
      <TableHead>Name</TableHead>
      <TableHead>URL</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Model</TableHead>
      <TableHead>Firmware</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {gatewayData.data.length === 0 ? (
      <TableRow>
        <TableCell colSpan={8} className="text-center py-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-muted-foreground">No gateways yet</p>
            <p className="text-sm text-muted-foreground">
              {factoryFilter
                ? 'No gateways found for this factory. Try selecting a different factory or clearing the filter.'
                : 'Create your first gateway to get started.'
              }
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline" className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Gateway
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ) : (
      gatewayData.data.map(gateway => (
        <TableRow key={gateway.id}>
          <TableCell className="font-medium">
            {getFactoryName(gateway.factory_id)}
          </TableCell>
          <TableCell>{gateway.gateway_id}</TableCell>
          <TableCell>{gateway.name}</TableCell>
          <TableCell className="font-mono text-xs">{gateway.url}</TableCell>
          <TableCell>{gateway.email}</TableCell>
          <TableCell>{gateway.model || '—'}</TableCell>
          <TableCell>{gateway.firmware_version || '—'}</TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingGateway(gateway)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeletingGateway(gateway)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))
    )}
  </TableBody>
</Table>
```

### Empty State with Filter-Aware Message

```typescript
// Adapted from FactoriesPage empty state (Phase 15)
{gatewayData.data.length === 0 ? (
  <TableRow>
    <TableCell colSpan={8} className="text-center py-8">
      <div className="flex flex-col items-center gap-2">
        <p className="text-muted-foreground">
          {factoryFilter ? 'No gateways for this factory' : 'No gateways yet'}
        </p>
        <p className="text-sm text-muted-foreground">
          {factoryFilter
            ? 'Try selecting a different factory or clearing the filter.'
            : 'Create your first gateway to get started.'
          }
        </p>
        <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline" className="mt-2">
          <Plus className="h-4 w-4 mr-2" />
          Add Gateway
        </Button>
      </div>
    </TableCell>
  </TableRow>
) : (
  // Table rows
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single form schema | Separate create/edit schemas (password required vs optional) | 2023-2024 | Clearer validation rules, type-safe mode handling |
| Backend JOIN queries for related data | Client-side lookup with React Query cache | 2020+ | Simpler API design, React Query handles caching efficiently |
| Custom dropdown components | Native select for simple filters | 2024+ | Reduced complexity, sufficient for v1.1 scale (<20 items) |
| Storing passwords in plaintext | Encrypted at rest with backend encryption | Always required | GATEWAY-07 security requirement, industry standard |
| Returning passwords in GET responses | Never expose passwords in API responses | Security best practice | Prevents credential leakage, enforces write-only passwords |
| Confirming password changes | Trust single password input in edit mode | 2024+ | Reduced friction, password optional in edit mode |
| Server-side rendering for filters | Client-side filter state with React Query params | 2020+ | Simpler state management, React Query handles refetch automatically |
| Custom factory name joins | Lookup tables with client-side mapping | 2023+ | Separation of concerns, reusable factory data |

**Deprecated/outdated:**
- Single Zod schema for create and edit: Separate schemas (required vs optional password) are now standard
- Pre-populating password in edit forms: Security risk, never show existing passwords
- Custom select components for simple dropdowns: Native select sufficient for <20 items
- Backend API returning factory.name in gateway responses: Client-side lookup is cleaner separation

## Open Questions

Things that couldn't be fully resolved:

1. **Factory Name Column Loading State**
   - What we know: useFactories fetches factory data separately, gatewayData may load before factoryData
   - What's unclear: Should factory column show loading skeleton, or fallback to factory_id until factories loaded?
   - Recommendation: Use factory_id as fallback (`getFactoryName` already does this). React Query typically loads both queries quickly (cached from previous page loads). Skeleton would add complexity without clear UX benefit.

2. **Factory Filter Persistence**
   - What we know: Filter state is local useState, resets on page navigation/refresh
   - What's unclear: Should filter persist across page navigations (URL query param) or always reset?
   - Recommendation: Don't persist for v1.1. Simple useState is sufficient. If users request it (e.g., "I keep having to re-select the same factory"), add URL query param in Phase 17 enhancements.

3. **Factory Dropdown Order**
   - What we know: useFactories returns factories in created_at order (backend default)
   - What's unclear: Should factory dropdown be alphabetically sorted by name for easier selection?
   - Recommendation: Client-side sort by name: `[...factoryData.data].sort((a, b) => a.name.localeCompare(b.name))`. Expect <20 factories, sorting is instant. Improves UX for finding factories in dropdown.

4. **Clear Filter Button**
   - What we know: Pattern above includes "Clear filter" button that appears when filter is active
   - What's unclear: Is clear button necessary, or is "All Factories" option sufficient?
   - Recommendation: Include clear button (shown in code example). Minor UX improvement, single line of code, doesn't add complexity.

5. **Gateway Table Column Priority (Mobile Responsive)**
   - What we know: Gateway table has 8 columns (Factory, Gateway ID, Name, URL, Email, Model, Firmware, Actions)
   - What's unclear: Which columns should be hidden on smaller screens for responsive design?
   - Recommendation: Defer to Phase 17 (Quality & Polish). For v1.1 desktop-first milestone, show all columns. If mobile support needed, hide Model and Firmware columns first (least critical info).

## Plan Structure Recommendation

Phase 16 should split into TWO plans for clear separation of concerns:

### Plan 01: Gateway CRUD Page (Core Functionality)
**Goal:** Implement GatewaysPage with table, create/edit dialogs, delete confirmation, toasts, loading states
**Tasks:**
1. Create GatewaysPage.tsx cloning FactoriesPage structure
2. Implement useState for dialog visibility (create, edit, delete)
3. Integrate useGateways and useFactories hooks
4. Add gateway table with Factory, Gateway ID, Name, URL, Email, Model, Firmware columns
5. Implement create dialog with GatewayForm mode="create"
6. Implement edit dialog with GatewayForm mode="edit" and password blank defaultValue
7. Implement delete AlertDialog with gateway name interpolation
8. Add toast notifications for success/error (create, update, delete)
9. Add loading states (initial spinner, disabled buttons during mutations)
10. Add empty state with filter-aware message
11. Implement getFactoryName helper for client-side factory name lookup
**Verification:**
- All CRUD operations work (create, read, update, delete)
- Password field blank in edit mode with placeholder text
- Factory names display in table (not UUIDs)
- Toast notifications show on all operations
- Loading states prevent double-submission
- Empty state shows appropriate message

### Plan 02: Factory Filtering
**Goal:** Add factory filter dropdown that filters gateway table by selected factory
**Tasks:**
1. Add factoryFilter useState (string, defaults to '')
2. Add factory filter dropdown above table (native select)
3. Compute useGateways params from filter state (factory_id if filter set, undefined otherwise)
4. Populate dropdown with factories from useFactories (sorted by name)
5. Add "All Factories" option (value='')
6. Add clear filter button (appears when filter active)
7. Update empty state message to be filter-aware ("No gateways for this factory" vs "No gateways yet")
**Verification:**
- Dropdown shows all factories sorted by name
- Selecting factory filters table to show only that factory's gateways
- "All Factories" option shows all gateways
- Clear button resets filter to all factories
- Empty state message adapts to filter state
- URL network requests show factory_id query param when filter active

**Rationale for split:**
- Plan 01 delivers complete CRUD functionality (parallel to Phase 15 FactoriesPage)
- Plan 02 is gateway-specific enhancement (factories don't need filtering)
- Clear verification criteria for each plan
- If Plan 02 blocked or deferred, Plan 01 still delivers working gateway management

## Sources

### Primary (HIGH confidence)

- [Frontend codebase - GatewayForm.tsx](file:///Users/craigcronin/Development/mti-wifi-gsd/frontend/src/components/forms/GatewayForm.tsx) - Existing form with mode prop, separate create/edit schemas, password placeholder
- [Frontend codebase - useGateways.ts](file:///Users/craigcronin/Development/mti-wifi-gsd/frontend/src/hooks/useGateways.ts) - Hooks with factory_id filter support, query key factory
- [Frontend codebase - FactoriesPage.tsx](file:///Users/craigcronin/Development/mti-wifi-gsd/frontend/src/pages/FactoriesPage.tsx) - Complete CRUD pattern to replicate
- [Backend codebase - gateways.ts routes](file:///Users/craigcronin/Development/mti-wifi-gsd/src/api/routes/gateways.ts) - API behavior, password never returned (GATEWAY-07)
- [Backend codebase - gateways.ts schemas](file:///Users/craigcronin/Development/mti-wifi-gsd/src/api/schemas/gateways.ts) - Validation rules, password optional in update
- Phase 15 Research (.planning/phases/15-factory-management-ui/15-RESEARCH.md) - CRUD page patterns to replicate
- Phase 15 Summary (.planning/phases/15-factory-management-ui/15-02-SUMMARY.md) - Implementation decisions and patterns

### Secondary (MEDIUM confidence)

- [React-admin PasswordInput Component](https://marmelab.com/react-admin/PasswordInput.html) - "Your API should never send the password in any of its responses"
- [React Hook Form Combined Add/Edit Form](https://jasonwatmore.com/post/2020/10/14/react-hook-form-combined-add-edit-create-update-form-example) - Mode-based form pattern
- [Material React Table Column Filtering](https://www.material-react-table.com/docs/guides/column-filtering) - Best practices for table filtering with dropdowns
- [Syncfusion React DropDownList Filtering](https://ej2.syncfusion.com/react/documentation/drop-down-list/filtering) - Dropdown filtering patterns
- [MDN Input Password Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/password) - Password input security best practices

### Tertiary (LOW confidence)

- WebSearch results: "React edit form password field security blank optional update 2026" - General password field patterns
- WebSearch results: "React table filtering dropdown selector best practices 2026" - Table filtering UX patterns
- WebSearch results: "password input security edit mode placeholder leave blank 2026" - Edit mode password patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed (Phase 15), GatewayForm and useGateways hooks exist (Phases 13-14)
- Architecture: HIGH - Direct replication of FactoriesPage (Phase 15) with verified extensions (password mode, factory filter, client-side lookup)
- Pitfalls: HIGH - Based on existing codebase behavior (GatewayForm mode prop, backend API password handling), React Hook Form patterns, security best practices
- Code examples: HIGH - All examples from existing codebase (FactoriesPage, GatewayForm, useGateways) with minor adaptations
- Password security: HIGH - Backend implementation verified (GATEWAY-07 requirement), Zod schemas verified, industry best practices
- Factory filtering: MEDIUM - Pattern is standard (useState + query params), but implementation not yet tested in this codebase
- Client-side lookup: MEDIUM - Pattern is simple (.find() on array), but performance not tested with actual data

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - React Query stable, shadcn/ui stable, GatewayForm component finalized, backend API stable)
