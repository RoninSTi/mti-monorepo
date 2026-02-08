import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { Factory } from '@/types/api'

export const gatewayFormSchema = z.object({
  factory_id: z.string().min(1, 'Factory is required'),
  gateway_id: z.string().min(1, 'Gateway ID is required'),
  name: z.string().min(1, 'Gateway name is required').max(100, 'Name must be 100 characters or less'),
  url: z.string().url('Must be a valid URL'),
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
  model: z.string().max(100).optional().or(z.literal('')),
  firmware_version: z.string().max(50).optional().or(z.literal('')),
})

export const gatewayEditSchema = gatewayFormSchema.extend({
  password: z.string().optional().or(z.literal('')),
})

export type GatewayFormData = z.infer<typeof gatewayFormSchema>
export type GatewayEditData = z.infer<typeof gatewayEditSchema>

interface GatewayFormProps {
  factories: Pick<Factory, 'id' | 'name'>[] // For factory select dropdown
  defaultValues?: Partial<GatewayFormData>
  onSubmit: (data: GatewayFormData | GatewayEditData) => Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
  mode?: 'create' | 'edit' // Determines which schema to use
}

export function GatewayForm({
  factories,
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save',
  mode = 'create',
}: GatewayFormProps) {
  const schema = mode === 'edit' ? gatewayEditSchema : gatewayFormSchema

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GatewayFormData | GatewayEditData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="factory_id">Factory</Label>
        <select
          id="factory_id"
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          {...register('factory_id')}
        >
          <option value="">Select a factory...</option>
          {factories.map((factory) => (
            <option key={factory.id} value={factory.id}>
              {factory.name}
            </option>
          ))}
        </select>
        {errors.factory_id && (
          <p className="text-sm text-destructive mt-1">{errors.factory_id.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="gateway_id">Gateway ID</Label>
        <Input
          id="gateway_id"
          placeholder="e.g., GW-001"
          {...register('gateway_id')}
        />
        {errors.gateway_id && (
          <p className="text-sm text-destructive mt-1">{errors.gateway_id.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="name">Gateway Name</Label>
        <Input
          id="name"
          placeholder="Enter gateway name"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="url">Gateway URL</Label>
        <Input
          id="url"
          placeholder="ws://192.168.1.100:5000"
          {...register('url')}
        />
        {errors.url && (
          <p className="text-sm text-destructive mt-1">{errors.url.message}</p>
        )}
      </div>

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

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder={mode === 'edit' ? 'Leave blank to keep current password' : ''}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          placeholder="e.g., CTC-W100"
          {...register('model')}
        />
        {errors.model && (
          <p className="text-sm text-destructive mt-1">{errors.model.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="firmware_version">Firmware Version</Label>
        <Input
          id="firmware_version"
          placeholder="e.g., 2.1.0"
          {...register('firmware_version')}
        />
        {errors.firmware_version && (
          <p className="text-sm text-destructive mt-1">{errors.firmware_version.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  )
}
