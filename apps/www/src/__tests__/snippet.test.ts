import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  courseResultPreview,
  highlightQuickstart,
  readQuickstartSnippet,
} from '@/lib/highlight'

/**
 * The code panel, and the one property that makes it worth having.
 *
 * The example is not a string that was correct on the day it was written: it is a
 * marked region of a real module that imports `@docento/sdk` and calls
 * `listCatalogCourses`. `pnpm typecheck` fails if that method's signature moves, so
 * what is left for this file to prove is that the panel displays that module rather
 * than a copy of it.
 */
describe('the quickstart example', () => {
  it('is read from the module the compiler checks', () => {
    const snippet = readQuickstartSnippet()

    expect(snippet).toContain("import { DocentoApi } from '@docento/sdk'")
    expect(snippet).toContain('listCatalogCourses(academyId)')
    expect(snippet).toContain('const { courses } =')
  })

  it('hides the region markers from the reader', () => {
    const snippet = readQuickstartSnippet()

    expect(snippet).not.toContain('#region')
    expect(snippet).not.toContain('#endregion')
  })

  it('fails loudly if the markers are removed', async () => {
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')

    const directory = mkdtempSync(join(tmpdir(), 'docento-snippet-'))
    const file = join(directory, 'snippet.ts')
    writeFileSync(file, "import { DocentoApi } from '@docento/sdk'\n")

    expect(() => readQuickstartSnippet(file)).toThrow(
      /region markers are missing/,
    )
  })

  it('highlights at build time, with no runtime dependency', async () => {
    const html = await highlightQuickstart()

    expect(html).toContain('shiki')
    expect(html).toContain('listCatalogCourses')
    // The tokens are spans, not a script or a stylesheet fetched at runtime.
    expect(html).not.toContain('<script')
    expect(html).not.toContain('cdn')
  })

  it('uses the API’s real response shape beside the code', () => {
    expect(Object.keys(courseResultPreview).sort()).toEqual([
      'description',
      'id',
      'lessonCount',
      'moduleCount',
      'slug',
      'thumbnail',
      'title',
    ])

    // Payments are not in this milestone, so a price field would be a promise.
    expect(courseResultPreview).not.toHaveProperty('price')
  })
})

describe('the SDK is a real dependency of this application', () => {
  it('is declared in package.json, not merely imported', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> }

    expect(manifest.dependencies['@docento/sdk']).toBeDefined()
  })
})
