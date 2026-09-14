import { expect, test } from '@playwright/test'

/**
 * The product story, in all three of its behaviours.
 *
 * It is the page's most fragile piece of interaction, and it has three legitimate
 * modes:
 *
 * 1. **Scroll-driven** on a desktop, where the active chapter follows the scroll
 *    and the panel crossfades.
 * 2. **Keyboard-driven** anywhere, where selecting a chapter is explicit and is
 *    announced.
 * 3. **Stacked** on a phone or under reduced motion, where all three stories are
 *    present at once and nothing is scroll-linked.
 *
 * The rule that ties the first two together is the one worth testing hardest:
 * scrolling changes the panel and must *not* announce anything, because a screen
 * reader user scrolling past three chapters should not be read a running commentary
 * of chapters they are not reading.
 */
test.describe('the story on a desktop', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'chromium only')

  test('follows the scroll without announcing anything', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'the sticky story is a desktop layout',
    )

    await page.goto('/')

    const panel = (id: string) => page.locator(`[data-story-panel="${id}"]`)

    await expect(panel('create')).toHaveAttribute('data-active', 'true')

    await page.locator('[data-story-chapter="learn"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(700)

    await expect(panel('learn')).toHaveAttribute('data-active', 'true')
    await expect(panel('create')).toHaveAttribute('data-active', 'false')

    /**
     * The page has more than one status region — the copy button announces too — so
     * this addresses the story's own by its name rather than by role alone.
     */
    await expect(
      page.getByRole('status', { name: 'Selected chapter' }),
    ).toHaveText('')
  })

  test('selects by keyboard and announces the selection', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'the sticky story is a desktop layout',
    )

    await page.goto('/')

    const chapter = page.getByRole('button', { name: /Give learning a home/ })
    await chapter.focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(900)

    await expect(page.locator('[data-story-panel="learn"]')).toHaveAttribute(
      'data-active',
      'true',
    )
    await expect(
      page.getByRole('status', { name: 'Selected chapter' }),
    ).toHaveText('02. Give learning a home.')

    /**
     * Arrow keys move between chapters without a pointer, which is the difference
     * between a control that is technically focusable and one that is usable.
     */
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(900)

    await expect(page.locator('[data-story-panel="progress"]')).toHaveAttribute(
      'data-active',
      'true',
    )
  })
})

test.describe('the story without scroll-linked motion', () => {
  test('is stacked under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')

    for (const id of ['create', 'learn', 'progress']) {
      await expect(page.locator(`[data-story-panel="${id}"]`)).toBeVisible()
    }

    /**
     * And there is nothing to select: the chapters are headings rather than
     * buttons, because there is no active chapter to choose.
     */
    await expect(
      page.getByRole('button', { name: /Give learning a home/ }),
    ).toHaveCount(0)
  })

  test('is stacked on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    for (const id of ['create', 'learn', 'progress']) {
      await expect(page.locator(`[data-story-panel="${id}"]`)).toBeVisible()
    }
  })

  test('keeps the panels in step with their chapters', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    /**
     * Each panel must follow its own chapter in the reading order, or the stacked
     * version pairs a description with the wrong picture — the defect that is
     * easiest to introduce with layout-only CSS and hardest to notice.
     */
    const order = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll('[data-story-chapter], [data-story-panel]'),
      )

      return nodes.map((node) =>
        node.hasAttribute('data-story-chapter')
          ? `chapter:${node.getAttribute('data-story-chapter')}`
          : `panel:${node.getAttribute('data-story-panel')}`,
      )
    })

    expect(order).toEqual([
      'chapter:create',
      'panel:create',
      'chapter:learn',
      'panel:learn',
      'chapter:progress',
      'panel:progress',
    ])
  })
})
