import { describe, expect, it } from 'vitest'

import {
  closing,
  footerGroups,
  headless,
  hero,
  hosting,
  navigation,
  roadmapCallout,
} from '@/content/landing'
import { AVAILABILITY } from '@/lib/availability'
import { pendingAssets, assets } from '@/lib/assets'
import { site } from '@/lib/site'

/**
 * The link gate.
 *
 * "Every CTA reaches a useful, real destination" is an acceptance criterion, and a
 * criterion of that shape is otherwise only checkable by clicking everything on
 * every review. Here the destinations are enumerable, so they are enumerated.
 *
 * The test is deliberately about the *shape* of every URL rather than about a list
 * of known-good strings: a new link is checked the moment it is added, which is
 * the only version of this that keeps working.
 */

function collectLinks(): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = []

  for (const [name, href] of Object.entries(site.links)) {
    links.push({ label: `site.links.${name}`, href })
  }

  links.push({ label: 'site.repository', href: site.repository })
  links.push({ label: 'site.docs', href: site.docs })

  for (const item of navigation)
    links.push({ label: `nav: ${item.label}`, href: item.href })

  for (const group of footerGroups) {
    for (const link of group.links) {
      links.push({
        label: `footer ${group.title}: ${link.label}`,
        href: link.href,
      })
    }
  }

  links.push({ label: 'hero primary', href: hero.actions.primary.href })
  links.push({ label: 'hero secondary', href: hero.actions.secondary.href })
  links.push({ label: 'closing primary', href: closing.actions.primary.href })
  links.push({
    label: 'closing secondary',
    href: closing.actions.secondary.href,
  })
  links.push({ label: 'headless guide', href: headless.actions.guide.href })
  links.push({ label: 'headless source', href: headless.actions.source.href })
  links.push({ label: 'roadmap callout', href: roadmapCallout.action.href })

  for (const offering of hosting) {
    links.push({
      label: `hosting: ${offering.title}`,
      href: offering.action.href,
    })
  }

  return links
}

describe('every destination', () => {
  const links = collectLinks()

  it('is enumerated at all', () => {
    expect(links.length).toBeGreaterThan(30)
  })

  it.each(links)('$label is an absolute or in-page URL', ({ href }) => {
    const isAbsolute = /^https:\/\/[\w-]+(\.[\w-]+)+/.test(href)
    const isAnchor = /^#[\w-]+$/.test(href)

    expect(
      isAbsolute || isAnchor,
      `${href} is neither an https URL nor an in-page anchor`,
    ).toBe(true)
  })

  it.each(links)('$label is not a placeholder', ({ href }) => {
    expect(href).not.toMatch(
      /example\.com|TODO|FIXME|placeholder|lorem|localhost/i,
    )
  })
})

describe('the repository links', () => {
  it('point at real files, not at a directory listing that may not exist', () => {
    expect(site.links.roadmap).toMatch(/ROADMAP\.md$/)
    expect(site.links.contributing).toMatch(/CONTRIBUTING\.md$/)
    expect(site.links.security).toMatch(/SECURITY\.md$/)
    expect(site.links.licence).toMatch(/LICENSE$/)
    expect(site.links.licenceContracts).toMatch(/packages\/contracts\/LICENSE$/)
    expect(site.links.licenceSdk).toMatch(/packages\/sdk\/LICENSE$/)
  })

  it('keeps the API guide on the document that actually describes the API', () => {
    expect(site.links.apiGuide).toContain('ARCHITECTURE.md')
    expect(site.links.apiGuide).toContain('#public-api')
  })

  it('sends documentation to the repository while the docs site describes another product', () => {
    /**
     * `apps/docs` still documents projects, cohorts and AI transcription, none of
     * which exist here. Until it is rewritten, the honest destination is the
     * repository README — and this test records that as a decision rather than
     * letting the default drift silently.
     */
    expect(process.env.NEXT_PUBLIC_DOCS_URL ?? '').toBe('')
    expect(site.docs).toBe(`${site.repository}#readme`)
  })
})

describe('imagery', () => {
  it('gives every slot the metadata a finished asset needs', () => {
    for (const [key, asset] of Object.entries(assets)) {
      expect(asset.width, `${key} has no intrinsic width`).toBeGreaterThan(0)
      expect(asset.height, `${key} has no intrinsic height`).toBeGreaterThan(0)
      expect(
        asset.alt.length,
        `${key} has no alternative text`,
      ).toBeGreaterThan(10)
      expect(asset.file, `${key} does not name its file`).toMatch(
        /^\/images\/[\w-]+\.\w+$/,
      )
      expect(asset.brief.length).toBeGreaterThan(20)

      if (asset.src !== null) {
        expect(asset.src, `${key} does not point at its own file`).toBe(
          asset.file,
        )
      }
    }
  })

  it('reports the slots that are still placeholders', () => {
    /**
     * Not an assertion that there are none — the page currently ships without its
     * photography, on purpose. It is a list, for the README and for whoever adds
     * the files.
     */
    expect(pendingAssets.length).toBeGreaterThanOrEqual(0)

    for (const asset of pendingAssets) {
      expect(asset.src).toBeNull()
    }
  })
})

describe('availability', () => {
  it('uses one vocabulary everywhere', () => {
    for (const capability of [
      ...hosting.map((offering) => offering.availability),
      roadmapCallout.availability,
    ]) {
      expect(AVAILABILITY).toContain(capability)
    }
  })
})
