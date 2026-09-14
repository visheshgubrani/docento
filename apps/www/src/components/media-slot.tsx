import Image from 'next/image'
import { cn } from '@docento/ui'

import type { Asset } from '@/lib/assets'

/**
 * An image slot, with the image as an addition.
 *
 * Until `asset.src` is set, this renders a panel of exactly the right size with
 * the file name and the brief in it — which is both a useful note to whoever
 * supplies the artwork and a layout that is already correct. When the file
 * arrives, the `src` is set and this becomes a lazy-loaded `next/image` with the
 * same dimensions, so nothing moves.
 *
 * The dimensions are intrinsic and passed to the placeholder's `aspect-ratio`
 * rather than to a fixed height: an image that has not loaded must still hold its
 * space, which is the whole of the cumulative layout shift budget for the page.
 */
export function MediaSlot({
  asset,
  className,
  sizes = '(min-width: 1024px) 50vw, 100vw',
  priority = false,
}: {
  asset: Asset
  className?: string
  sizes?: string
  priority?: boolean
}) {
  if (asset.src) {
    return (
      <Image
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className={cn('h-full w-full object-cover', className)}
      />
    )
  }

  return (
    <div
      data-slot="media-placeholder"
      role="img"
      aria-label={asset.alt}
      className={cn(
        'edge-panel text-ink-muted flex flex-col items-start justify-end gap-1 p-4',
        className,
      )}
      style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
    >
      <span className="preview-label">Image placeholder</span>
      <span className="font-mono text-[0.6875rem] break-all">{asset.file}</span>
      <span className="text-[0.75rem] leading-snug">
        {asset.width}×{asset.height} · {asset.brief}
      </span>
    </div>
  )
}
