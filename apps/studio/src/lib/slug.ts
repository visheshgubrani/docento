/**
 * A URL slug from a display name.
 *
 * ## Why generate rather than ask
 *
 * The grammar is the API's — lowercase alphanumeric words separated by single
 * hyphens — and it is a *derived* value: an operator naming a course is thinking
 * about the course, and a second field asking them to restate the name in URL
 * form is a validation error waiting to happen. This produces a value the
 * contract accepts instead of validating one a person typed.
 *
 * ## Where it belongs
 *
 * `packages/domain` does not need it — the API validates the slug it is given,
 * and a domain operation that silently rewrote an identifier would make two
 * callers disagree about what was created. Deriving it is the caller's job, so
 * it lives with the caller. Both applications import the SDK and neither imports
 * the other, so a copy per application is the honest arrangement; if a third
 * consumer appears, it moves down into `@docento/contracts`.
 */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      /**
       * Strip combining marks first, so an accented word slugs to its base letters
       * rather than to nothing at all — `Café` should become `cafe`, not `caf`.
       */
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64)
      // The slice can leave a trailing hyphen, which the grammar refuses.
      .replace(/-+$/g, '')
  )
}

/**
 * Whether a slug will be accepted by the API.
 *
 * Checked before submitting so the failure is a sentence beside the field rather
 * than a `422` after a round trip. Not a second definition of the grammar: the
 * API's own schema is still the thing that decides, and this only catches the
 * cases reachable from a name somebody actually typed.
 */
export function isUsableSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2
}
