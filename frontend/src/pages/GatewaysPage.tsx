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
import {
  GatewayForm,
  type GatewayFormData,
  type GatewayEditData,
} from '@/components/forms/GatewayForm'
import type { Gateway, CreateGatewayInput, UpdateGatewayInput } from '@/types/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function GatewaysPage() {
  // UI state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null)
  const [deletingGateway, setDeletingGateway] = useState<Gateway | null>(null)
  const [factoryFilter, setFactoryFilter] = useState('')

  // Data fetching
  const gatewayParams = factoryFilter ? { factory_id: factoryFilter } : undefined
  const { data: gatewayData, isLoading, isError, error } = useGateways(gatewayParams)
  const { data: factoryData } = useFactories()

  // Mutation hooks
  const createGateway = useCreateGateway()
  const updateGateway = useUpdateGateway()
  const deleteGateway = useDeleteGateway()

  // Factory name lookup helper
  const getFactoryName = (factory_id: string): string => {
    if (!factoryData?.data) return factory_id
    const factory = factoryData.data.find(f => f.id === factory_id)
    return factory?.name || factory_id
  }

  // Handler functions
  async function handleCreate(formData: GatewayFormData | GatewayEditData) {
    try {
      await createGateway.mutateAsync(formData as CreateGatewayInput)
      toast.success('Gateway created successfully')
      setIsCreateDialogOpen(false)
    } catch {
      toast.error('Failed to create gateway')
    }
  }

  async function handleUpdate(formData: GatewayFormData | GatewayEditData) {
    if (!editingGateway) return
    try {
      // Strip empty password before sending to API
      const updateData = formData.password
        ? formData
        : { ...formData, password: undefined }
      await updateGateway.mutateAsync({
        id: editingGateway.id,
        data: updateData as UpdateGatewayInput,
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading gateways...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Gateways</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {error?.message || 'An unknown error occurred'}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  // Safety check
  if (!gatewayData) {
    return null
  }

  // Sort factories alphabetically by name for filter dropdown
  const sortedFactories = factoryData?.data
    ? [...factoryData.data].sort((a, b) => a.name.localeCompare(b.name))
    : []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gateways</h1>
          <p className="text-muted-foreground mt-1">
            Manage gateway connections
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Gateway
        </Button>
      </div>

      {/* Factory filter dropdown */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Label htmlFor="factory-filter">Filter by factory:</Label>
        <select
          id="factory-filter"
          className={cn(
            'flex h-9 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          value={factoryFilter}
          onChange={(e) => setFactoryFilter(e.target.value)}
        >
          <option value="">All Factories</option>
          {sortedFactories.map((factory) => (
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

      {/* Gateway table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {gatewayData.pagination.total}{' '}
            {gatewayData.pagination.total === 1 ? 'gateway' : 'gateways'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factory</TableHead>
                  <TableHead>Gateway ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Model</TableHead>
                  <TableHead className="hidden lg:table-cell">Firmware</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gatewayData.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground">
                          {factoryFilter
                            ? 'No gateways for this factory'
                            : 'No gateways yet'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {factoryFilter
                            ? 'Try selecting a different factory or clearing the filter.'
                            : 'Create your first gateway to get started.'}
                        </p>
                        <Button
                          onClick={() => setIsCreateDialogOpen(true)}
                          variant="outline"
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Gateway
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  gatewayData.data.map((gateway) => (
                    <TableRow key={gateway.id}>
                      <TableCell className="font-medium">
                        {getFactoryName(gateway.factory_id)}
                      </TableCell>
                      <TableCell>{gateway.gateway_id}</TableCell>
                      <TableCell>{gateway.name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {gateway.url}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{gateway.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">{gateway.model || '\u2014'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{gateway.firmware_version || '\u2014'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingGateway(gateway)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingGateway(gateway)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Gateway</DialogTitle>
            <DialogDescription>
              Add a new gateway connection.
            </DialogDescription>
          </DialogHeader>
          <GatewayForm
            factories={factoryData?.data || []}
            mode="create"
            onSubmit={handleCreate}
            isSubmitting={createGateway.isPending}
            submitLabel="Create Gateway"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingGateway}
        onOpenChange={(open) => !open && setEditingGateway(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gateway</DialogTitle>
            <DialogDescription>
              Update gateway connection details.
            </DialogDescription>
          </DialogHeader>
          <GatewayForm
            factories={factoryData?.data || []}
            mode="edit"
            defaultValues={
              editingGateway
                ? {
                    factory_id: editingGateway.factory_id,
                    gateway_id: editingGateway.gateway_id,
                    name: editingGateway.name,
                    url: editingGateway.url,
                    email: editingGateway.email,
                    password: '',
                    model: editingGateway.model || '',
                    firmware_version: editingGateway.firmware_version || '',
                  }
                : undefined
            }
            onSubmit={handleUpdate}
            isSubmitting={updateGateway.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={!!deletingGateway}
        onOpenChange={(open) => !open && setDeletingGateway(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGateway?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteGateway.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGateway.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
