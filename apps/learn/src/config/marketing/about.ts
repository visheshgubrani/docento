/**
 * Copy for the learner "about" page.
 *
 * Describes how learning works on this platform rather than inventing an
 * employer. The tenant's own story belongs to the academy and comes from
 * `Academy.branding`; there is deliberately no fabricated company history,
 * headcount, or staff quote here.
 */
export const aboutPageData = {
  hero: {
    eyebrow: 'About',
    headline: 'Learning that fits around the rest of your life.',
    description:
      'Courses here are self-paced and built to be finished. Each one is a sequence of lessons you can work through in order, with your place saved so you can stop and come back.',
  },
  stats: {
    eyebrow: 'What you get',
    headline: 'Built for finishing, not for browsing.',
    description:
      'The things that make a course completable are the boring ones: a clear structure, a way to resume, and a reason to finish.',
    items: [
      {
        value: 'Self-paced',
        text: 'No scheduled sessions. Start any lesson at any time.',
      },
      {
        value: 'Resumable',
        text: 'Your position in every course is saved as you go.',
      },
      {
        value: 'Verifiable',
        text: 'Certificates carry a public link an employer can check.',
      },
    ],
  },
  values: {
    eyebrow: 'Principles',
    headline: 'What guides the learner experience',
    description: 'These are the properties the platform is held to.',
    items: [
      {
        title: 'Accessible',
        description:
          'Available on any device, with a browser’s own video player.',
      },
      {
        title: 'Practical',
        description: 'Lessons are short and ordered, so progress is visible.',
      },
      {
        title: 'Honest',
        description:
          'Completion is computed from what you did on the server, not from a client report.',
      },
      {
        title: 'Private',
        description:
          'Your progress and certificates belong to this academy and nothing else.',
      },
      {
        title: 'Measurable',
        description: 'Attempts, scores and completion are recorded per course.',
      },
      {
        title: 'Durable',
        description:
          'Course updates never revoke a lesson you have already completed.',
      },
    ],
  },
}
