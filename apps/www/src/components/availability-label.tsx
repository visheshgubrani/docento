import { Badge } from '@docento/ui'
import { CheckCircleIcon, CircleDashedIcon, EyeIcon } from 'lucide-react'

import { availabilityExplanation, availabilityLabel } from '@/lib/availability'
import type { Availability } from '@/lib/availability'

/**
 * How availability is shown.
 *
 * Three carriers, deliberately: the words, the colour, and an icon. Colour alone
 * fails for a reader who cannot distinguish it, and an icon alone fails for one
 * who cannot see it — so the label is text first and everything else agrees with
 * it. The explanation is the badge's `title`, which is a supplement rather than
 * the only place the meaning lives.
 */
const presentation: Record<
  Availability,
  { variant: 'success' | 'info' | 'neutral'; Icon: typeof CheckCircleIcon }
> = {
  available: { variant: 'success', Icon: CheckCircleIcon },
  preview: { variant: 'info', Icon: EyeIcon },
  planned: { variant: 'neutral', Icon: CircleDashedIcon },
}

export function AvailabilityLabel({
  availability,
  className,
}: {
  availability: Availability
  className?: string
}) {
  const { variant, Icon } = presentation[availability]

  return (
    <Badge
      variant={variant}
      className={className}
      title={availabilityExplanation[availability]}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {availabilityLabel[availability]}
    </Badge>
  )
}

/**
 * A claim with its availability, weighted by what needs saying.
 *
 * A badge on every line turns a list of nine shipped capabilities into nine
 * announcements, and a page where everything is labelled is a page where the two
 * things that *are* different get lost. So the shipped case is a quiet tick with
 * the status still in the accessible name, and anything preview or planned keeps
 * the full label it needs to be seen.
 */
export function ClaimRow({
  availability,
  children,
}: {
  availability: Availability
  children: React.ReactNode
}) {
  if (availability === 'available') {
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <CheckCircleIcon
          aria-hidden="true"
          className="text-success size-4 shrink-0"
        />
        <span className="text-ink">{children}</span>
        <span className="sr-only">Available today</span>
      </span>
    )
  }

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <AvailabilityLabel availability={availability} className="shrink-0" />
      <span className="text-ink">{children}</span>
    </span>
  )
}
