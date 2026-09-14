import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The token file, as data.
 *
 * ## Why this is in the package rather than in each consumer
 *
 * Two consumers need it and they need the same answers: the contrast test, which
 * fails the build when a pair drops below AA, and the component reference page,
 * which shows the ratios beside every swatch. A second parser would be a second
 * answer to the same question — and it would be the one that is wrong the first
 * time a token changes.
 *
 * The file is located relative to this module rather than to the working
 * directory, so it resolves whether the caller is a test run from the repository
 * root or a page built by Next with a different `cwd`.
 *
 * This entry point is server-only by nature: it reads from disk. It is exported
 * separately from the package root so that importing a button cannot pull
 * `node:fs` into a browser bundle.
 */

/**
 * The path is assembled from `import.meta.url` rather than written as
 * `new URL('../styles/tokens.css', import.meta.url)`.
 *
 * A bundler reads that form as an asset reference and tries to inline the CSS as
 * a module, which fails on a file that is read as text by design. Building the
 * path a segment at a time leaves nothing for it to resolve statically.
 */
const tokensPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'styles',
  'tokens.css',
)

export type TokenMap = Record<string, string>

export function readTokensCss(path = tokensPath): string {
  return readFileSync(path, 'utf8')
}

function block(selector: string, css: string) {
  const start = css.indexOf(selector)

  if (start === -1) {
    throw new Error(`Selector ${selector} not found in tokens.css`)
  }

  const open = css.indexOf('{', start)
  let depth = 0

  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') {
      depth -= 1
      if (depth === 0) return css.slice(open + 1, index)
    }
  }

  throw new Error(`Unbalanced braces after ${selector} in tokens.css`)
}

