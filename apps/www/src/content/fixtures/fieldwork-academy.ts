/**
 * One fictional academy, described once.
 *
 * Every preview on the page — the hero, all three chapters of the product story,
 * the capability cards, the certificate detail — draws from this file. A page
 * whose hero teaches "The fundamentals of visual storytelling" and whose second
 * chapter teaches something else is a page that reads as a collage of unrelated
 * screenshots, and the difference between a product story and a feature list is
 * exactly that consistency.
 *
 * The shapes match the real contracts in `packages/contracts`
 * (`CatalogCourse`, `ProgressSummary`, `LearnerLesson`), so a preview that would
 * not survive contact with the API is visible here rather than in the design.
 *
 * None of this is real. Fieldwork Academy does not exist, Maya Okafor does not
 * exist, and the certificate id verifies nothing.
 */

export const academy = {
  name: 'Fieldwork Academy',
  slug: 'fieldwork',
  /** The academy's own colour, which is what a learner's experience is themed by. */
  brandingColor: '#245440',
  supportEmail: 'hello@fieldwork.example',
} as const

export const learner = {
  name: 'Maya Okafor',
  initials: 'MO',
} as const

export const course = {
  id: 'crs_fieldwork_visual_storytelling',
  slug: 'visual-storytelling',
  title: 'The fundamentals of visual storytelling',
  description:
    'Six weeks of looking closely: framing, light, sequence, and what a finished piece owes the person watching it.',
  lessonCount: 7,
  moduleCount: 3,
} as const

export type FixtureLesson = {
  id: string
  title: string
  kind: 'Video' | 'Reading' | 'Practice' | 'Quiz'
  duration: string
  completed: boolean
}

export type FixtureModule = {
  id: string
  title: string
  lessons: FixtureLesson[]
}

export const modules: FixtureModule[] = [
  {
    id: 'mod_framing',
    title: 'Framing a story',
    lessons: [
      {
        id: 'lsn_frame_argument',
        title: 'Why a frame is an argument',
        kind: 'Video',
        duration: '9 min',
        completed: true,
      },
      {
        id: 'lsn_reading_light',
        title: 'Reading light',
        kind: 'Video',
        duration: '12 min',
        completed: true,
      },
      {
        id: 'lsn_three_frames',
        title: 'Practice: three frames, one subject',
        kind: 'Practice',
        duration: '30 min',
        completed: true,
      },
    ],
  },
  {
    id: 'mod_sequencing',
    title: 'Sequencing',
    lessons: [
      {
        id: 'lsn_cut_sentence',
        title: 'The cut as a sentence',
        kind: 'Video',
        duration: '14 min',
        completed: false,
      },
      {
        id: 'lsn_pacing',
        title: 'Pacing a sequence',
        kind: 'Reading',
        duration: '8 min',
        completed: false,
      },
    ],
  },
  {
    id: 'mod_publishing',
    title: 'Publishing your work',
    lessons: [
      {
        id: 'lsn_subject',
        title: 'Choosing a subject you can finish',
        kind: 'Video',
        duration: '11 min',
        completed: true,
      },
      {
        id: 'lsn_checkpoint',
        title: 'Checkpoint: storytelling',
        kind: 'Quiz',
        duration: '10 min',
        completed: false,
      },
    ],
  },
]

/** The lesson the hero's learner frame is showing. */
export const currentLesson = {
  id: 'lsn_cut_sentence',
  title: 'The cut as a sentence',
  moduleTitle: 'Sequencing',
  position: 1,
  of: 2,
  summary:
    'A cut is not a punctuation mark you place after the fact. It is the moment two shots are asked to mean something together that neither meant alone.',
  body: [
    'Watch the first ninety seconds twice. The first time, follow the subject. The second, count the cuts and notice where the camera moved and where it did not.',
    'Most beginner sequences cut when the subject moves. Better ones cut when the audience is ready to move — which is usually a beat earlier or a beat later than the subject does.',
  ],
} as const

/**
 * `ProgressSummary` as the API returns it.
 *
 * The numbers agree with the lessons above — four finished of seven, which is the
 * 57% the learner frame shows. A preview whose progress bar and lesson ticks
 * disagree is the kind of detail a reader notices without being able to say why,
 * so `content.test.ts` derives one from the other rather than trusting them to
 * stay in step.
 */
export const progress = {
  requiredLessons: 7,
  completedLessons: 4,
  percent: 57,
  isComplete: false,
} as const

/** The assessment result shown in the third chapter. */
export const assessment = {
  title: 'Checkpoint: storytelling',
  correct: 8,
  total: 10,
  percent: 80,
  passed: true,
  attempt: 1,
  attemptsAllowed: 3,
} as const

/** The certificate detail, including the id a stranger could verify. */
export const certificate = {
  verificationId: 'FLW-2M4K-8Q1P',
  issuedOn: '12 March 2026',
  courseTitle: course.title,
  academyName: academy.name,
} as const

/** A quiz question, with the answer key deliberately absent. */
export const quizQuestion = {
  prompt:
    'A sequence cuts away from a face at the moment the decision is made. What does the cut do?',
  options: [
    { id: 'a', label: 'It withholds the consequence for one beat' },
    { id: 'b', label: 'It tells the audience the scene has ended' },
    { id: 'c', label: 'It establishes where the next scene happens' },
  ],
  chosen: 'a',
} as const

/** A lesson asset, as the media library lists it. */
export const mediaAsset = {
  fileName: 'lesson-02-light.mp4',
  size: '184 MB',
  progress: 62,
  status: 'Uploading',
} as const

/** The catalogue, in the order a learner sees it. */
export const catalog = [
  { title: course.title, lessons: 7, modules: 3, current: true },
  {
    title: 'Field notes: light and shadow',
    lessons: 4,
    modules: 2,
    current: false,
  },
  { title: 'Sequencing and rhythm', lessons: 5, modules: 2, current: false },
] as const

/**
 * The three course covers, drawn as vector artwork rather than photographed.
 *
 * Each is a palette plus a composition, and they are generated from this data so
 * that the covers in the hero, the catalogue and the story chapter are visibly a
 * set.
 */
export const covers = [
  { id: 'storytelling', title: course.title, palette: 'forest' },
  {
    id: 'field-notes',
    title: 'Field notes: light and shadow',
    palette: 'ochre',
  },
  { id: 'sequencing', title: 'Sequencing and rhythm', palette: 'sage' },
] as const

export type CoverPalette = (typeof covers)[number]['palette']
