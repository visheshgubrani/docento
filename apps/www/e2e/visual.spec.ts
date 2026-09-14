import { expect, test } from '@playwright/test'

import { settleReveals } from './helpers'

/**
 * Visual regression, at two widths and in both token sets.
 *
 * ## What is photographed
 *
 * The landing page at a desktop and a phone width, and the component reference in
 * light and dark. The reference page is the more valuable of the two: it puts every
 * primitive in every state on one screen, so a change to a border colour or a focus
 * ring shows up once, in a place where the intent is unambiguous, instead of being
 * discovered in the product.
 *
 * ## Why the baselines are committed
 *
 * A visual test with no baseline tests nothing. The images live next to this file
 * and are regenerated deliberately (`pnpm test:e2e:update`) — which means a diff in
 * one of them is a design change somebody made on purpose, and the review question
 * is whether it was.
 *
 * ## Why the landing page's images are stable at all
 *
 * Because its imagery is placeholders and its previews are code. There are no
 * photographs to re-encode and no third-party assets to change underneath the
 * baseline, so a diff here means the page changed rather than that a CDN did.
 *
 * Screenshots are taken with animations disabled and the caret hidden; the page's
 * own scroll-driven section is not scrolled into view, so the story is captured in
 * its resting state.
 */
test.describe('landing page', () => {
  test('desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop viewport only')

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await settleReveals(page)

    await expect(page).toHaveScreenshot('landing-desktop.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile viewport only')

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await settleReveals(page)

    await expect(page).toHaveScreenshot('landing-mobile.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })
})

test.describe('component reference', () => {
  test('light and dark tokens', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'one width is enough for a reference page',
    )

    await page.goto('/styleguide')
    await page.waitForLoadState('networkidle')
    await settleReveals(page)

    await expect(page).toHaveScreenshot('styleguide-light.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })

    await page.getByRole('button', { name: 'Show dark' }).click()

    await expect(page).toHaveScreenshot('styleguide-dark.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })
})