function declarations(source: string): TokenMap {
  return Object.fromEntries(
    [...source.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  )
}

/** Every token in `:root`, whether a literal colour or an alias. */
export function lightTokens(css = readTokensCss()): TokenMap {
  return declarations(block(':root', css))
}

/**
 * The *effective* dark theme.
 *
 * `.dark` overrides the literal colours and leaves the aliases alone, which is the
 * point of the alias layer: a component asking for `--muted-foreground` in the
 * dark theme resolves through `:root`'s alias to the dark value. Merging
 * reproduces what the cascade does.
 */
export function darkTokens(css = readTokensCss()): TokenMap {
  return { ...lightTokens(css), ...declarations(block('.dark', css)) }
}

/** The literal colours, which are the ones contrast is computed from. */
export function literalColours(tokens: TokenMap): TokenMap {
  return Object.fromEntries(
    Object.entries(tokens).filter(([, value]) =>
      /^#[0-9a-f]{3,8}$/i.test(value),
    ),
  )
}

function channel(value: number) {
  const scaled = value / 255
  return scaled <= 0.03928
    ? scaled / 12.92
    : Math.pow((scaled + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string) {
  const value = hex.replace('#', '')

  if (value.length !== 6) {
    throw new Error(`Expected a 6-digit hex colour, received ${hex}`)
  }

  return (
    0.2126 * channel(parseInt(value.slice(0, 2), 16)) +
    0.7152 * channel(parseInt(value.slice(2, 4), 16)) +
    0.0722 * channel(parseInt(value.slice(4, 6), 16))
  )
}

/** WCAG 2.x contrast ratio between two colours. */
export function contrastRatio(foreground: string, background: string) {
  const [lighter, darker] = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((a, b) => b - a)

  return (lighter + 0.05) / (darker + 0.05)
}

/** Resolves an alias chain such as `--background: var(--canvas)` to its colour. */
export function resolveToken(tokens: TokenMap, name: string): string {
  const seen = new Set<string>()
  let current = tokens[name]

  if (current === undefined) {
    throw new Error(`Token --${name} is not defined`)
  }

  for (;;) {
    if (/^#[0-9a-f]{3,8}$/i.test(current)) return current

    const reference = /^var\(--([\w-]+)\)$/.exec(current)

    if (!reference) {
      throw new Error(
        `Token --${name} resolves to ${current}, which is neither a colour nor a plain alias`,
      )
    }

    const next = reference[1]

    if (seen.has(next)) throw new Error(`Circular token alias at --${next}`)
    seen.add(next)

    const value = tokens[next]

    if (value === undefined) {
      throw new Error(`Token --${next} is not defined (reached from --${name})`)
    }

    current = value
  }
}

/**
 * What each semantic token is for.
 *
 * Kept beside the parser because it is the same kind of knowledge: a token whose
 * role is not written down is a token somebody will use for the wrong thing, and
 * the reference page renders this list.
 */
export const TOKEN_ROLES: Record<string, string> = {
  canvas: 'Page backgrounds',
  surface: 'Cards, menus, dialogs',
  'surface-subtle': 'Selected regions, inset panels',
  ink: 'Headings and body text',
  'ink-muted': 'Supporting copy',
  brand: 'Primary actions and links',
  'on-brand': 'Primary button text',
  'border-decorative': 'Card and section separation',
  'border-control': 'Inputs requiring a visible boundary',
  'accent-decorative': 'Highlights and artwork',
  success: 'Success text and icons',
  'success-background': 'Success container background',
  'success-foreground': 'Text on a success container',
  warning: 'Warning text and icons',
  'warning-background': 'Warning container background',
  'warning-foreground': 'Text on a warning container',
  error: 'Errors and destructive actions',
  'error-background': 'Error container background',
  'error-foreground': 'Text on an error container',
  info: 'Informational text and icons',
  'info-background': 'Information container background',
  'info-foreground': 'Text on an information container',
}

/**
 * The pairs `contrast.test.ts` asserts and the reference page displays.
 *
 * Declared here so that the page cannot show a pair the test does not check, or
 * the test check one the page does not show.
 */
export const CONTRAST_PAIRS: {
  foreground: string
  background: string
  minimum: number
  usage: string
}[] = [
  {
    foreground: 'ink',
    background: 'canvas',
    minimum: 4.5,
    usage: 'Body text on the page',
  },
  {
    foreground: 'ink',
    background: 'surface',
    minimum: 4.5,
    usage: 'Body text on a card',
  },
  {
    foreground: 'ink',
    background: 'surface-subtle',
    minimum: 4.5,
    usage: 'Body text on an inset panel',
  },
  {
    foreground: 'ink-muted',
    background: 'canvas',
    minimum: 4.5,
    usage: 'Supporting copy on the page',
  },
  {
    foreground: 'ink-muted',
    background: 'surface',
    minimum: 4.5,
    usage: 'Supporting copy on a card',
  },
  {
    foreground: 'ink-muted',
    background: 'surface-subtle',
    minimum: 4.5,
    usage: 'Supporting copy on an inset panel',
  },
  {
    foreground: 'brand',
    background: 'canvas',
    minimum: 4.5,
    usage: 'Links and brand text on the page',
  },
  {
    foreground: 'brand',
    background: 'surface',
    minimum: 4.5,
    usage: 'Links on a card',
  },
  {
    foreground: 'on-brand',
    background: 'brand',
    minimum: 4.5,
    usage: 'Primary button label',
  },
  {
    foreground: 'success',
    background: 'canvas',
    minimum: 4.5,
    usage: 'Success text',
  },
  {
    foreground: 'warning',
    background: 'canvas',
    minimum: 4.5,
    usage: 'Warning text',
  },
  {
    foreground: 'error',
    background: 'canvas',
    minimum: 4.5,
    usage: 'Error text',
  },
  {
    foreground: 'info',
    background: 'canvas',
    minimum: 4.5,
    usage: 'Information text',
  },
  {
    foreground: 'success-foreground',
    background: 'success-background',
    minimum: 4.5,
    usage: 'Success alert body',
  },
  {
    foreground: 'warning-foreground',
    background: 'warning-background',
    minimum: 4.5,
    usage: 'Warning alert body',
  },
  {
    foreground: 'error-foreground',
    background: 'error-background',
    minimum: 4.5,
    usage: 'Error alert body',
  },
  {
    foreground: 'info-foreground',
    background: 'info-background',
    minimum: 4.5,
    usage: 'Information alert body',
  },
  {
    foreground: 'foreground',
    background: 'background',
    minimum: 4.5,
    usage: 'shadcn alias: default text',
  },
  {
    foreground: 'muted-foreground',
    background: 'muted',
    minimum: 4.5,
    usage: 'shadcn alias: muted text',
  },
  {
    foreground: 'primary-foreground',
    background: 'primary',
    minimum: 4.5,
    usage: 'shadcn alias: primary button',
  },
  {
    foreground: 'card-foreground',
    background: 'card',
    minimum: 4.5,
    usage: 'shadcn alias: card text',
  },
  {
    foreground: 'border-control',
    background: 'canvas',
    minimum: 3,
    usage: 'Input boundary on the page',
  },
  {
    foreground: 'border-control',
    background: 'surface',
    minimum: 3,
    usage: 'Input boundary on a surface',
  },
  {
    foreground: 'border-control',
    background: 'surface-subtle',
    minimum: 3,
    usage: 'Input boundary on an inset panel',
  },
  {
    foreground: 'input',
    background: 'card',
    minimum: 3,
    usage: 'shadcn alias: input boundary',
  },
  {
    foreground: 'ring',
    background: 'canvas',
    minimum: 3,
    usage: 'Focus ring against the page',
  },
]
