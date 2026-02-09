import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2, Loader2 } from 'lucide-react'
import {
  useFactories,
  useCreateFactory,
  useUpdateFactory,
  useDeleteFactory,
} from '@/hooks/useFactories'
import { FactoryForm, type FactoryFormData } from '@/components/forms/FactoryForm'
import type { Factory, CreateFactoryInput } from '@/types/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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

// v1.1: single organization -- replace with org selector when multi-tenancy is added
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'

export function FactoriesPage() {
  // UI state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null)
  const [deletingFactory, setDeletingFactory] = useState<Factory | null>(null)

  // Data fetching
  const { data, isLoading, isError, error } = useFactories()

  // Mutation hooks
  const createFactory = useCreateFactory()
  const updateFactory = useUpdateFactory()
  const deleteFactory = useDeleteFactory()

  // Handler functions
  async function handleCreate(formData: FactoryFormData) {
    try {
      await createFactory.mutateAsync({
        organization_id: DEFAULT_ORG_ID,
        ...formData,
      } as CreateFactoryInput)
      toast.success('Factory created successfully')
      setIsCreateDialogOpen(false)
    } catch {
      toast.error('Failed to create factory')
    }
  }

  async function handleUpdate(formData: FactoryFormData) {
    if (!editingFactory) return
    try {
      await updateFactory.mutateAsync({
        id: editingFactory.id,
        data: formData,
      })
      toast.success('Factory updated successfully')
      setEditingFactory(null)
    } catch {
      toast.error('Failed to update factory')
    }
  }

  async function handleDelete() {
    if (!deletingFactory) return
    try {
      await deleteFactory.mutateAsync(deletingFactory.id)
      toast.success('Factory deleted successfully')
      setDeletingFactory(null)
    } catch {
      toast.error('Failed to delete factory')
      setDeletingFactory(null)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading factories...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Factories</CardTitle>
          <CardDescription>{error?.message || 'An unknown error occurred'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  // Safety check (should not happen after loading/error checks, but TypeScript needs it)
  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Factories</h1>
          <p className="text-muted-foreground mt-1">
            Manage your factory locations
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Factory
        </Button>
      </div>

      {/* Factory table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data.pagination.total} {data.pagination.total === 1 ? 'factory' : 'factories'}
          </CardTitle>
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
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No factories yet</p>
                      <p className="text-sm text-muted-foreground">
                        Create your first factory to get started.
                      </p>
                      <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        variant="outline"
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Factory
                      </Button>
                    </div>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                          onClick={() => setDeletingFactory(factory)}
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
      <Dialog
        open={!!editingFactory}
        onOpenChange={(open) => !open && setEditingFactory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Factory</DialogTitle>
            <DialogDescription>Update factory details.</DialogDescription>
          </DialogHeader>
          <FactoryForm
            defaultValues={
              editingFactory
                ? {
                    name: editingFactory.name,
                    location: editingFactory.location ?? '',
                    timezone: editingFactory.timezone,
                  }
                : undefined
            }
            onSubmit={handleUpdate}
            isSubmitting={updateFactory.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={!!deletingFactory}
        onOpenChange={(open) => !open && setDeletingFactory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Factory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFactory?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteFactory.isPending}
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
