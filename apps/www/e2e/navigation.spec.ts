import { expect, test } from '@playwright/test'

/**
 * Navigation: anchors, real destinations, and the mobile menu.
 *
 * The acceptance criteria this file exists for:
 *
 * - every call to action reaches a useful, real destination;
 * - an anchor lands with its heading clear of the sticky header;
 * - the menu traps focus, closes on Escape, restores focus and gives the page its
 *   scroll back.
 */
test.describe('anchors', () => {
  test('land clear of the sticky header', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'the sticky header is a desktop layout',
    )

    await page.goto('/')

    await page.getByRole('link', { name: 'Hosting' }).first().click()
    await page.waitForTimeout(900)

    const header = await page.locator('header').first().boundingBox()
    const heading = await page
      .getByRole('heading', {
        name: 'One complete product. Three ways to run it.',
      })
      .boundingBox()

    expect(header).not.toBeNull()
    expect(heading).not.toBeNull()

    expect(
      heading!.y,
      'The heading is underneath the sticky header after an anchor jump',
    ).toBeGreaterThanOrEqual(header!.height)
  })
})

test.describe('destinations', () => {
  test('the primary action points at the self-hosting instructions', async ({
    page,
  }) => {
    await page.goto('/')

    const [selfHost] = await page
      .getByRole('link', { name: 'Start self-hosting' })
      .all()

    const href = await selfHost.getAttribute('href')

    expect(href).toContain('github.com')
    expect(href).toContain('#quickstart')
  })

  test('are https, and anything opening a new tab is marked', async ({
    page,
  }) => {
    await page.goto('/')

    const links = await page.locator('a[href^="http"]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: (node as HTMLAnchorElement).href,
        target: node.getAttribute('target'),
        rel: node.getAttribute('rel'),
      })),
    )

    expect(links.length).toBeGreaterThan(10)

    for (const link of links) {
      expect(link.href).toMatch(/^https:\/\//)

      /**
       * `target="_blank"` without `rel="noreferrer"` hands the opened page a
       * reference to this one — the reverse-tabnabbing pattern. Not every external
       * link needs to open away (an editorial link should not), but every one that
       * does must be marked.
       */
      if (link.target === '_blank') {
        expect(
          link.rel,
          `${link.href} opens a tab without rel=noreferrer`,
        ).toBe('noreferrer')
      }
    }
  })

  test('the header carries Docs and GitHub as real destinations', async ({
    page,
  }) => {
    await page.goto('/')

    const header = page.locator('header')

    const github = header.getByRole('link', { name: 'Docento on GitHub' })
    await expect(github).toHaveAttribute('href', /^https:\/\/github\.com\//)

    /**
     * Documentation resolves to a configured origin rather than a hardcoded host:
     * the default is the repository, and a deployment with a documentation site
     * sets `NEXT_PUBLIC_DOCS_URL` and changes nothing else.
     *
     * The link moves between the header and the footer at the large breakpoint — the
     * header's navigation is a desktop layout — so the test follows it rather than
     * asserting a position that the layout chooses.
     */
    const docs = page.getByRole('link', { name: 'Docs' })

    if ((await docs.count()) > 0) {
      await expect(docs.first()).toHaveAttribute('href', /^https:\/\//)
    } else {
      await expect(
        page.getByRole('link', { name: 'Documentation' }).first(),
      ).toHaveAttribute('href', /^https:\/\//)
    }
  })

  test('no link points at a placeholder', async ({ page }) => {
    await page.goto('/')

    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((nodes) =>
        nodes.map(
          (node) => (node as HTMLAnchorElement).getAttribute('href') ?? '',
        ),
      )

    for (const href of hrefs) {
      expect(href).not.toBe('')
      expect(href).not.toBe('#')
      expect(
        href,
        'example.com is the SDK example, never a destination',
      ).not.toMatch(/example\.com/)
      expect(href).not.toMatch(/TODO|placeholder|lorem/i)
    }
  })
})

test.describe('the mobile menu', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('traps focus, closes on Escape and restores focus and scrolling', async ({
    page,
  }) => {
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Open menu' })
    await trigger.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    /**
     * Focus is inside the dialog on open, and Tab does not leave it. Three tabs in
     * a menu with five links and two actions is enough to show the trap holds.
     */
    /**
     * Focus starts inside the dialog — which element is first is Radix's business,
     * not this test's.
     */
    const focusInside = await page.evaluate(
      () =>
        document
          .querySelector('[role="dialog"]')
          ?.contains(document.activeElement) ?? false,
    )
    expect(focusInside, 'Focus did not move into the open menu').toBe(true)

    for (let index = 0; index < 3; index += 1) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(
        () =>
          document
            .querySelector('[role="dialog"]')
            ?.contains(document.activeElement) ?? false,
      )
      expect(inside, 'Focus escaped the open menu').toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    /**
     * Scrolling is returned to the page: Radix's lock and the Lenis pause both have
     * to be released, and the failure mode — a page that will not scroll after the
     * menu is closed — is the one people report as "the site is broken".
     */
    const before = await page.evaluate(() => window.scrollY)
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(600)
    const after = await page.evaluate(() => window.scrollY)

    expect(after).toBeGreaterThan(before)
  })

  test('the primary action is reachable inside the menu', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()

    await expect(
      page
        .getByRole('dialog')
        .getByRole('link', { name: 'Start self-hosting' }),
    ).toBeVisible()
  })
})
