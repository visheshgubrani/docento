'use client'

import { useState } from 'react'

import type { AuthorQuiz, AuthorQuizQuestion } from '@docento/sdk'

import { browserApiClient } from '@/lib/client-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAsyncAction } from '@/hooks/use-async-action'

/**
 * Author a lesson's quiz: its settings, its sections and its questions.
 *
 * ## Why this component owns the quiz rather than reading it from props
 *
 * It starts from what the server rendered, and re-reads after every write. The
 * alternative — trusting `router.refresh()` to bring new props — does not work
 * for a form: `useState` initialises once, so a refreshed prop would arrive
 * after the state was set and be ignored, and the next save would write back
 * what the page loaded rather than what the operator just did.
 *
 * Re-reading has a second benefit that matters more: it is the only way to see
 * the ids of things that were just created. `upsertQuestion` answers with a
 * `questionId`, but a section added moments ago has an id the form needs for the
 * next question's `sectionId`, and the read is where it comes from.
 *
 * ## Why the questions are shown with their answers
 *
 * This is staff-only, behind `course:read`, and it is the whole reason
 * `quiz.get` exists. An editor that could not show the key could only append and
 * blind-overwrite: an author fixing a typo in a correct answer would have to
 * retype the answer from memory.
 */

/** `2026-06-01T09:00` for a `datetime-local` input, from an ISO string. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return ''

  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** The inverse, with an empty field meaning "no date" rather than an epoch. */
function fromLocalInput(value: string): Date | null {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'INTEGER',
] as const

type QuestionType = (typeof QUESTION_TYPES)[number]

/** A blank question, so the form always has a shape to render. */
const EMPTY_QUESTION = {
  questionId: '' as string | undefined,
  prompt: '',
  questionType: 'MULTIPLE_CHOICE' as QuestionType,
  options: '',
  correctAnswer: '',
  correctAnswers: '',
  explanation: '',
  points: 1,
  negativePoints: 0,
  partialMarking: false,
  sectionId: '' as string,
}

type QuestionDraft = typeof EMPTY_QUESTION

