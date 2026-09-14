import { cn } from '@docento/ui'

/**
 * Course artwork, drawn rather than photographed.
 *
 * Each cover is a small editorial composition — a cropped shape, a rule, a
 * chapter number — over one of three coordinated palettes. They share a
 * construction so that three courses look like three courses from one academy
 * rather than three unrelated images, which is what a catalogue actually has to
 * communicate.
 *
 * Vector and in code, for a reason that is not only aesthetic: the covers scale
 * to any container without a second asset, they inherit the page's rendering
 * rather than fighting it, and no photograph this repository has no provenance
 * for ends up on the site.
 */
const palettes = {
  forest: {
    ground: '#245440',
    shape: '#D9E6CF',
    rule: '#A8C8AD',
    ink: '#F7F6F2',
  },
  sage: {
    ground: '#D9E6CF',
    shape: '#245440',
    rule: '#245440',
    ink: '#202820',
  },
  ochre: {
    ground: '#E7D3A9',
    shape: '#7A4A0B',
    rule: '#7A4A0B',
    ink: '#2A1D06',
  },
} as const

export type CoverPalette = keyof typeof palettes

export function CourseCover({
  palette,
  title,
  eyebrow,
  className,
}: {
  palette: CoverPalette
  title: string
  eyebrow?: string
  className?: string
}) {
  const colours = palettes[palette]

  return (
    <div
      className={cn(
        'relative isolate flex aspect-video w-full flex-col justify-end overflow-hidden rounded-[var(--radius-card)] p-5',
        className,
      )}
      style={{ backgroundColor: colours.ground, color: colours.ink }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 320 180"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 -z-10 h-full w-full"
      >
        {/* A cropped circle, off the top-right edge: the composition's subject. */}
        <circle cx="268" cy="38" r="62" fill={colours.shape} opacity="0.9" />
        {/* A sheet offset behind the title block. */}
        <rect
          x="18"
          y="96"
          width="150"
          height="70"
          fill={colours.ground}
          opacity="0.35"
        />
        <path
          d="M0 132h320"
          stroke={colours.rule}
          strokeWidth="1.5"
          opacity="0.7"
        />
        <path
          d="M18 96v70"
          stroke={colours.rule}
          strokeWidth="1.5"
          opacity="0.7"
        />
      </svg>

      {eyebrow ? (
        <span className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase opacity-80">
          {eyebrow}
        </span>
      ) : null}

      <span className="font-display text-xl leading-tight">{title}</span>
    </div>
  )
}
