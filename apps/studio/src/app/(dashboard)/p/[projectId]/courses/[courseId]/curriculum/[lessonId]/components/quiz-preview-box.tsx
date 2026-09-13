'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { BsQuestionSquareFill } from 'react-icons/bs'
import { MdQuestionAnswer, MdTimer } from 'react-icons/md'
import { RiLoopRightLine } from 'react-icons/ri'
import { FaListCheck } from 'react-icons/fa6'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { type Quiz } from '@/lib/api'

interface QuizPreviewBoxProps {
  quiz: Quiz
  isMockTest?: boolean
  lessonId: string
  projectId: string
  courseId: string
  onDelete: () => void
  isDeleting: boolean
}

export function QuizPreviewBox({
  quiz,
  isMockTest = false,
  lessonId,
  projectId,
  courseId,
  onDelete,
  isDeleting,
}: QuizPreviewBoxProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleEdit = () => {
    router.push(
      `/p/${projectId}/courses/${courseId}/curriculum/${lessonId}/quiz`,
    )
  }

  const handleDelete = () => {
    onDelete()
    setShowDeleteDialog(false)
  }

  const questionCount = quiz.questions?.length || 0
  const quizLabel = isMockTest || quiz.isMockTest ? 'Mock Test' : 'Quiz'

  return (
    <>
      <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <BsQuestionSquareFill className="size-6 text-accent" />
            <h4 className="font-semibold text-xl text-foreground">
              {quizLabel}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-accent transition-colors cursor-pointer"
            >
              <Pencil className="size-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-3">
          <div>
            <h5 className="font-semibold text-lg text-foreground">
              {quiz.title}
            </h5>
            {quiz.description && (
              <p className="text-sm text-foreground/70 mt-1">
                {quiz.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-6">
            <div className="flex items-start justify-center gap-2">
              <MdQuestionAnswer className="size-5 text-accent/70 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold fcont-noto text-foreground/80">
                  Questions
                </span>
                <span className="text-lg font-allerta text-foreground/90 font-semibold mt-1.5">
                  {questionCount}
                </span>
              </div>
            </div>
            <div className="flex items-start justify-center gap-2">
              <FaListCheck className="size-4.5 text-accent/80 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold fcont-noto text-foreground/80">
                  Passing Score
                </span>
                <span className="text-lg font-allerta text-foreground/90 font-semibold mt-1.5">
                  {quiz.passingScore || 70}%
                </span>
              </div>
            </div>
            <div className="flex items-start justify-center gap-2">
              <RiLoopRightLine className="size-4.5 text-accent/80 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold fcont-noto text-foreground/80">
                  Max Attempts
                </span>
                <span className="text-lg font-allerta text-foreground/90 font-semibold mt-1.5">
                  {quiz.maxAttempts || 'Unlimited'}
                </span>
              </div>
            </div>
            <div className="flex items-start justify-center gap-2">
              <MdTimer className="size-5 text-accent/70 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold fcont-noto text-foreground/80">
                  Time Limit
                </span>
                <span className="text-lg font-allerta text-foreground/90 font-semibold mt-1.5">
                  {quiz.timeLimit ? `${quiz.timeLimit} min` : 'No limit'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quiz</DialogTitle>
            <DialogDescription className="text-foreground/60 mt-3">
              Are you sure you want to delete this {quizLabel.toLowerCase()}?
              This will also delete all questions and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? 'Deleting...' : `Delete ${quizLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
