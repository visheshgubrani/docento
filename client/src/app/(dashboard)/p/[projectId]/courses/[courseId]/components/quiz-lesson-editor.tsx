import { useEffect, useState } from 'react'
import { ListChecks, Plus } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CourseModule, CourseModuleLesson } from '@/lib/api'

type DraftQuestion = {
  id: string
  prompt: string
  answers: string[]
}

const ANSWER_LABELS = ['A', 'B', 'C', 'D']

function createEmptyQuestion(): DraftQuestion {
  return {
    id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    prompt: '',
    answers: ['', '', '', ''],
  }
}

type QuizLessonEditorProps = {
  lesson: CourseModuleLesson
  module?: CourseModule
}

export function QuizLessonEditor({
  lesson,
  module,
}: QuizLessonEditorProps) {
  const lessonLabel = lesson.contentType === 'MOCK_TEST' ? 'Mock test' : 'Quiz'

  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [
    createEmptyQuestion(),
  ])

  useEffect(() => {
    setQuestions([createEmptyQuestion()])
  }, [lesson.id])

  const handlePromptChange = (id: string, prompt: string) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, prompt } : question
      )
    )
  }

  const handleAnswerChange = (
    id: string,
    answerIndex: number,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id
          ? {
              ...question,
              answers: question.answers.map((answer, index) =>
                index === answerIndex ? value : answer
              ),
            }
          : question
      )
    )
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()])
  }

  return (
    <Card className='border border-slate-200/80 shadow-sm dark:border-slate-800'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-semibold'>
          <ListChecks className='h-5 w-5 text-muted-foreground' />
          {lessonLabel} builder
        </CardTitle>
        <CardDescription>
          {module ? `${module.title} • ` : ''}
          {lesson.title}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {questions.map((question, index) => (
          <QuizQuestionCard
            key={question.id}
            index={index}
            question={question}
            onPromptChange={handlePromptChange}
            onAnswerChange={handleAnswerChange}
          />
        ))}
        <Button
          variant='outline'
          className='w-full gap-2'
          onClick={addQuestion}
        >
          <Plus className='h-4 w-4' />
          Add question
        </Button>
      </CardContent>
    </Card>
  )
}

function QuizQuestionCard({
  index,
  question,
  onPromptChange,
  onAnswerChange,
}: {
  index: number
  question: DraftQuestion
  onPromptChange: (id: string, prompt: string) => void
  onAnswerChange: (id: string, answerIndex: number, value: string) => void
}) {
  return (
    <Card className='border border-slate-200 dark:border-slate-800'>
      <CardHeader>
        <CardTitle className='text-base font-semibold'>
          Question {index + 1}
        </CardTitle>
        <CardDescription>Write the prompt and answer choices.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor={`question-${question.id}`}>Question text</Label>
          <Textarea
            id={`question-${question.id}`}
            value={question.prompt}
            onChange={(event) =>
              onPromptChange(question.id, event.target.value)
            }
            placeholder="What is the output of console.log(2 + '2')?"
          />
        </div>
        <div className='space-y-2'>
          <Label>Answers</Label>
          <div className='space-y-2'>
            {question.answers.map((answer, answerIndex) => (
              <Input
                key={`${question.id}-${answerIndex}`}
                value={answer}
                onChange={(event) =>
                  onAnswerChange(question.id, answerIndex, event.target.value)
                }
                placeholder={`Answer ${ANSWER_LABELS[answerIndex] ?? ''}`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
