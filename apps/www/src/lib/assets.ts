/**
 * Imagery, as a placeholder map.
 *
 * The page is built with real image slots and no image files: each entry below
 * carries the dimensions, the alternative text and the file name the finished
 * asset should have, and `MediaPlaceholder` renders that as a labelled panel of
 * exactly the right size until the file exists.
 *
 * ## Why this is better than a stock photograph
 *
 * Two reasons that are not about taste. The layout is already correct — a
 * placeholder with the real aspect ratio means dropping the file in later cannot
 * shift anything, so the cumulative layout shift budget is spent once rather than
 * twice. And the page cannot ship a picture this repository has no provenance
 * for.
 *
 * Setting `src` is the whole change: the component switches to `next/image` with
 * the same dimensions and the placeholder disappears.
 */

export type Asset = {
  /** Public path, or `null` while the asset has not been supplied. */
  src: string | null
  /** Intrinsic width in pixels, which `next/image` needs to reserve space. */
  width: number
  /** Intrinsic height in pixels. */
  height: number
  /** What the image shows. Empty only for an image that is purely decorative. */
  alt: string
  /** The file name the asset is expected to have, shown in the placeholder. */
  file: string
  /** A short description of the intended photograph or illustration. */
  brief: string
}

export const assets = {
  /**
   * The hero's learner frame. It is rendered as interface, not as a photograph:
   * this slot is the one photographic moment in the hero, sitting behind the
   * lesson preview as the lesson's artwork.
   */
  heroLessonCover: {
    src: null,
    width: 1200,
    height: 675,
    alt: 'A frame from the lesson, showing a hand-held camera and a fig tree in low winter light.',
    file: '/images/hero-lesson-cover.png',
    brief:
      'A 16:9 still used as the lesson artwork in the hero preview. Muted, documentary, one clear subject.',
  },

  /** The learner catalogue's course artwork in chapter two of the product story. */
  catalogCourseCover: {
    src: null,
    width: 1200,
    height: 675,
    alt: 'Course artwork for Field notes, showing a contact sheet of underexposed frames.',
    file: '/images/catalog-course-cover.png',
    brief: 'A 16:9 course cover, distinct from the hero, same palette.',
  },

  /** The social sharing image. Placeholder until a real one is composed. */
  social: {
    src: null,
    width: 1200,
    height: 630,
    alt: 'Docento — a home for everything you teach.',
    file: '/images/social.png',
    brief:
      'The 1200×630 Open Graph card: the wordmark, the headline, and the academy preview on ivory.',
  },
} as const satisfies Record<string, Asset>

export type AssetKey = keyof typeof assets

/** The assets a finished page still needs, for the README and the placeholder UI. */
export const pendingAssets = Object.entries(assets)
  .filter(([, asset]) => asset.src === null)
  .map(([key, asset]) => ({ key: key as AssetKey, ...asset }))
