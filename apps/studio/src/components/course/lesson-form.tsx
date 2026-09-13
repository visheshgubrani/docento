'use client'

import { useState } from 'react'

import type { LessonSummary } from '@docento/sdk'

import { browserApiClient } from '@/lib/client-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAsyncAction } from '@/hooks/use-async-action'

/**
 * Edit a lesson's content.
 *
 * ## Why the body is edited even for a video lesson
 *
 * `contentType` describes what the lesson *is* — the thing a learner is expected
 * to watch, read or do — while the body is the note that goes with it:
 * a transcript, a chapter list, the instructions for an assignment. They are not
 * alternatives, so the body field is always present rather than shown
 * conditionally on a type the operator may still change.
 *
 * ## Why a save reports success in words
 *
 * `lesson.update` is not idempotent-keyed — it is an update to a known row, so a
 * repeat is the same state rather than a second lesson — which means the button
 * has no `unchanged` flag to report. What it does have is a silent-success failure
 * mode: a form that saves and says nothing looks identical to one that did
 * nothing, so it says something.
 */
export function LessonForm({
  workspaceId,
  academyId,
  courseId,
  lesson,
}: {
  workspaceId: string
  academyId: string
  courseId: string
  lesson: LessonSummary
}) {
  const [title, setTitle] = useState(lesson.title)
  const [summary, setSummary] = useState(lesson.summary ?? '')
  const [body, setBody] = useState(lesson.body ?? '')
  const [embedUrl, setEmbedUrl] = useState(lesson.embedUrl ?? '')
  const [isFree, setIsFree] = useState(lesson.isFree)
  const [saved, setSaved] = useState(false)

  const save = useAsyncAction({
    keyPrefix: 'lesson-update',
    onSuccess: () => setSaved(true),
  })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaved(false)

    const trimmed = title.trim()
    if (!trimmed) return

    await save.run(() =>
      browserApiClient(workspaceId).updateLesson(
        workspaceId,
        academyId,
        courseId,
        lesson.id,
        {
          title: trimmed,
          summary: summary.trim() || null,
          body: body.trim() || null,
          /**
           * An empty field means "no embed", not "an embed with no address".
           * Sending `''` would fail the contract's URL check, and sending the
           * previous value would make the field impossible to clear.
           */
          embedUrl: embedUrl.trim() || null,
          isFree,
        },
      ),
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="lesson-title">Title</Label>
        <Input
          id="lesson-title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="lesson-summary">Summary</Label>
        <Textarea
          id="lesson-summary"
          rows={2}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Shown in the course outline, before a learner opens the lesson.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="lesson-body">Body</Label>
        <Textarea
          id="lesson-body"
          rows={16}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Markdown. For a video lesson this is the notes or transcript that goes
          with it.
        </p>
      </div>

      {lesson.contentType === 'EMBED' || embedUrl ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="lesson-embed">Embed address</Label>
          <Input
            id="lesson-embed"
            type="url"
            value={embedUrl}
            onChange={(event) => setEmbedUrl(event.target.value)}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Switch id="lesson-free" checked={isFree} onCheckedChange={setIsFree} />
        <Label htmlFor="lesson-free">
          Free preview — readable before enrolling
        </Label>
      </div>

      {save.error ? (
        <p role="alert" className="text-sm text-red-600">
          {save.error}
        </p>
      ) : null}

      {saved ? <p className="text-primary text-sm">Saved.</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={save.pending || !title.trim()}>
          {save.pending ? 'Saving…' : 'Save lesson'}
        </Button>
        {lesson.contentType === 'QUIZ' ? (
          <span className="text-muted-foreground text-sm">
            The quiz itself is authored further down this page.
          </span>
        ) : null}

        {lesson.contentType === 'ASSIGNMENT' ? (
          <span className="text-muted-foreground text-sm">
            The assignment brief is authored further down this page.
          </span>
        ) : null}
      </div>
    </form>
  )
}
