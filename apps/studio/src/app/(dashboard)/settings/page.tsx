'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useToast } from '@/components/ui/use-toast'
import { useProtectedSession } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth'

const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function SettingsPage() {
  const session = useProtectedSession()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const user = session?.user

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  })

  // Update form when user data loads
  useEffect(() => {
    if (user?.name) {
      reset({ name: user.name })
    }
  }, [user?.name, reset])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB.',
          variant: 'destructive',
        })
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsUpdating(true)

    try {
      // Update user name
      await authClient.updateUser({
        name: data.name,
        image: avatarPreview || undefined,
      })

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })

      // Reset the dirty state
      reset({ name: data.name })
      setAvatarFile(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const hasChanges = isDirty || avatarFile !== null

  return (
    <div className="space-y-12 bg-dashboard-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 space-y-3 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <h1 className="text-3xl font-semibold font-literata tracking-wide text-foreground">
          Settings
        </h1>
        <p className="text-lg font-stix text-foreground/80 tracking-wide">
          Manage your account settings and profile information
        </p>
      </div>

      {/* Profile Section */}
      <div className="space-y-6">
        {/* <div className="space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight font-noto text-foreground">
                        Profile
                    </h2>
                    <p className="text-sm text-foreground/60">
                        Update your personal information
                    </p>
                </div> */}

        <div className="flex flex-col items-center">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full max-w-md space-y-8"
          >
            {/* Avatar */}
            <div className="flex flex-col items-center space-y-4">
              <div
                className="relative cursor-pointer group"
                onClick={handleAvatarClick}
              >
                <Avatar className="size-28 border-2 border-muted-foreground/30">
                  <AvatarImage
                    src={avatarPreview || user?.image || undefined}
                    alt={user?.name || 'User'}
                  />
                  <AvatarFallback className="text-2xl bg-sidebar text-white">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="size-6 text-white" />
                </div>
              </div>
              <div className="flex flex-col items-center space-y-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAvatarClick}
                  className="cursor-pointer hover:text-foreground"
                >
                  Change Avatar
                </Button>
                <p className="text-xs mt-1 text-foreground/50">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-base font-medium text-foreground"
              >
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="Your name"
                {...register('name')}
                className={`w-full mt-2 bg-white border border-muted-foreground/50 shadow-none ${
                  errors.name ? 'border-destructive' : ''
                }`}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-base font-medium text-foreground"
              >
                Email Address
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="w-full mt-2 bg-muted border border-muted-foreground/80 shadow-none text-foreground"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="bg-muted text-foreground/85 rounded-sm hover:text-foreground cursor-pointer"
                onClick={() => {
                  reset({ name: user?.name || '' })
                  setAvatarPreview(null)
                  setAvatarFile(null)
                }}
                disabled={isUpdating || !hasChanges}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isUpdating || !hasChanges}
                className="bg-accent rounded-sm hover:bg-accent/90 text-white cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
