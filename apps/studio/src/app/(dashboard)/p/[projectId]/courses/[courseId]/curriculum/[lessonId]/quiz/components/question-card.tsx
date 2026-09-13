'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { IoIosAddCircleOutline } from 'react-icons/io'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createQuiz,
  type Quiz,
  type Question,
  type CreateQuestionInput,
} from '@/lib/api'
import { QuestionItem } from './question-item'

interface QuestionCardProps {
  projectId: string
  courseId: string
  moduleId: string
  lessonId: string
  quiz: Quiz | null
  questions: Question[]
  onQuestionsUpdate: (questions: Question[]) => void
  onQuizCreated?: (quiz: Quiz) => void
  quizTitle?: string
  lessonTitle?: string
}

export function QuestionCard({
  projectId,
  courseId,
  moduleId,
  lessonId,
  quiz,
  questions,
  onQuestionsUpdate,
  onQuizCreated,
  quizTitle,
  lessonTitle,
}: QuestionCardProps) {
  const { toast } = useToast()
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null)
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(
    null,
  )
  const [validationError, setValidationError] = useState<string>('')
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [localQuiz, setLocalQuiz] = useState<Quiz | null>(quiz)

  // Keep local quiz in sync with prop
  useEffect(() => {
    setLocalQuiz(quiz)
  }, [quiz])

  const validateAndSaveLastQuestion = async (): Promise<boolean> => {
    if (questions.length === 0) {
      setValidationError('')
      return true
    }

    const lastQuestion = questions[questions.length - 1]

    // Check if it's a temp question
    if (lastQuestion.id.startsWith('temp-')) {
      // Check if the question is complete
      const isComplete =
        lastQuestion.questionText.trim() !== '' &&
        lastQuestion.correctAnswer !== ''

      if (isComplete) {
        // Auto-save it
        try {
          setSavingQuestionId(lastQuestion.id)
          await handleSaveQuestion(lastQuestion.id, {
            questionText: lastQuestion.questionText,
            questionType: lastQuestion.questionType,
            options: lastQuestion.options || undefined,
            correctAnswer: lastQuestion.correctAnswer,
            explanation: lastQuestion.explanation || undefined,
            points: lastQuestion.points,
          })
          setSavingQuestionId(null)
          setValidationError('')
          return true
        } catch (error) {
          setSavingQuestionId(null)
          return false
        }
      } else {
        setValidationError(
          'Please complete the current question before adding a new one.',
        )
        return false
      }
    }

    setValidationError('')
    return true
  }

  const handleAddQuestion = async () => {
    const canAdd = await validateAndSaveLastQuestion()
    if (!canAdd) return

    // Add a temporary new question to the list
    const newQuestion: Partial<Question> = {
      id: `temp-${Date.now()}`,
      quizId: quiz?.id || '',
      questionText: '',
      questionType: 'MULTIPLE_CHOICE',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      points: 1,
      order: questions.length + 1,
      createdAt: new Date().toISOString(),
    }

    onQuestionsUpdate([...questions, newQuestion as Question])
    setValidationError('')

    // Scroll to new question after a short delay
    setTimeout(() => {
      const questionId = newQuestion.id!
      if (questionRefs.current[questionId]) {
        questionRefs.current[questionId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }, 100)
  }

  const handleSaveQuestion = async (
    questionId: string,
    questionData: CreateQuestionInput,
  ) => {
    // Check if this is a new question (temp ID) or existing
    const isNewQuestion = questionId.startsWith('temp-')

    if (isNewQuestion) {
      // Create quiz first if it doesn't exist
      let currentQuiz = localQuiz
      if (!currentQuiz) {
        try {
          const title = quizTitle || `${lessonTitle || 'Lesson'} Quiz`
          currentQuiz = await createQuiz(
            projectId,
            courseId,
            moduleId,
            lessonId,
            {
              title,
              passingScore: 70,
            },
          )
          setLocalQuiz(currentQuiz)
          if (onQuizCreated) {
            onQuizCreated(currentQuiz)
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to create quiz. Please try again.',
            variant: 'destructive',
          })
          throw error
        }
      }

      // Create new question
      const newQuestion = await createQuestion(
        projectId,
        courseId,
        moduleId,
        lessonId,
        questionData,
      )

      // Replace temp question with real question
      const updatedQuestions = questions.map((q) =>
        q.id === questionId ? newQuestion : q,
      )
      onQuestionsUpdate(updatedQuestions)

      toast({
        title: 'Question added',
        description: 'Your question has been saved successfully.',
      })
    } else {
      // Update existing question
      const updatedQuestion = await updateQuestion(
        projectId,
        courseId,
        moduleId,
        lessonId,
        questionId,
        questionData,
      )

      const updatedQuestions = questions.map((q) =>
        q.id === questionId ? updatedQuestion : q,
      )
      onQuestionsUpdate(updatedQuestions)

      toast({
        title: 'Question updated',
        description: 'Your changes have been saved.',
      })
    }

    setValidationError('')
  }

  const handleSaveQuestionWrapper = async (
    questionId: string,
    data: CreateQuestionInput,
  ) => {
    try {
      setSavingQuestionId(questionId)
      await handleSaveQuestion(questionId, data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save question'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setSavingQuestionId(null)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      setDeletingQuestionId(questionId)

      // If temp question, just remove from list
      if (questionId.startsWith('temp-')) {
        const updatedQuestions = questions.filter((q) => q.id !== questionId)
        onQuestionsUpdate(updatedQuestions)
        setValidationError('')
        setDeletingQuestionId(null)
        return
      }

      // Delete from backend
      await deleteQuestion(projectId, courseId, moduleId, lessonId, questionId)

      const updatedQuestions = questions.filter((q) => q.id !== questionId)
      onQuestionsUpdate(updatedQuestions)

      toast({
        title: 'Question deleted',
        description: 'The question has been removed.',
      })
      setValidationError('')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete question'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDeletingQuestionId(null)
    }
  }

  const handleQuestionChange = (
    questionId: string,
    updates: Partial<Question>,
  ) => {
    const updatedQuestions = questions.map((q) =>
      q.id === questionId ? { ...q, ...updates } : q,
    )
    onQuestionsUpdate(updatedQuestions)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-light text-2xl">Questions</h3>
        <Button
          onClick={handleAddQuestion}
          className="flex items-center gap-2 bg-accent/70 hover:bg-accent/90 text-white cursor-pointer"
        >
          <IoIosAddCircleOutline className="size-5" />
          New Question
        </Button>
      </div>

      {validationError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3">
          <p className="text-sm text-destructive font-medium">
            {validationError}
          </p>
        </div>
      )}

      {questions.length === 0 && (
        <div className="rounded-md border border-neutral-300 bg-white p-8 text-center">
          <p className="text-sm text-foreground/60">
            No questions yet. Click "New Question" to add your first question.
          </p>
        </div>
      )}

      {questions.map((question, index) => (
        <div
          key={question.id}
          ref={(el) => {
            questionRefs.current[question.id] = el
          }}
        >
          <QuestionItem
            question={question}
            questionNumber={index + 1}
            onSave={handleSaveQuestionWrapper}
            onDelete={() => handleDeleteQuestion(question.id)}
            onChange={handleQuestionChange}
            isSaving={savingQuestionId === question.id}
            isDeleting={deletingQuestionId === question.id}
          />
        </div>
      ))}

      {/* Add New Question Prompt */}
      {questions.length > 0 && (
        <button
          onClick={handleAddQuestion}
          className="rounded-md border-2 border-dashed border-neutral-300 bg-white py-5 text-center hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer w-full"
        >
          <div className="flex items-center justify-center gap-2">
            <IoIosAddCircleOutline className="size-6 text-foreground" />
            <p className="text-lg font-medium text-foreground">
              Add a new question
            </p>
          </div>
        </button>
      )}
    </div>
  )
}
