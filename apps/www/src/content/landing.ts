import { claim, type Claim } from '@/lib/availability'
import { site } from '@/lib/site'

/**
 * The page's words and the availability of the thing behind them.
 *
 * Everything a section renders comes from here rather than from JSX, for the
 * same reason availability is data: a page whose claims live inside markup is a
 * page whose claims cannot be checked. `content.test.ts` walks this file.
 */

export const announcement = {
  text: 'Pre-alpha, built in the open.',
  cta: 'Follow the roadmap',
} as const

export const hero = {
  headline: 'A home for everything you teach.',
  /** The phrase set in italic serif; the rest of the headline is roman. */
  emphasis: 'everything you teach',
  standfirst:
    'Create courses, guide learners, and build an academy you own. Docento is an open-source learning platform with a ready-to-use learner experience and headless APIs for building your own.',
  supporting: ['Open source', 'Fully usable self-hosting', 'Headless APIs'],
  availabilityNote: 'Pre-alpha. Explore what’s ready and what’s next.',
  actions: {
    primary: { label: 'Start self-hosting', href: site.links.selfHost },
    secondary: { label: 'Explore the product', href: site.anchors.product },
  },
  /**
   * The commercial position, stated once and plainly. There is no proprietary
   * edition, so there is nothing to upsell and no comparison table to draw.
   */
  commercial: {
    headline: 'The whole product. Your choice of hosting.',
    body: 'Self-host the complete application with no software subscription. Managed cloud and enterprise services are planned.',
  },
} as const

export const ownership: { title: string; body: string }[] = [
  {
    title: 'Your academy',
    body: 'A learning experience with your name, your courses and your voice — not a platform’s.',
  },
  {
    title: 'Your infrastructure',
    body: 'The complete application runs on your own server, against one database, with no software subscription.',
  },
  {
    title: 'Your frontend',
    body: 'Use the applications as they are, or build your own against a versioned, typed API.',
  },
]

export type StoryChapter = {
  id: string
  number: string
  title: string
  body: string
  preview: 'authoring' | 'learner' | 'progress'
  /** What the preview shows, listed rather than asserted in prose. */
  details: Claim<string>[]
}

export const storyChapters: StoryChapter[] = [
  {
    id: 'create',
    number: '01',
    title: 'Create with structure',
    body: 'Outline a course into modules and lessons, write in a real editor, and keep the draft and the published release apart. Publishing is a release, not a save.',
    preview: 'authoring',
    details: [
      claim('Course outline with modules and lessons', 'available'),
      claim('Lesson editor with autosave', 'available'),
      claim('Publish, and a release history you can read', 'available'),
    ],
  },
  {
    id: 'learn',
    number: '02',
    title: 'Give learning a home',
    body: 'Learners see your academy: a catalogue of your courses, a focused lesson experience with the curriculum beside it, and progress that follows them back.',
    preview: 'learner',
    details: [
      claim('Academy catalogue with your branding', 'available'),
      claim('Lesson player with collapsible curriculum', 'available'),
      claim('Progress computed against the published release', 'available'),
    ],
  },
  {
    id: 'progress',
    number: '03',
    title: 'Make progress visible',
    body: 'Quizzes and assignments are marked, completion is computed server-side, and a Certificate a stranger can verify by its id.',
    preview: 'progress',
    details: [
      claim('Quiz and assignment results', 'available'),
      claim('Per-lesson completion history', 'available'),
      claim('Public certificate verification', 'available'),
    ],
  },
]

export type Capability = {
  id: string
  title: string
  body: string
  availability: Claim<string>['availability']
  /** Which compact UI detail the card shows instead of a generic icon. */
  detail:
    'quiz' | 'upload' | 'certificate' | 'progress' | 'outline' | 'identity'
}

export const capabilities: Capability[] = [
  {
    id: 'authoring',
    title: 'Course authoring',
    body: 'Modules, lessons and their order, with drafts that stay drafts until you publish them as a release.',
    availability: 'available',
    detail: 'outline',
  },
  {
    id: 'identity',
    title: 'Academy identity',
    body: 'Name, mark, colours and support address belong to the academy, so a learner never sees the platform’s brand.',
    availability: 'available',
    detail: 'identity',
  },
  {
    id: 'assessment',
    title: 'Quizzes and assignments',
    body: 'Sections, negative marking, attempt limits and time windows; written work is marked by a person, in the product.',
    availability: 'available',
    detail: 'quiz',
  },
  {
    id: 'progress',
    title: 'Learner progress',
    body: 'Completion is computed on the server from the release, so it cannot be claimed by a client that never opened the lesson.',
    availability: 'available',
    detail: 'progress',
  },
  {
    id: 'media',
    title: 'Media and lesson content',
    body: 'Storage, serving and entitlement checked on every request are available over the API. The library screen is a preview.',
    availability: 'preview',
    detail: 'upload',
  },
  {
    id: 'certificates',
    title: 'Certificates and verification',
    body: 'A certificate with a public verification page: an id, a date, and an academy name anyone can check.',
    availability: 'available',
    detail: 'certificate',
  },
]

