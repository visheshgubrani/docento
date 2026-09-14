import { PathDraw } from '../motion/path-draw'
import { headless } from '@/content/landing'

/**
 * The relationship between an integrator's application, the API and the records.
 *
 * Drawn as SVG with the labels as real text outside it, rather than as text inside
 * the SVG: text in an SVG is not selectable, not translatable, and not reliably
 * read by assistive technology. The diagram carries the shape of the relationship;
 * the `<ol>` beside it carries the meaning, and the two are read in the same
 * order.
 */
export function RelationshipGraphic() {
  const [application, api, records] = headless.relationship

  return (
    <PathDraw>
      <div className="flex flex-col items-center gap-4">
        <svg
          viewBox="0 0 320 72"
          role="img"
          aria-label={`${application.label} calls the ${api.label}, which reads and writes ${records.label}`}
          className="text-border-control h-16 w-full max-w-[320px]"
          fill="none"
        >
          {/* `pathLength` normalises the dash animation so one value fits all three. */}
          <path
            data-draw
            pathLength={1}
            d="M62 36h74"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            data-draw
            pathLength={1}
            d="M184 36h74"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          <circle
            cx="24"
            cy="36"
            r="10"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="140"
            y="22"
            width="44"
            height="28"
            rx="6"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M152 30h20M152 36h20M152 42h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M296 22v28M286 32v8M306 32v8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        <ol className="text-ink-muted flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
          {headless.relationship.map((step, index) => (
            <li key={step.id} className="flex items-center gap-3">
              {index > 0 ? <span aria-hidden="true">→</span> : null}
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </PathDraw>
  )
}
