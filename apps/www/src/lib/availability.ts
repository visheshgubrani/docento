/**
 * Availability, as data.
 *
 * The repository is pre-alpha, and the single most damaging thing a landing page
 * can do here is present a planned feature with the same confidence as a shipped
 * one. So availability is not a nuance in the prose: every claim on the page
 * carries a status, the status renders as a label with text and an icon, and a
 * test refuses a claim without one.
 *
 * The three states are deliberately few. `available` means a person can do it in
 * the product today. `preview` means the screen is drawn here as it is designed
 * and is not shipped — the page says "Interface preview" on it. `planned` means
 * it is on the roadmap and does not exist yet.
 */

export const AVAILABILITY = ['available', 'preview', 'planned'] as const

export type Availability = (typeof AVAILABILITY)[number]

export const availabilityLabel: Record<Availability, string> = {
  available: 'Available today',
  preview: 'Interface preview',
  planned: 'Planned',
}

export const availabilityExplanation: Record<Availability, string> = {
  available: 'You can do this in the current release.',
  preview:
    'This is a designed screen, not a shipped one. It is shown to make the product legible.',
  planned: 'On the roadmap. It does not exist yet.',
}

export type Claim<T> = {
  /** What is being claimed. */
  value: T
  availability: Availability
}

/** Wraps a claim so that it cannot be rendered without saying how available it is. */
export function claim<T>(value: T, availability: Availability): Claim<T> {
  return { value, availability }
}

export function isAvailability(value: string): value is Availability {
  return (AVAILABILITY as readonly string[]).includes(value)
}
