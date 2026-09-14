'use client'

import { useState } from 'react'
import Link from 'next/link'

import type { OutlineLesson } from '@docento/sdk'
import { Button, Input, Label } from '@docento/ui'

import { browserApiClient } from '@/lib/client-api'
import { useAsyncAction } from '@/hooks/use-async-action'

/**
 * The draft curriculum: modules, their lessons, and adding to both.
 *
 * ## Why adding a lesson is a small inline form
 *
 * Building a course is dozens of small additions, so the cost of adding one has
 * to be a few keystrokes — a modal or a separate page per lesson turns an
 * afternoon's authoring into an afternoon of navigating. The lesson's body, quiz
 * and assignment are edited on the lesson's own page, because those are long
 * forms and not what this list is for.
 *
 * ## Why the module selector is a `<select>`
 *
 * Adding a lesson needs a module, and with the modules already listed above,
 * restating the choice in a text field would be asking the operator to type an
 * identifier they can see. The select is a controlled value so the common case —
 * adding several lessons to the same module — needs no re-selection.
 */
export type DraftModule = {
  id: string
  title: string
  summary: string | null
  position: number
  lessons?: OutlineLesson[]
}

export function ModuleList({
  workspaceId,
  academyId,
  courseId,
  modules,
}: {
  workspaceId: string
  academyId: string
  courseId: string
  modules: DraftModule[]
}) {
  const [moduleTitle, setModuleTitle] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonType, setLessonType] = useState('TEXT')
  const [targetModule, setTargetModule] = useState(modules[0]?.id ?? '')

  const addModule = useAsyncAction({ keyPrefix: 'module-create' })
  const addLesson = useAsyncAction({ keyPrefix: 'lesson-create' })

  const submitModule = async (event: React.FormEvent) => {
    event.preventDefault()

    const title = moduleTitle.trim()
    if (!title) return

    await addModule.run((idempotencyKey) =>
      browserApiClient(workspaceId).createModule(
        workspaceId,
        academyId,
        courseId,
        { title },
        idempotencyKey,
      ),
    )

    setModuleTitle('')
  }

  const submitLesson = async (event: React.FormEvent) => {
    event.preventDefault()

    const title = lessonTitle.trim()
    if (!title || !targetModule) return

    await addLesson.run((idempotencyKey) =>
      browserApiClient(workspaceId).createLesson(
        workspaceId,
        academyId,
        courseId,
        targetModule,
        { title, contentType: lessonType as LessonContentType },
        idempotencyKey,
      ),
    )

    setLessonTitle('')
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-xl tracking-tight">Curriculum</h2>

      {modules.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No modules yet. A course is a list of modules, and a module is a list
          of lessons.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {modules.map((module, index) => (
            <li
              key={module.id}
              className="border-border flex flex-col gap-3 rounded-lg border p-5"
            >
              <header className="flex items-baseline justify-between gap-4">
                <h3 className="font-medium">
                  <span className="text-muted-foreground mr-2 text-sm">
                    {index + 1}.
                  </span>
                  {module.title}
                </h3>
                <span className="text-muted-foreground text-xs">
                  {(module.lessons ?? []).length} lesson
                  {(module.lessons ?? []).length === 1 ? '' : 's'}
                </span>
              </header>

              {(module.lessons ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No lessons in this module yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {(module.lessons ?? []).map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/w/${workspaceId}/a/${academyId}/c/${courseId}/l/${lesson.id}`}
                        className="hover:bg-muted/50 flex items-center justify-between gap-4 rounded px-3 py-2 text-sm transition-colors"
                      >
                        <span>{lesson.title}</span>
                        <span className="text-muted-foreground text-xs tracking-wide uppercase">
                          {lesson.contentType.toLowerCase()}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={submitModule} className="flex flex-col gap-3">
        <Label htmlFor="module-title">Add a module</Label>
        <div className="flex gap-2">
          <Input
            id="module-title"
            placeholder="Getting started"
            value={moduleTitle}
            onChange={(event) => setModuleTitle(event.target.value)}
          />
          <Button
            type="submit"
            disabled={addModule.pending || !moduleTitle.trim()}
          >
            {addModule.pending ? 'Adding…' : 'Add'}
          </Button>
        </div>
        {addModule.error ? (
          <p role="alert" className="text-sm text-red-600">
            {addModule.error}
          </p>
        ) : null}
      </form>

      {modules.length > 0 ? (
        <form onSubmit={submitLesson} className="flex flex-col gap-3">
          <Label htmlFor="lesson-title">Add a lesson</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="lesson-title"
              className="min-w-48 flex-1"
              placeholder="What is a widget?"
              value={lessonTitle}
              onChange={(event) => setLessonTitle(event.target.value)}
            />
            <select
              aria-label="Module"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={targetModule}
              onChange={(event) => setTargetModule(event.target.value)}
            >
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
            <select
              aria-label="Lesson type"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={lessonType}
              onChange={(event) => setLessonType(event.target.value)}
            >
              {LESSON_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.toLowerCase()}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              disabled={addLesson.pending || !lessonTitle.trim()}
            >
              {addLesson.pending ? 'Adding…' : 'Add'}
            </Button>
          </div>
          {addLesson.error ? (
            <p role="alert" className="text-sm text-red-600">
              {addLesson.error}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  )
}

/**
 * The lesson types the API accepts.
 *
 * A local copy rather than an import from `@docento/contracts`: the registry
 * describes the enum inside a schema, and deriving the list from Zod at runtime
 * would put the contracts' internals in the browser bundle to save five strings
 * that the API refuses if they drift — loudly, at creation, which is the right
 * place to find out.
 */
export const LESSON_TYPES = [
  'TEXT',
  'VIDEO',
  'FILE',
  'EMBED',
  'QUIZ',
  'ASSIGNMENT',
] as const

export type LessonContentType = (typeof LESSON_TYPES)[number]
