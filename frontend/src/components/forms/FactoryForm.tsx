import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const factoryFormSchema = z.object({
  name: z.string().min(1, 'Factory name is required').max(100, 'Name must be 100 characters or less'),
  location: z.string().max(200, 'Location must be 200 characters or less').optional().or(z.literal('')),
  timezone: z.string().min(1, 'Timezone is required'),
})

export type FactoryFormData = z.infer<typeof factoryFormSchema>

interface FactoryFormProps {
  defaultValues?: Partial<FactoryFormData>
  onSubmit: (data: FactoryFormData) => Promise<void>
  isSubmitting?: boolean
  submitLabel?: string // "Create Factory" or "Save Changes"
}

export function FactoryForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save',
}: FactoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FactoryFormData>({
    resolver: zodResolver(factoryFormSchema),
    defaultValues: {
      timezone: 'UTC',
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Factory Name</Label>
        <Input
          id="name"
          placeholder="Enter factory name"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="Enter location"
          {...register('location')}
        />
        {errors.location && (
          <p className="text-sm text-destructive mt-1">{errors.location.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Input
          id="timezone"
          placeholder="UTC"
          {...register('timezone')}
        />
        {errors.timezone && (
          <p className="text-sm text-destructive mt-1">{errors.timezone.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  )
}
