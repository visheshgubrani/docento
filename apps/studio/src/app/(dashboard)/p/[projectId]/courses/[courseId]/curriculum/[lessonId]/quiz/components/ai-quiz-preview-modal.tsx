'use client'

import { useState } from 'react'
import { RiSparkling2Fill } from 'react-icons/ri'
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  HelpCircle,
  AlertCircle,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { type Question } from '@/lib/api'

type AIQuizPreviewModalProps = {
  isOpen: boolean
  questions: Question[]
  onClose: () => void
  onConfirm: () => void
  onRegenerate: () => void
  isGenerating: boolean
  isCreating: boolean
}

export function AIQuizPreviewModal({
  isOpen,
  questions,
  onClose,
  onConfirm,
  onRegenerate,
  isGenerating,
  isCreating,
}: AIQuizPreviewModalProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set([0]),
  )

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const expandAll = () => {
    setExpandedQuestions(new Set(questions.map((_, i) => i)))
  }

  const collapseAll = () => {
    setExpandedQuestions(new Set())
  }

  // Calculate statistics
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isCreating && onClose()}
    >
      <DialogContent className="md:max-w-[850px] lg:max-w-[950px] p-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-200 bg-gradient-to-br from-accent/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 h-full flex items-center justify-center rounded-lg bg-accent/10">
              <RiSparkling2Fill className="size-6 text-accent" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">
                Review AI-Generated Quiz
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-foreground/70">
                Preview the generated questions before adding them to your quiz
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isGenerating ? (
            <div className="space-y-6">
              <div className="bg-neutral-50 flex flex-col items-center text-center gap-2 rounded-lg p-4 border border-neutral-200">
                <div className="flex items-center text-center gap-2 my-3">
                  <Loader2 className="size-6 animate-spin text-accent" />
                  <p className="text-lg text-foreground font-medium">
                    Generating quiz preview...
                  </p>
                </div>
                <div className="flex flex-wrap gap-6">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>

              <div className="space-y-4">
                <QuestionLoadingCard />
                <QuestionLoadingCard />
                <QuestionLoadingCard />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quiz Overview */}
              <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <HelpCircle className="size-4" />
                    <span className="font-medium">
                      {questions.length} questions
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle className="size-4" />
                    <span className="font-medium">
                      {totalPoints} total points
                    </span>
                  </div>
                </div>

                {/* Question Type Breakdown */}
                {/* <div className="flex flex-wrap gap-2 mt-4">
                  {Object.entries(typeCounts).map(([type, count]) => (
                    <span
                      key={type}
                      className={cn(
                        "text-xs px-3 py-1 rounded-full font-medium",
                        questionTypeColors[type as QuestionType]
                      )}
                    >
                      {count} {questionTypeLabels[type as QuestionType]}
                    </span>
                  ))}
                </div> */}
              </div>

              {/* Expand/Collapse Controls */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={expandAll}
                  className="text-xs h-8"
                >
                  Expand All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={collapseAll}
                  className="text-xs h-8"
                >
                  Collapse All
                </Button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {questions.map((question, questionIndex) => (
                  <QuestionCard
                    key={questionIndex}
                    question={question}
                    questionIndex={questionIndex}
                    isExpanded={expandedQuestions.has(questionIndex)}
                    onToggle={() => toggleQuestion(questionIndex)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-100 flex flex-row items-center justify-between shrink-0">
          <div className="text-sm text-foreground/60">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                {/* <Loader2 className="size-4 animate-spin" /> */}
                Generating questions...
              </span>
            ) : isCreating ? (
              <span className="flex items-center gap-2">
                {/* <Loader2 className="size-4 animate-spin" /> */}
                Adding questions to quiz...
              </span>
            ) : (
              <span>Review the questions before confirming</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="rounded-md  hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onRegenerate}
              disabled={isGenerating || isCreating}
              className="rounded-md hover:text-foreground cursor-pointer gap-2"
            >
              <RiSparkling2Fill className="size-4" />
              Regenerate
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isGenerating || isCreating}
              className={cn(
                'gap-2 rounded-md cursor-pointer',
                'bg-accent hover:bg-accent/90 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isCreating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle className="size-4" />
                  Confirm & Add
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function QuestionLoadingCard() {
  return (
    <div className="border border-neutral-300 rounded-lg overflow-hidden bg-white">
      <div className="w-full flex items-start gap-3 px-4 py-3 bg-neutral-50">
        <Skeleton className="size-5 rounded" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-12 ml-auto" />
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-200 px-4 py-3 space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-[88%]" />
      </div>
    </div>
  )
}

// Question Card Component
function QuestionCard({
  question,
  questionIndex,
  isExpanded,
  onToggle,
}: {
  question: Question
  questionIndex: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const isMultipleChoice = question.questionType === 'MULTIPLE_CHOICE'
  const isTrueFalse = question.questionType === 'TRUE_FALSE'

  return (
    <div className="border border-neutral-300 rounded-lg overflow-hidden bg-white">
      {/* Question Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left"
      >
        <div className="mt-0.5 shrink-0">
          {isExpanded ? (
            <ChevronDown className="size-5 text-foreground/50" />
          ) : (
            <ChevronUp className="size-5 text-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2.5 mb-1">
            <span className="text-sm font-medium font-ibm text-foreground/80">
              Q{questionIndex + 1}
            </span>
            <div className="font-medium text-sm line-clamp-2">
              {question.questionText}
            </div>
            {/* <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded font-medium",
                questionTypeColors[question.questionType]
              )}
            >
              {questionTypeLabels[question.questionType]}
            </span> */}
            <span className="ml-auto text-xs whitespace-nowrap text-foreground/70">
              {question.points || 1} pts
            </span>
          </div>
        </div>
      </button>

      {/* Question Content */}
      {isExpanded && (
        <div className="border-t border-neutral-200 px-4 py-3">
          {/* Full Question Text */}
          {/* <p className="text-sm text-foreground mb-3">
            {question.questionText}
          </p> */}

          {/* Options for Multiple Choice */}
          {isMultipleChoice &&
            question.options &&
            question.options.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {question.options.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded text-sm',
                      option === question.correctAnswer
                        ? 'bg-green-50 border border-lime-700 text-lime-900'
                        : 'bg-neutral-50 border border-neutral-200 text-foreground/80',
                    )}
                  >
                    <span
                      className={cn(
                        'size-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                        option === question.correctAnswer
                          ? 'bg-lime-500 text-white'
                          : 'bg-neutral-200 text-neutral-600',
                      )}
                    >
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span>{option}</span>
                    {option === question.correctAnswer && (
                      <CheckCircle className="size-4 text-lime-800 ml-auto shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}

          {/* True/False Display */}
          {isTrueFalse && (
            <div className="flex gap-2 mb-3">
              <div
                className={cn(
                  'flex-1 px-3 py-2 rounded text-sm text-center border',
                  question.correctAnswer === 'True'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-neutral-50 border-neutral-200 text-foreground/50',
                )}
              >
                True
                {question.correctAnswer === 'True' && (
                  <CheckCircle className="size-3.5 inline-block ml-1.5 text-green-600" />
                )}
              </div>
              <div
                className={cn(
                  'flex-1 px-3 py-2 rounded text-sm text-center border',
                  question.correctAnswer === 'False'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-neutral-50 border-neutral-200 text-foreground/50',
                )}
              >
                False
                {question.correctAnswer === 'False' && (
                  <CheckCircle className="size-3.5 inline-block ml-1.5 text-green-600" />
                )}
              </div>
            </div>
          )}

          {/* Short Answer Display */}
          {question.questionType === 'SHORT_ANSWER' && (
            <div className="bg-green-50 border border-green-200 rounded px-3 py-2 mb-3">
              <div className="text-xs text-green-700 font-medium mb-1">
                Correct Answer:
              </div>
              <div className="text-sm text-green-800">
                {question.correctAnswer}
              </div>
            </div>
          )}

          {/* Explanation */}
          {question.explanation && (
            <div className="bg-accent/10 border border-accent/50 rounded px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-accent font-medium mb-1">
                <AlertCircle className="size-3.5" />
                Explanation
              </div>
              <div className="text-sm text-foreground">
                {question.explanation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
