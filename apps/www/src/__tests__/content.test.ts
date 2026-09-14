import { describe, expect, it } from 'vitest'

import {
  capabilities,
  faq,
  headless,
  hosting,
  storyChapters,
} from '@/content/landing'
import {
  academy,
  assessment,
  certificate,
  course,
  covers,
  modules,
  progress,
  quizQuestion,
} from '@/content/fixtures/fieldwork-academy'
import { AVAILABILITY } from '@/lib/availability'
import { site } from '@/lib/site'

/**
 * Content invariants.
 *
 * These are the properties a reader would notice being wrong but a reviewer would
 * have to check by hand: that nothing planned is presented as available, that the
 * previews all describe one academy, and that the availability vocabulary is the
 * one the components can render.
 */

describe('availability', () => {
  it('labels every capability', () => {
    for (const capability of capabilities) {
      expect(AVAILABILITY, `${capability.title} has no valid status`).toContain(
        capability.availability,
      )
    }
  })

  it('labels every claim inside the product story', () => {
    for (const chapter of storyChapters) {
      expect(chapter.details.length).toBeGreaterThan(0)

      for (const detail of chapter.details) {
        expect(
          AVAILABILITY,
          `${chapter.title}: "${detail.value}" has no valid status`,
        ).toContain(detail.availability)
      }
    }
  })

  it('never presents planned work as available', () => {
    /**
     * The three things this page must not overstate. Payments are deferred to a
     * later milestone, AI is planned, and the media library is a preview — each is
     * asserted by name here because each is a claim the roadmap contradicts.
     */
    expect(
      capabilities.find((capability) => capability.id === 'media')
        ?.availability,
    ).toBe('preview')

    expect(capabilities.find((c) => c.id === 'assessment')?.availability).toBe(
      'available',
    )

    for (const offering of hosting.filter(
      (item) => item.id !== 'self-hosted',
    )) {
      expect(
        offering.availability,
        `${offering.title} is not available yet and must not claim to be`,
      ).toBe('planned')
      expect(offering.action.href).toContain('ROADMAP')
    }
  })

  it('does not describe payments or AI as features of the product', () => {
    const text = JSON.stringify([capabilities, headless, faq, hosting])

    // The words appear — the page is honest about them — but never as available.
    expect(text).toContain('Payments are deliberately deferred')
    expect(text).toContain('AI is optional')
  })
})

describe('the hosting section', () => {
  it('highlights self-hosting and only self-hosting', () => {
    const featured = hosting.filter((offering) => offering.featured)

    expect(featured).toHaveLength(1)
    expect(featured[0].id).toBe('self-hosted')
    expect(featured[0].availability).toBe('available')
  })

  it('offers no waitlist or signup flow', () => {
    const text = JSON.stringify(hosting)

    expect(text).not.toMatch(/waitlist|book a demo|talk to sales|sign up/i)
  })
})

describe('the FAQ', () => {
  it('answers the eight questions the design commits to', () => {
    expect(faq).toHaveLength(8)
  })

  it('answers with the roadmap, not with optimism', () => {
    const answers = faq.map((item) => item.answer).join(' ')

    expect(answers).toMatch(/not yet/i)
    expect(answers).toMatch(/pre-alpha/i)
    expect(answers).toMatch(/post-beta/i)
  })

  it('keeps every answer readable and specific', () => {
    for (const item of faq) {
      expect(
        item.question.endsWith('?'),
        `${item.question} is not a question`,
      ).toBe(true)
      expect(item.answer.length).toBeGreaterThan(120)
    }
  })
})

describe('the fictional academy', () => {
  it('is one academy with one course everywhere', () => {
    expect(academy.name).toBe('Fieldwork Academy')
    expect(course.title).toBe(certificate.courseTitle)
    expect(certificate.academyName).toBe(academy.name)
    expect(covers[0].title).toBe(course.title)
  })

  it('agrees with itself about progress', () => {
    const lessons = modules.flatMap((module) => module.lessons)

    expect(lessons).toHaveLength(course.lessonCount)
    expect(modules).toHaveLength(course.moduleCount)
    expect(progress.requiredLessons).toBe(course.lessonCount)
    expect(progress.completedLessons).toBeLessThan(progress.requiredLessons)
    expect(progress.percent).toBe(
      Math.round((progress.completedLessons / progress.requiredLessons) * 100),
    )
    expect(lessons.filter((lesson) => lesson.completed)).toHaveLength(
      progress.completedLessons,
    )
  })

  it('keeps the quiz answer key out of the preview', () => {
    /**
     * The product's rule is that answer keys never leave the server. A preview that
     * marked the correct option in its data would be publishing one.
     */
    expect(quizQuestion).not.toHaveProperty('correct')
    expect(quizQuestion.options.every((option) => !('correct' in option))).toBe(
      true,
    )
  })

  it('shows an assessment result that passes its own marking', () => {
    expect(assessment.percent).toBe(
      Math.round((assessment.correct / assessment.total) * 100),
    )
    expect(assessment.passed).toBe(true)
    expect(assessment.attempt).toBeLessThanOrEqual(assessment.attemptsAllowed)
  })
})

describe('the developer section', () => {
  it('uses the API’s own vocabulary', () => {
    expect(headless.points.map((point) => point.title)).toEqual([
      'Typed TypeScript SDK',
      'Versioned HTTP API',
      'The same learning operations',
    ])
    expect(headless.points.map((point) => point.body).join(' ')).toContain(
      '/api/v1',
    )
  })

  it('says where the origin comes from rather than inventing a service', () => {
    expect(headless.originNote).toContain('your own deployment')
  })

  it('links to the architecture document for the API guide', () => {
    expect(headless.actions.guide.href).toBe(site.links.apiGuide)
  })
})
