import { StorySequence } from '@/components/motion/story-sequence'
import { Section, SectionIntro } from '@/components/section'
import { storyChapters } from '@/content/landing'

import { AcademyFrame, CatalogFrame } from '../previews/academy-frame'
import { AuthoringPanel } from '../previews/authoring-panel'
import { ProgressFrame } from '../previews/progress-frame'

/**
 * The product story: the page's signature sequence.
 *
 * The three previews are passed to the client component as already-rendered
 * nodes, which is what keeps the section server-rendered: only the chapter list
 * and the active chapter live on the client, and the previews arrive as part of
 * the RSC payload rather than as three client components carrying their content
 * with them.
 *
 * `panels` and `storyChapters` are written next to each other rather than zipped
 * at the point of use, so adding a chapter without a preview is visible in one
 * place instead of producing an empty column.
 */
const panels = [
  <AuthoringPanel key="create" />,
  <CatalogFrame key="learn" />,
  <ProgressFrame key="progress" />,
]

/**
 * The learner lesson at full size, for the second chapter's closing frame.
 *
 * Exported because the hero shows the compact crop of the same component: one
 * tree, two presentations, so a change to the lesson cannot leave the hero
 * depicting a screen that no longer exists.
 */
export function LearnerReference() {
  return <AcademyFrame />
}

export function ProductStory() {
  return (
    <Section id="product" labelledBy="product-heading">
      <SectionIntro
        id="product-heading"
        eyebrow="The product"
        title="From your first lesson to their next milestone."
        intro="One path, in three parts: write the course, give it a home your learners recognize, and make what they have done visible — to them, and to anyone they show it to."
      />

      <div className="mt-12 flex flex-col gap-8 lg:mt-16">
        <p className="text-ink-muted max-w-[70ch] text-xs leading-relaxed">
          The compositions below are interface previews: they show how the
          product works rather than being screenshots of it. What each one can
          do today is labelled beside it.
        </p>

        <StorySequence chapters={storyChapters} panels={panels} />
      </div>
    </Section>
  )
}
