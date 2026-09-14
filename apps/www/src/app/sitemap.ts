import type { MetadataRoute } from 'next'

import { site } from '@/lib/site'

/**
 * One page, because there is one page.
 *
 * The styleguide is deliberately absent: it is an internal reference, not a
 * destination, and putting it in a sitemap would be asking for it to be found.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
