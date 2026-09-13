'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface QuizDetailsPanelProps {
  quizTitle: string
  setQuizTitle: (value: string) => void
  quizDescription: string
  setQuizDescription: (value: string) => void
  passingScore: number
  setPassingScore: (value: number) => void
  maxAttempts: number | ''
  setMaxAttempts: (value: number | '') => void
  timeLimit: number | ''
  setTimeLimit: (value: number | '') => void
}

export function QuizDetailsPanel({
  quizTitle,
  setQuizTitle,
  quizDescription,
  setQuizDescription,
  passingScore,
  setPassingScore,
  maxAttempts,
  setMaxAttempts,
  timeLimit,
  setTimeLimit,
}: QuizDetailsPanelProps) {
  return (
    <div className="rounded-md border border-neutral-300 bg-white p-4 space-y-6 sticky top-6">
      <div className="flex items-center bg-muted p-2 rounded-md justify-between">
        <h3 className="font-light text-xl">Quiz Details</h3>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label
          htmlFor="quiz-title"
          className="text-sm font-medium text-foreground"
        >
          Quiz Title <span className="text-red-500">*</span>
        </label>
        <Input
          id="quiz-title"
          value={quizTitle}
          onChange={(e) => setQuizTitle(e.target.value)}
          placeholder="Enter quiz title"
          className="border-neutral-300 rounded-sm shadow-none py-2 mt-1"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label
          htmlFor="quiz-description"
          className="text-sm font-medium text-foreground"
        >
          Description <span className="text-muted-foreground"> (Optional)</span>
        </label>
        <Textarea
          id="quiz-description"
          value={quizDescription}
          onChange={(e) => setQuizDescription(e.target.value)}
          placeholder="Add instructions or context for students..."
          className="border-neutral-300 rounded-sm shadow-none py-2 mt-1 min-h-[100px]"
          rows={4}
        />
      </div>

      {/* Settings */}
      <div className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="passing-score"
            className="text-sm font-medium text-foreground"
          >
            Passing Score <span className="text-muted-foreground"> (%)</span>
          </label>
          <Input
            id="passing-score"
            type="number"
            min="0"
            max="100"
            value={passingScore}
            onChange={(e) => setPassingScore(Number(e.target.value))}
            className="border-neutral-300 rounded-sm shadow-none py-2 mt-1"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="max-attempts"
            className="text-sm font-medium text-foreground"
          >
            Max Attempts{' '}
            <span className="text-muted-foreground"> (Optional)</span>
          </label>
          <Input
            id="max-attempts"
            type="number"
            min="1"
            value={maxAttempts}
            onChange={(e) =>
              setMaxAttempts(e.target.value ? Number(e.target.value) : '')
            }
            placeholder="Unlimited"
            className="border-neutral-300 rounded-sm shadow-none py-2 mt-1"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="time-limit"
            className="text-sm font-medium text-foreground"
          >
            Time Limit <span className="text-muted-foreground"> (minutes)</span>
          </label>
          <Input
            id="time-limit"
            type="number"
            min="1"
            value={timeLimit}
            onChange={(e) =>
              setTimeLimit(e.target.value ? Number(e.target.value) : '')
            }
            placeholder="No limit"
            className="border-neutral-300 rounded-sm shadow-none py-2 mt-1"
          />
        </div>
      </div>
    </div>
  )
}
