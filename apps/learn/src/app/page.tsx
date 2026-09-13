import { redirect } from 'next/navigation'

/**
 * The front page is the catalogue.
 *
 * There is no marketing page, and that is a decision rather than an omission:
 * what a marketing page would say about the academy belongs to the academy — in
 * `Academy.branding` and on its own site — and what it would say about the
 * software belongs in the documentation. A learner arriving at this address
 * wants the courses.
 */
export default function HomePage() {
  redirect('/courses')
}
