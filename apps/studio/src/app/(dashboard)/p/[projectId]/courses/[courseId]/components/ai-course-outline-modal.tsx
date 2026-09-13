'use client'

import { useState } from 'react'
import { IoFlask } from 'react-icons/io5'
import { BsStars } from 'react-icons/bs'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { FaWandMagicSparkles } from 'react-icons/fa6'

type AICourseOutlineModalProps = {
  isOpen: boolean
  onClose: () => void
  onGenerate: (data: {
    description: string
    targetAudience: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    moduleCount: number
    lessonsPerModule: number
  }) => void
  isLoading?: boolean
}

export function AICourseOutlineModal({
  isOpen,
  onClose,
  onGenerate,
  isLoading = false,
}: AICourseOutlineModalProps) {
  const [description, setDescription] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [difficulty, setDifficulty] = useState<
    'beginner' | 'intermediate' | 'advanced'
  >('intermediate')
  const [moduleCount, setModuleCount] = useState(5)
  const [lessonsPerModule, setLessonsPerModule] = useState(4)

  const handleSubmit = () => {
    if (!description.trim()) return

    onGenerate({
      description: description.trim(),
      targetAudience: targetAudience.trim(),
      difficulty,
      moduleCount,
      lessonsPerModule,
    })
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const resetForm = () => {
    setDescription('')
    setTargetAudience('')
    setDifficulty('intermediate')
    setModuleCount(5)
    setLessonsPerModule(4)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="md:max-w-[600px] lg:max-w-[650px] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-200 bg-gradient-to-br from-accent/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 h-full flex items-center justify-center rounded-lg bg-accent/10">
              <BsStars className="size-6 text-accent" />
            </div>
            <div>
              <div className="flex justify-between items-center">
                <DialogTitle className="text-xl font-semibold">
                  Generate Course Outline
                </DialogTitle>
              </div>
              <DialogDescription className="mt-0.5 text-foreground/70">
                Describe your course idea and let AI generate a preview of the
                outline
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <div className="px-6 pb-5 pt-2 space-y-7">
          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Course Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what your course will teach. Be specific about topics, skills, and outcomes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={isLoading}
              className={cn(
                'rounded-md shadow-none border border-neutral-300 resize-none',
                'focus:border-accent focus:ring-1 focus:ring-accent/30',
              )}
            />
          </div>

          {/* Target Audience */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="targetAudience" className="text-sm font-medium">
              Target Audience
            </Label>
            <Input
              id="targetAudience"
              placeholder="e.g., Beginners with no coding experience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              disabled={isLoading}
              className="rounded-md shadow-none border-neutral-300"
            />
          </div>

          {/* Difficulty and Counts Row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Difficulty */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="difficulty" className="text-sm font-medium">
                Difficulty
              </Label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(
                    e.target.value as 'beginner' | 'intermediate' | 'advanced',
                  )
                }
                disabled={isLoading}
                className="w-full h-10 px-1.5 rounded-md border border-neutral-300 bg-white text-sm focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Module Count */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="moduleCount" className="text-sm font-medium">
                Modules
              </Label>
              <Input
                id="moduleCount"
                type="number"
                min={1}
                max={20}
                value={moduleCount}
                onChange={(e) =>
                  setModuleCount(
                    Math.max(1, Math.min(20, parseInt(e.target.value) || 1)),
                  )
                }
                disabled={isLoading}
                className="rounded-md shadow-none border-neutral-300"
              />
            </div>

            {/* Lessons Per Module */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="lessonsPerModule" className="text-sm font-medium">
                Lessons/Module
              </Label>
              <Input
                id="lessonsPerModule"
                type="number"
                min={1}
                max={15}
                value={lessonsPerModule}
                onChange={(e) =>
                  setLessonsPerModule(
                    Math.max(1, Math.min(15, parseInt(e.target.value) || 1)),
                  )
                }
                disabled={isLoading}
                className="rounded-md shadow-none border-neutral-300"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex flex-row items-center justify-between w-full">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-foreground/30 text-accent text-xs font-medium">
            <IoFlask className="size-3.5" />
            Experimental
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-md hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!description.trim() || isLoading}
              className={cn(
                'gap-2 rounded-md cursor-pointer',
                'bg-accent hover:bg-accent/90 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <FaWandMagicSparkles className="size-4" />
                  Generate Preview
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
