'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { type Project } from '@/lib/api'
import { useCreateProject } from '@/lib/hooks/use-projects'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { captureClientException, captureEvent } from '@/lib/posthog'

const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  authMode: z.enum(['MANAGED', 'DELEGATED']),
})

type CreateProjectFormData = z.infer<typeof createProjectSchema>

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated?: (project: Project) => void
}

export function CreateProjectModal({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { mutateAsync: createProjectMutation, isPending } = useCreateProject()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      authMode: 'MANAGED',
    },
  })

  const onSubmit = async (data: CreateProjectFormData) => {
    try {
      const project = await createProjectMutation({
        name: data.name,
        description: data.description,
        authMode: data.authMode,
      })

      captureEvent('project_created', {
        auth_mode: data.authMode,
        has_description: Boolean(data.description?.trim()),
        project_id: project.id,
      })

      toast({
        title: 'Project created',
        description: `"${data.name}" has been created successfully.`,
      })

      reset()
      onOpenChange(false)
      onProjectCreated?.(project)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      })
      captureClientException(error, {
        auth_mode: data.authMode,
        context: 'create_project',
      })
    }
  }

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your courses and manage student
            enrollments.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='name'>
                Project Name <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='name'
                placeholder='My Learning Project'
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className='text-sm text-destructive'>{errors.name.message}</p>
              )}
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                placeholder='A brief description of your project...'
                rows={4}
                {...register('description')}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className='text-sm text-destructive'>
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='authMode'>
                Authentication Mode <span className='text-destructive'>*</span>
              </Label>
              <select
                id='authMode'
                className={`rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.authMode ? 'border-destructive' : ''}`}
                {...register('authMode')}
              >
                <option value='MANAGED'>Managed (Docento handles auth)</option>
                <option value='DELEGATED'>Delegated (your system manages auth)</option>
              </select>
              <p className='text-sm text-muted-foreground'>
                Managed stores student credentials in Docento. Delegated expects you to send authenticated users from your system.
              </p>
              {errors.authMode && (
                <p className='text-sm text-destructive'>{errors.authMode.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