export const roadmapCallout = {
  eyebrow: 'Next',
  title: 'AI assistance, with you in control.',
  body: 'Reviewed authoring — a brief or source material into a draft outline you edit before anything publishes — and a course-grounded tutor that cites the material it used.',
  availability: 'planned' as const,
  action: { label: 'Read the roadmap', href: site.links.roadmap },
}

export const headless = {
  eyebrow: 'Headless',
  headline: 'Your application. Docento underneath.',
  body: 'Integrate courses, enrolment, progress, assessments and certificates into the application you already have. The API the product uses is the API you get: same operations, same authorization, same release model.',
  points: [
    {
      title: 'Typed TypeScript SDK',
      body: 'Generated from the same Zod contracts that produce the OpenAPI document.',
    },
    {
      title: 'Versioned HTTP API',
      body: 'One versioned surface at /api/v1, with stable error codes and cursor pagination.',
    },
    {
      title: 'The same learning operations',
      body: 'Studio and Learn are clients of it. Nothing is available to the product and withheld from you.',
    },
  ],
  originNote:
    'The origin and academy identifier in the example come from your own deployment. Nothing here reaches a Docento service.',
  actions: {
    guide: { label: 'Read the API guide', href: site.links.apiGuide },
    source: { label: 'View SDK source', href: site.links.sdkSource },
  },
  relationship: [
    { id: 'app', label: 'Your application' },
    { id: 'api', label: 'Docento API' },
    { id: 'records', label: 'Learning records' },
  ],
} as const

export type HostingCard = {
  id: string
  title: string
  body: string
  availability: Claim<string>['availability']
  action: { label: string; href: string }
  featured?: boolean
}

export const hosting: HostingCard[] = [
  {
    id: 'self-hosted',
    title: 'Self-hosted',
    body: 'Free software, and the complete application. Run it on your infrastructure; hosting and any optional providers are your own costs.',
    availability: 'available',
    action: { label: 'Start self-hosting', href: site.links.selfHost },
    featured: true,
  },
  {
    id: 'cloud',
    title: 'Docento Cloud',
    body: 'Managed hosting for the same application, with the same features and the same API. Pricing to be announced.',
    availability: 'planned',
    action: { label: 'Follow cloud progress', href: site.links.roadmap },
  },
  {
    id: 'enterprise',
    title: 'Enterprise services',
    body: 'Deployment assistance, support and operational services around the same product. No enterprise-only edition exists.',
    availability: 'planned',
    action: { label: 'View the roadmap', href: site.links.roadmap },
  },
]

export const openSource = {
  headline: 'Built in the open. Yours to build on.',
  body: 'The complete application is open source and development happens in public: the roadmap, the architecture decisions and the work in progress are all in the repository.',
  licence: {
    application: 'Application packages are AGPL-3.0',
    permissive: 'Contracts and SDK are Apache-2.0',
    reason:
      'so they stay usable in proprietary software. Dependency direction is one-way and a test fails the build if it is reversed.',
    links: [
      { label: 'AGPL-3.0 licence', href: site.links.licence },
      {
        label: 'packages/contracts (Apache-2.0)',
        href: site.links.licenceContracts,
      },
      { label: 'packages/sdk (Apache-2.0)', href: site.links.licenceSdk },
    ],
  },
  actions: {
    source: { label: 'Read the source', href: site.repository },
    contributing: { label: 'Contributing', href: site.links.contributing },
    roadmap: { label: 'Roadmap', href: site.links.roadmap },
    security: { label: 'Security', href: site.links.security },
  },
  /**
   * The repository panel: a real tree of the top level, so a visitor can see the
   * shape of the product. Nothing in it is illustrative.
   */
  tree: [
    { path: 'apps/www', note: 'this site' },
    { path: 'apps/studio', note: 'authoring' },
    { path: 'apps/learn', note: 'learner experience' },
    { path: 'apps/api', note: 'HTTP surface' },
    { path: 'apps/worker', note: 'durable jobs' },
    { path: 'apps/docs', note: 'documentation' },
    { path: 'packages/domain', note: 'business rules' },
    { path: 'packages/contracts', note: 'Apache-2.0' },
    { path: 'packages/sdk', note: 'Apache-2.0' },
    { path: 'packages/ui', note: 'design system' },
  ],
} as const

