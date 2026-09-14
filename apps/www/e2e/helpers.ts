import type { Page } from '@playwright/test'

/**
 * Scrolls the whole page once, then returns to the top.
 *
 * The page's reveals are triggered by scroll position, and a screenshot is not a
 * scroll: Playwright's full-page capture stitches the page together without ever
 * firing the scroll events a reader's browser would. Without this, a baseline of
 * this page records every below-the-fold section in its pre-reveal state — opacity
 * zero — and the test would be comparing pictures of nothing.
 *
 * Doing it properly has a second benefit: it exercises the reveal path itself. If
 * a section stops appearing when it is scrolled to, the screenshot test fails
 * rather than quietly recording the blank state as correct.
 *
 * Stepped rather than one jump to the bottom, because a single jump can pass a
 * trigger without giving it a frame to fire.
 */
export async function settleReveals(page: Page) {
  const height = await page.evaluate(() => document.body.scrollHeight)
  const step = 600

  for (let y = 0; y < height; y += step) {
    await page.evaluate((position) => window.scrollTo(0, position), y)
    await page.waitForTimeout(60)
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(250)
}
