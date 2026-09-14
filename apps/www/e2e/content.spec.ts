import { expect, test } from '@playwright/test'

/**
 * Layout, at the widths the design system names, and without JavaScript.
 *
 * Two properties that are cheap to break and expensive to discover on a phone:
 * the page never scrolls sideways, and the content is all there when the script is
 * not. The first is a `min-width` somewhere that nobody noticed; the second is a
 * reveal that sets `opacity: 0` in CSS rather than in JavaScript.
 */
const WIDTHS = [320, 360, 390, 768, 1024, 1440]

test.describe('layout', () => {
  for (const width of WIDTHS) {
    test(`does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')

      const overflow = await page.evaluate(() => {
        const root = document.documentElement

        return {
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          offenders: Array.from(document.querySelectorAll('body *'))
            .filter((node) => {
              const rect = node.getBoundingClientRect()
              return rect.width > 0 && rect.right > root.clientWidth + 1
            })
            .slice(0, 5)
            .map((node) =>
              `${node.tagName.toLowerCase()}.${node.className}`.slice(0, 120),
            ),
        }
      })

      expect(
        overflow.scrollWidth,
        `The page overflows horizontally: ${overflow.offenders.join(' | ')}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1)
    })
  }

  test('the code panel scrolls inside its own region', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/')

    const panel = page.getByRole('region', { name: /TypeScript example/ })

    const scrollable = await panel.evaluate(
      (node) => node.scrollWidth > node.clientWidth,
    )

    expect(
      scrollable,
      'The code example should scroll within itself, not the page',
    ).toBe(true)

    const pageOverflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    )

    expect(pageOverflows).toBe(false)
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('every section, story and answer is readable', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', {
        name: 'A home for everything you teach.',
        level: 1,
      }),
    ).toBeVisible()

    /**
     * The claim the page makes about itself: the product story is a stack when
     * there is nothing to drive it.
     */
    for (const id of ['create', 'learn', 'progress']) {
      await expect(page.locator(`[data-story-panel="${id}"]`)).toBeVisible()
    }

    /**
     * All eight answers are in the document, and every one of them opens without a
     * line of script.
     *
     * This is why the FAQ uses the native disclosure element rather than the Radix
     * accordion: a Radix panel that is closed renders nothing a reader can reach,
     * and with JavaScript disabled its content cannot be opened at all. `<details>`
     * expands on click with no script involved, which is what the click below proves
     * — a closed answer that opened from JavaScript would still be a page that
     * needed JavaScript.
     */
    const answers = page.locator('#faq details p')

    await expect(answers).toHaveCount(8)

    for (let index = 0; index < 8; index += 1) {
      const details = page.locator('#faq details').nth(index)

      await details.locator('summary').click()
      await expect(answers.nth(index)).toBeVisible()
    }

    await expect(
      page.getByRole('link', { name: 'Start self-hosting' }).first(),
    ).toBeVisible()
  })
})
