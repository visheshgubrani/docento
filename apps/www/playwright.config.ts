import { defineConfig, devices } from '@playwright/test'

/**
 * Browser verification for the marketing site.
 *
 * ## What this suite is for
 *
 * The landing page is the one surface in this repository with no database, no
 * session and no API call, which makes it the easiest place to verify honestly:
 * the tests drive a real browser against a real build and assert what a visitor
 * experiences — that nothing is hidden without JavaScript, that the keyboard can
 * reach everything, that no viewport overflows, and that every link goes where the
 * configuration says it does.
 *
 * ## Why there is no API or database here
 *
 * Because there is nothing to point them at. The marketing application builds and
 * serves on its own, which is a property worth keeping: if this suite ever needs
 * Postgres to pass, the page has grown a dependency it should not have.
 *
 * ## Browsers
 *
 * Chromium only. The suite asserts layout, focus behaviour and accessibility
 * semantics, none of which is engine-specific enough to justify three downloads
 * in CI — and a suite that takes four minutes is a suite people skip.
 *
 * ## A note for constrained environments
 *
 * Playwright installs browsers into `~/.cache/ms-playwright` by default. Where that
 * directory is not writable, set `PLAYWRIGHT_BROWSERS_PATH` to a writable path
 * before both `playwright install` and `playwright test`; the two must agree.
 */
export default defineConfig({
  testDir: './e2e',

  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /**
   * The production server, not the development one. A development build defers
   * work to the first request and renders differently under React's development
   * mode, which is exactly the kind of difference that makes a visual baseline
   * meaningless.
   *
   * `reuseExistingServer` is false, and that is not a default worth relaxing to
   * save two seconds. Reusing whatever answers on this port means a suite that
   * silently photographs an older build: the assertions pass, the snapshots are
   * written from last week's CSS, and the failure surfaces later as a diff nobody
   * can explain. Starting a server that must be the one this build produced is
   * the whole point. A port already in use is then an error rather than a wrong
   * result.
   */
  webServer: {
    command: 'node_modules/.bin/next start --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
