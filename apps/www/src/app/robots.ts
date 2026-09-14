import type { MetadataRoute } from 'next'

import { site } from '@/lib/site'

/**
 * The internal component reference is excluded by page metadata rather than
 * here, because `robots.txt` is a request and a `noindex` is an instruction:
 * a page that is disallowed cannot be crawled, so its `noindex` is never read,
 * and it can still be indexed from a link. The styleguide is `noindex` and
 * crawlable, which is the combination that works.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${site.url}/sitemap.xml`,
  }
}
