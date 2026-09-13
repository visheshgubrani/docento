'use client'

import { useState } from 'react'
import { RiSparkling2Fill } from 'react-icons/ri'
import { Loader2 } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type QuestionType } from '@/lib/api'

interface GenerateQuizDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (options: {
    description: string
    questionCount: number
    questionTypes: QuestionType[]
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  }) => Promise<void>
  isGenerating: boolean
  lessonTitle?: string
}

export function GenerateQuizDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
  lessonTitle,
}: GenerateQuizDialogProps) {
  const [description, setDescription] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [difficulty, setDifficulty] = useState<
    'beginner' | 'intermediate' | 'advanced'
  >('intermediate')
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    'MULTIPLE_CHOICE',
  ])

  const handleTypeToggle = (type: QuestionType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        // Don't allow removing the last type
        if (prev.length === 1) return prev
        return prev.filter((t) => t !== type)
      }
      return [...prev, type]
    })
  }

  const handleGenerate = async () => {
    if (!description.trim() || description.trim().length < 10) {
      return
    }

    await onGenerate({
      description: description.trim(),
      questionCount,
      questionTypes: selectedTypes,
      difficulty,
    })
  }

  const isValid = description.trim().length >= 10 && selectedTypes.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <RiSparkling2Fill className="size-5 text-accent" />
            Generate Quiz with AI
          </DialogTitle>
          <DialogDescription className="text-foreground/60 mt-1">
            Describe what you want the quiz to cover (minimum 10 characters).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-7 py-4">
          {/* Description */}
          <div className="space-y-2">
            <label
              htmlFor="quiz-description"
              className="text-sm font-medium text-foreground"
            >
              Quiz Topic Description <span className="text-destructive">*</span>
            </label>

            <Textarea
              id="quiz-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                lessonTitle
                  ? `e.g., Test knowledge about ${lessonTitle}, covering key concepts, definitions, and practical applications...`
                  : 'Describe what topics, concepts, or skills the quiz should test...'
              }
              className="border-neutral-300 rounded-sm shadow-none py-2 mt-1 min-h-[100px]"
              rows={4}
            />
            {/* <p className="text-xs text-foreground/40">
              Minimum 10 characters. Be specific about the topics you want to
              cover.
            </p> */}
          </div>

          <div className="flex justify-between gap-2">
            {/* Question Count */}
            <div className="space-y-2">
              <label
                htmlFor="question-count"
                className="text-sm font-medium text-foreground"
              >
                Number of Questions
              </label>
              <Input
                id="question-count"
                type="number"
                min="1"
                max="20"
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(
                    Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
                className="border-neutral-300 rounded-sm shadow-none py-2 mt-1 w-32"
              />
              <p className="text-xs text-foreground/60">1-20 questions</p>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Difficulty Level
              </label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as typeof difficulty)}
              >
                <SelectTrigger className="w-48 border-neutral-300 rounded-sm shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Question Types */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">
              Question Types
            </label>
            <div className="space-y-2 mt-2 bg-muted/80 rounded-md p-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={selectedTypes.includes('MULTIPLE_CHOICE')}
                  onCheckedChange={() => handleTypeToggle('MULTIPLE_CHOICE')}
                  className="border border-foreground/80"
                />
                <span className="text-sm text-foreground">Multiple Choice</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={selectedTypes.includes('TRUE_FALSE')}
                  onCheckedChange={() => handleTypeToggle('TRUE_FALSE')}
                  className="border border-foreground/80"
                />
                <span className="text-sm text-foreground">True/False</span>
              </label>
              {/* <label className="flex items-center gap-3 cursor-pointer">
                                <Checkbox
                                    checked={selectedTypes.includes(
                                        "SHORT_ANSWER"
                                    )}
                                    onCheckedChange={() =>
                                        handleTypeToggle("SHORT_ANSWER")
                                    }
                                    className="border border-foreground/80"
                                />
                                <span className="text-sm text-foreground">
                                    Short Answer
                                </span>
                            </label> */}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-center gap-2.5 w-full">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="cursor-pointer w-full hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!isValid || isGenerating}
            className="bg-accent/80 w-full hover:bg-accent/90 py-6 text-white cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-5 mr-1 animate-spin" />
                Generating Preview...
              </>
            ) : (
              <>
                <RiSparkling2Fill className="size-5 mr-1" />
                Generate Preview
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