export function QuizEditor({
  workspaceId,
  academyId,
  courseId,
  lessonId,
  initialQuiz,
}: {
  workspaceId: string
  academyId: string
  courseId: string
  lessonId: string
  initialQuiz: AuthorQuiz | null
}) {
  const [quiz, setQuiz] = useState<AuthorQuiz | null>(initialQuiz)
  const [draft, setDraft] = useState<QuestionDraft>(EMPTY_QUESTION)
  const [sectionTitle, setSectionTitle] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const settings = useAsyncAction({
    onSuccess: () => setNotice('Settings saved.'),
  })
  const sections = useAsyncAction({ onSuccess: () => setSectionTitle('') })
  const questions = useAsyncAction({
    onSuccess: () => {
      setDraft(EMPTY_QUESTION)
      setNotice('Question saved.')
    },
  })

  const api = browserApiClient(workspaceId)

  /** Re-read the quiz, which is how new ids and new state arrive. */
  const reload = async () => {
    const { quiz: fresh } = await api.getQuiz(
      workspaceId,
      academyId,
      courseId,
      lessonId,
    )

    setQuiz(fresh)
  }

  /**
   * Settings, keyed on `lessonId`, so this works whether or not a quiz exists.
   *
   * The form is uncontrolled about the quiz's identity on purpose: an author
   * writes settings for a lesson, and whether a row already exists behind them is
   * the API's business.
   */
  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = new FormData(event.currentTarget)

    const result = await settings.run(async () => {
      await api.upsertQuiz(workspaceId, academyId, courseId, lessonId, {
        title: String(form.get('title') ?? '').trim() || 'Quiz',
        description: String(form.get('description') ?? '').trim() || null,
        passingPercent: Number(form.get('passingPercent') ?? 70),
        maxAttempts: form.get('maxAttempts')
          ? Number(form.get('maxAttempts'))
          : null,
        timeLimitMinutes: form.get('timeLimitMinutes')
          ? Number(form.get('timeLimitMinutes'))
          : null,
        opensAt: fromLocalInput(String(form.get('opensAt') ?? '')),
        closesAt: fromLocalInput(String(form.get('closesAt') ?? '')),
        isMockTest: form.get('isMockTest') === 'on',
        negativeMarking: form.get('negativeMarking') === 'on',
        defaultNegativeMark: form.get('defaultNegativeMark')
          ? Number(form.get('defaultNegativeMark'))
          : null,
      })

      return reload()
    })

    if (result !== null) setNotice('Settings saved.')
  }

  const addSection = async (event: React.FormEvent) => {
    event.preventDefault()

    const title = sectionTitle.trim()

    if (!title || !quiz) return

    await sections.run(async () => {
      await api.upsertQuizSection(workspaceId, academyId, courseId, quiz.id, {
        title,
      })

      return reload()
    })
  }

  const saveQuestion = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!quiz) return

    const prompt = draft.prompt.trim()

    /**
     * A multi-select question carries its answers in `correctAnswers`; every
     * other type carries one in `correctAnswer`, which the contract requires
     * even when it is empty for a type that has no single answer.
     */
    const isMulti = draft.questionType === 'MULTI_SELECT'

    const correctAnswers = draft.correctAnswers
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean)

    await questions.run(async () => {
      await api.upsertQuestion(workspaceId, academyId, courseId, quiz.id, {
        ...(draft.questionId ? { questionId: draft.questionId } : {}),
        prompt,
        questionType: draft.questionType,
        options: draft.options
          .split('\n')
          .map((entry) => entry.trim())
          .filter(Boolean),
        correctAnswer: isMulti
          ? (correctAnswers[0] ?? '')
          : draft.correctAnswer.trim(),
        ...(isMulti ? { correctAnswers } : {}),
        explanation: draft.explanation.trim() || null,
        points: Number(draft.points),
        negativePoints: Number(draft.negativePoints),
        partialMarking: draft.partialMarking,
        sectionId: draft.sectionId || null,
      })

      return reload()
    })
  }

  const removeQuestion = async (question: AuthorQuizQuestion) => {
    if (!quiz) return

    await questions.run(async () => {
      await api.deleteQuestion(
        workspaceId,
        academyId,
        courseId,
        quiz.id,
        question.id,
      )

      return reload()
    })
  }

  const editQuestion = (question: AuthorQuizQuestion) => {
    setDraft({
      questionId: question.id,
      prompt: question.prompt,
      questionType: question.questionType as QuestionType,
      options: question.options.join('\n'),
      correctAnswer: question.correctAnswer,
      correctAnswers: question.correctAnswers.join('\n'),
      explanation: question.explanation ?? '',
      points: question.points,
      negativePoints: question.negativePoints,
      partialMarking: question.partialMarking,
      sectionId: question.sectionId ?? '',
    })

    setNotice(null)
  }

  const error = settings.error ?? sections.error ?? questions.error
  const pending = settings.pending || sections.pending || questions.pending

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {notice ? <p className="text-primary text-sm">{notice}</p> : null}

      {/* ---------------------------------------------------------------- */}
      {/* Settings                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg tracking-tight">Quiz settings</h2>
          <p className="text-muted-foreground text-sm">
            {quiz
              ? 'Every field is read back from the API, so saving does not reset what you did not touch.'
              : 'This lesson has no quiz yet. Saving these settings creates one.'}
          </p>
        </div>

        <form onSubmit={saveSettings} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="quiz-title">Title</Label>
            <Input
              id="quiz-title"
              name="title"
              required
              defaultValue={quiz?.title ?? 'Quiz'}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="quiz-description">Description</Label>
            <Textarea
              id="quiz-description"
              name="description"
              rows={2}
              defaultValue={quiz?.description ?? ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quiz-passing">Passing percent</Label>
              <Input
                id="quiz-passing"
                name="passingPercent"
                type="number"
                min={0}
                max={100}
                defaultValue={quiz?.passingPercent ?? 70}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="quiz-max-attempts">Max attempts</Label>
              <Input
                id="quiz-max-attempts"
                name="maxAttempts"
                type="number"
                min={1}
                placeholder="Unlimited"
                defaultValue={quiz?.maxAttempts ?? ''}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="quiz-time-limit">Time limit (minutes)</Label>
              <Input
                id="quiz-time-limit"
                name="timeLimitMinutes"
                type="number"
                min={1}
                placeholder="Untimed"
                defaultValue={quiz?.timeLimitMinutes ?? ''}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="quiz-negative-mark">
                Negative mark per wrong
              </Label>
              <Input
                id="quiz-negative-mark"
                name="defaultNegativeMark"
                type="number"
                min={0}
                step="0.25"
                placeholder="None"
                defaultValue={quiz?.defaultNegativeMark ?? ''}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="quiz-opens">Opens</Label>
              <Input
                id="quiz-opens"
                name="opensAt"
                type="datetime-local"
                defaultValue={toLocalInput(quiz?.opensAt ?? null)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="quiz-closes">Closes</Label>
              <Input
                id="quiz-closes"
                name="closesAt"
                type="datetime-local"
                defaultValue={toLocalInput(quiz?.closesAt ?? null)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="quiz-negative"
              name="negativeMarking"
              defaultChecked={quiz?.negativeMarking ?? false}
            />
            <Label htmlFor="quiz-negative">
              Negative marking — a wrong answer costs points
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="quiz-mock"
              name="isMockTest"
              defaultChecked={quiz?.isMockTest ?? false}
            />
            <Label htmlFor="quiz-mock">Mock test</Label>
          </div>

          <div>
            <Button type="submit" disabled={pending}>
              {settings.pending
                ? 'Saving…'
                : quiz
                  ? 'Save settings'
                  : 'Create quiz'}
            </Button>
          </div>
        </form>
      </section>

      {quiz ? (
        <>
          {/* ------------------------------------------------------------ */}
          {/* Sections                                                      */}
          {/* ------------------------------------------------------------ */}
          <section className="border-border flex flex-col gap-4 border-t pt-8">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg tracking-tight">Sections</h2>
              <p className="text-muted-foreground text-sm">
                Optional. A section groups questions, which is what makes a long
                exam readable.
              </p>
            </div>

            {quiz.sections.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm">
                {quiz.sections.map((section) => (
                  <li key={section.id} className="text-muted-foreground">
                    {section.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No sections yet.</p>
            )}

            <form onSubmit={addSection} className="flex items-end gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="section-title">Add a section</Label>
                <Input
                  id="section-title"
                  value={sectionTitle}
                  onChange={(event) => setSectionTitle(event.target.value)}
                  placeholder="Part one"
                />
              </div>
              <Button type="submit" disabled={pending || !sectionTitle.trim()}>
                Add
              </Button>
            </form>
          </section>

          {/* ------------------------------------------------------------ */}
          {/* Questions                                                     */}
          {/* ------------------------------------------------------------ */}
          <section className="border-border flex flex-col gap-4 border-t pt-8">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg tracking-tight">Questions</h2>
              <p className="text-muted-foreground text-sm">
                {quiz.questions.length} question
                {quiz.questions.length === 1 ? '' : 's'}. A question somebody
                has answered cannot be deleted, because removing it would remove
                the answer from a graded attempt.
              </p>
            </div>

            {quiz.questions.length > 0 ? (
              <ol className="flex flex-col gap-3">
                {quiz.questions.map((question, index) => (
                  <li
                    key={question.id}
                    className="border-border flex flex-col gap-1 rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm font-medium">
                        {index + 1}. {question.prompt}
                      </span>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => editQuestion(question)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => removeQuestion(question)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-xs">
                      {question.questionType.toLowerCase().replace('_', ' ')} ·{' '}
                      {question.points} point{question.points === 1 ? '' : 's'}
                      {question.sectionId
                        ? ` · ${quiz.sections.find((section) => section.id === question.sectionId)?.title ?? 'section'}`
                        : ''}
                    </p>

                    {/* The answer key, staff-only, which is what makes editing possible. */}
                    <p className="text-xs">
                      <span className="text-muted-foreground">Answer: </span>
                      {question.correctAnswers.length > 0
                        ? question.correctAnswers.join(', ')
                        : question.correctAnswer}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground text-sm">No questions yet.</p>
            )}

            <form
              onSubmit={saveQuestion}
              className="border-border flex flex-col gap-4 border-t pt-6"
            >
              <h3 className="font-display text-base tracking-tight">
                {draft.questionId ? 'Edit question' : 'Add a question'}
              </h3>

              <div className="flex flex-col gap-2">
                <Label htmlFor="question-prompt">Prompt</Label>
                <Textarea
                  id="question-prompt"
                  rows={2}
                  required
                  value={draft.prompt}
                  onChange={(event) =>
                    setDraft({ ...draft, prompt: event.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="question-type">Type</Label>
                  <select
                    id="question-type"
                    className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                    value={draft.questionType}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        questionType: event.target.value as QuestionType,
                      })
                    }
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.toLowerCase().replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="question-section">Section</Label>
                  <select
                    id="question-section"
                    className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                    value={draft.sectionId}
                    onChange={(event) =>
                      setDraft({ ...draft, sectionId: event.target.value })
                    }
                  >
                    <option value="">No section</option>
                    {quiz.sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {draft.questionType === 'MULTIPLE_CHOICE' ||
              draft.questionType === 'MULTI_SELECT' ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="question-options">Options</Label>
                  <Textarea
                    id="question-options"
                    rows={4}
                    value={draft.options}
                    onChange={(event) =>
                      setDraft({ ...draft, options: event.target.value })
                    }
                  />
                  <p className="text-muted-foreground text-xs">One per line.</p>
                </div>
              ) : null}

              {draft.questionType === 'MULTI_SELECT' ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="question-answers">Correct options</Label>
                  <Textarea
                    id="question-answers"
                    rows={3}
                    required
                    value={draft.correctAnswers}
                    onChange={(event) =>
                      setDraft({ ...draft, correctAnswers: event.target.value })
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    One per line, exactly as written in the options.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="question-answer">Correct answer</Label>
                  {draft.questionType === 'TRUE_FALSE' ? (
                    <select
                      id="question-answer"
                      className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                      value={draft.correctAnswer}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          correctAnswer: event.target.value,
                        })
                      }
                    >
                      <option value="">Choose…</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <Input
                      id="question-answer"
                      required
                      inputMode={
                        draft.questionType === 'INTEGER' ? 'numeric' : 'text'
                      }
                      value={draft.correctAnswer}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          correctAnswer: event.target.value,
                        })
                      }
                    />
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="question-explanation">Explanation</Label>
                <Textarea
                  id="question-explanation"
                  rows={2}
                  value={draft.explanation}
                  onChange={(event) =>
                    setDraft({ ...draft, explanation: event.target.value })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Shown to a learner after they answer, along with the key.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="question-points">Points</Label>
                  <Input
                    id="question-points"
                    type="number"
                    min={0}
                    value={draft.points}
                    onChange={(event) =>
                      setDraft({ ...draft, points: Number(event.target.value) })
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="question-negative">Negative points</Label>
                  <Input
                    id="question-negative"
                    type="number"
                    min={0}
                    step="0.25"
                    value={draft.negativePoints}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        negativePoints: Number(event.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="question-partial"
                  checked={draft.partialMarking}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, partialMarking: checked })
                  }
                />
                <Label htmlFor="question-partial">
                  Partial marking — award credit for some of a multi-select
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={pending || !draft.prompt.trim()}
                >
                  {questions.pending
                    ? 'Saving…'
                    : draft.questionId
                      ? 'Save question'
                      : 'Add question'}
                </Button>

                {draft.questionId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraft(EMPTY_QUESTION)}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </section>
        </>
      ) : null}
    </div>
  )
}
