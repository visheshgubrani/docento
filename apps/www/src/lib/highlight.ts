import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeToHtml } from 'shiki'

import type { CatalogCourse } from '@docento/sdk'

/**
 * The code the developer section shows.
 *
 * ## The example is compiled, not illustrated
 *
 * `content/snippets/developer-quickstart.ts` is a real module: it imports
 * `@docento/sdk` and calls `listCatalogCourses`, so `pnpm typecheck` fails if the
 * SDK's signature changes and the marketing page still claims the old one. The
 * panel displays a marked region *of that file*, read at build time, which means
 * there is exactly one copy of the example — the compiled one. A snippet pasted
 * into a JSX string is a snippet that is correct on the day it is written.
 *
 * This is also why the SDK is a dependency of the marketing site at all.
 */

const here = dirname(fileURLToPath(import.meta.url))
const snippetPath = join(here, '..', 'content/snippets/developer-quickstart.ts')

const START = '// #region quickstart'
const END = '// #endregion quickstart'

/** The marked region, without the markers and without the leading indentation. */
export function readQuickstartSnippet(path = snippetPath): string {
  const source = readFileSync(path, 'utf8')

  const start = source.indexOf(START)
  const end = source.indexOf(END)

  if (start === -1 || end === -1) {
    throw new Error(
      `The quickstart region markers are missing from ${path}. The developer panel reads its example from that region, so removing them would leave it displaying nothing.`,
    )
  }

  return source
    .slice(start + START.length, end)
    .replace(/^\n/, '')
    .replace(/\n$/, '')
}

/**
 * Shiki, at build time.
 *
 * The theme is a dark one because the panel sits in the page's single dark band,
 * and the background shiki emits is overridden in the stylesheet so the code sits
 * on the same surface as the copy beside it rather than on a second, slightly
 * different dark.
 */
export async function highlightQuickstart(): Promise<string> {
  return codeToHtml(readQuickstartSnippet(), {
    lang: 'typescript',
    theme: 'github-dark-default',
  })
}

/**
 * The course-result preview beside the code, typed as the API's own shape.
 *
 * `CatalogCourse` is imported from the SDK rather than re-declared here, so a
 * field the API does not return cannot appear in the preview. Note what is absent
 * from it: a price. Payments are not in this milestone, and a preview showing one
 * would be inventing a feature.
 */
export const courseResultPreview: CatalogCourse = {
  id: 'crs_fieldwork_visual_storytelling',
  slug: 'visual-storytelling',
  title: 'The fundamentals of visual storytelling',
  description:
    'Six weeks of looking closely: framing, light, sequence, and what a finished piece owes the person watching it.',
  thumbnail: null,
  lessonCount: 7,
  moduleCount: 3,
}