export const faq: { question: string; answer: string }[] = [
  {
    question: 'Is the self-hosted version fully usable?',
    answer:
      'It is the whole product: there is no proprietary edition and nothing is held back for a paid tier. It is also pre-alpha, so “fully usable” means the free learning loop works end to end — author, publish, enrol, learn, be assessed, certify, verify — while the interface for parts of it is still being built.',
  },
  {
    question: 'What costs remain when self-hosting?',
    answer:
      'The software has no subscription. You pay for wherever you run it, and for any provider you choose to connect — object storage, a video service, an AI endpoint. None of those is required: the default install stores media on the filesystem, plays it in the browser, and has no external AI configured.',
  },
  {
    question: 'What is available during pre-alpha?',
    answer:
      'Workspaces and academies, course authoring with modules and lessons, publishing as immutable releases, enrolment, lesson progress, quizzes and assignments including grading, media with entitlement checked on every request, and certificates that anyone can verify. Payments, managed cloud and AI are not available yet.',
  },
  {
    question: 'Can I use my own frontend?',
    answer:
      'Yes, and it is a first-class path rather than an escape hatch. The API is versioned at /api/v1 and described by Zod contracts which generate both the OpenAPI document and the TypeScript SDK. Studio and Learn in this repository are clients of that API, so the path is exercised by the product itself.',
  },
  {
    question: 'How will managed cloud differ?',
    answer:
      'It will run the same application, with the same features and the same API. What you would be buying is operation — upgrades, backups and the infrastructure around it — not a different product. The commercial model here is hosting and support, so there is no edition to upgrade to.',
  },
  {
    question: 'Are AI features required?',
    answer:
      'No. AI is optional and bounded: no AI feature errors when it is unconfigured, a workspace sets its own budget, and an academy can switch it off without a deploy. Planned authoring assistance produces a draft outline that a person reviews and edits before anything is published.',
  },
  {
    question: 'Can I sell courses today?',
    answer:
      'Not yet. Payments are deliberately deferred: the free learning loop is being finished and proven first, because a checkout on top of a loop that is not proven is two problems to debug at once. The groundwork is in place — entitlement is a model of its own, separate from enrolment — so a payment becomes another way to grant access rather than a change to how access is checked.',
  },
  {
    question: 'Does Docento support SCORM or enterprise SSO?',
    answer:
      'Not yet, and both are post-beta. SCORM and xAPI need a learning record store, which is a substantial integration; SAML, OIDC and SCIM are enterprise operations that follow a reliable self-hosted product rather than precede it. Both are on the roadmap rather than on the page as features.',
  },
]

export const closing = {
  headline: 'Make room for what you know.',
  body: 'Start building an academy you can make your own.',
  actions: {
    primary: { label: 'Start self-hosting', href: site.links.selfHost },
    secondary: { label: 'Explore the API', href: site.anchors.developers },
  },
} as const

export const footerGroups: {
  title: string
  links: { label: string; href: string; external?: boolean }[]
}[] = [
  {
    title: 'Product',
    links: [
      { label: 'What it does', href: site.anchors.product },
      { label: 'Hosting', href: site.anchors.hosting },
      { label: 'Roadmap', href: site.links.roadmap, external: true },
      { label: 'Releases', href: site.links.releases, external: true },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Headless API', href: site.anchors.developers },
      { label: 'Documentation', href: site.docs, external: true },
      { label: 'API guide', href: site.links.apiGuide, external: true },
      { label: 'SDK source', href: site.links.sdkSource, external: true },
      { label: 'Architecture', href: site.links.architecture, external: true },
    ],
  },
  {
    title: 'Open Source',
    links: [
      { label: 'Repository', href: site.repository, external: true },
      { label: 'Contributing', href: site.links.contributing, external: true },
      { label: 'Governance', href: site.links.governance, external: true },
      { label: 'Security', href: site.links.security, external: true },
      { label: 'Licence (AGPL-3.0)', href: site.links.licence, external: true },
    ],
  },
]

export const navigation: { label: string; href: string }[] = [
  { label: 'Product', href: site.anchors.product },
  { label: 'Developers', href: site.anchors.developers },
  { label: 'Hosting', href: site.anchors.hosting },
  { label: 'Docs', href: site.docs },
]
