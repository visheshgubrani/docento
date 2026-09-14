import { docento } from '@docento/config/eslint'

/**
 * The generated brand assets are not linted: `assets/` holds SVGs written by
 * `scripts/build-wordmark.mjs`, and re-running that script would change
 * anything a lint fix did to them.
 */
export default docento({ ignores: ['assets/**'] })
