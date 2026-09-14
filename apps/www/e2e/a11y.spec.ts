import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { settleReveals } from './helpers'

/**
 * The accessibility gate.
 *
 * Automated scanning finds perhaps a third of accessibility problems, so this is a
 * floor rather than a verdict — but it is a floor that catches the ones that are
 * cheap to introduce and expensive to notice: a missing label, a heading level
 * skipped for its font size, a contrast pair that drifted, a landmark that is
 * missing or duplicated.
 *
 * It runs at five widths because the page is three layouts: the phone stack, the
 * tablet's simplified composition, and the desktop's overlapping hero and sticky
 * story. A scan at one width checks one of them.
 *
 * Serious and critical only. `moderate` findings from axe on a marketing page are
 * usually about things a design decision has already considered — a decorative
 * border, a link that is distinguishable from its surrounding text — and failing
 * the build on them would train everyone to ignore the result.
 */
const WIDTHS = [320, 360, 390, 768, 1024, 1440]

test.describe('accessibility', () => {
  for (const width of WIDTHS) {
    test(`no serious or critical violations at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await settleReveals(page)

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()

      const serious = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      )

      expect(
        serious.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes
            .map((node) => node.target.join(' '))
            .slice(0, 4),
        })),
        `${serious.length} serious or critical violations at ${width}px`,
      ).toEqual([])
    })
  }

  test('has one h1, ordered headings and the expected landmarks', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.getByRole('banner')).toHaveCount(1)
    await expect(page.getByRole('contentinfo')).toHaveCount(1)

    /**
     * Heading levels are read in document order and must not skip downward — an
     * `h2` following an `h1` is fine, an `h3` following an `h1` is a section whose
     * place in the outline is missing.
     */
    const levels = await page
      .locator('h1, h2, h3, h4')
      .evaluateAll((nodes) =>
        nodes.map((node) => Number(node.tagName.slice(1))),
      )

    let previous = 1

    for (const level of levels) {
      expect(level).toBeLessThanOrEqual(previous + 1)
      previous = level
    }
  })

  test('the skip link moves focus past the navigation', async ({ page }) => {
    await page.goto('/')

    await page.keyboard.press('Tab')

    const skipLink = page.getByRole('link', { name: 'Skip to content' })
    await expect(skipLink).toBeFocused()

    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/#main$/)
    await expect(page.getByRole('main')).toBeInViewport()
  })

  test('every interactive control has an accessible name', async ({ page }) => {
    await page.goto('/')

    const unnamed = await page
      .locator('button, a[href], summary, input, [role="button"]')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const element = node as HTMLElement
            const text = element.textContent?.trim() ?? ''
            const labelled =
              element.getAttribute('aria-label') ??
              element.getAttribute('title') ??
              element.getAttribute('alt') ??
              ''

            const described = element.getAttribute('aria-labelledby')

            return !text && !labelled && !described
          })
          .map((node) => node.outerHTML.slice(0, 120)),
      )

    expect(unnamed, 'Controls with no accessible name').toEqual([])
  })
})
