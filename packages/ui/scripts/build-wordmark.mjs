/**
 * Outlines the Docento wordmark and writes the brand SVG assets.
 *
 * ## Why the wordmark is outlines and not text
 *
 * An SVG that says `font-family="Geist"` renders as the wrong font anywhere Geist
 * is not installed — a README, a deck, someone's press kit — and the browser
 * silently substitutes something else. Converting the wordmark to paths once, at
 * build time, is what makes `assets/lockup-horizontal.svg` mean the same thing
 * everywhere.
 *
 * The spacing is the design decision this script encodes: Geist Sans Medium with
 * a measured tracking applied per glyph, tightened where the letterforms need it.
 * It runs from the typeface the product already bundles, so the wordmark and the
 * interface it sits in are the same drawing.
 *
 * Run with `pnpm --filter @docento/ui brand:wordmark`. The output is committed.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { dependencyDir, packageRoot } from './lib/package-path.mjs'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')

const root = packageRoot(import.meta.url)
const symbolData = JSON.parse(
  await readFile(join(root, 'src/brand/symbol-paths.json'), 'utf8'),
)

/** The token values the assets are drawn in. Kept in step with tokens.css. */
const INK = '#202820'
const PAPER = '#F1F3ED'

const TEXT = 'Docento'

/**
 * Tracking, in font units of 1000 per em.
 *
 * Negative, and slightly different after the "D" than between the round letters:
 * a uniform negative tracking closes the counters of `o`, `c` and `e` at small
 * sizes, which is where a wordmark spends most of its life.
 */
const TRACKING = {
  default: -6,
  afterFirst: -14,
}

function round(value, places = 2) {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/** fontkit emits long floats; two decimals is well under a quarter of a pixel. */
function tidy(path, offsetX, baseline) {
  return path
    .transform(1, 0, 0, -1, offsetX, baseline)
    .toSVG()
    .replace(/-?\d+\.\d+/g, (match) => String(round(Number(match))))
}

function buildWordmark() {
  const font = fontkit.openSync(
    join(
      dependencyDir(root, 'geist'),
      'dist/fonts/geist-sans/Geist-Medium.ttf',
    ),
  )
  const run = font.layout(TEXT)

  const glyphs = []
  let cursor = 0

  run.glyphs.forEach((glyph, index) => {
    glyphs.push({ glyph, x: cursor })
    const tracking = index === 0 ? TRACKING.afterFirst : TRACKING.default
    cursor += run.positions[index].xAdvance + tracking
  })

  // Union of the glyph boxes, so the viewBox is the ink and not the line box:
  // a wordmark with the font's internal side bearings baked in never lines up
  // with the thing it sits next to.
  const boxes = glyphs.map(({ glyph, x }) => ({
    minX: glyph.bbox.minX + x,
    maxX: glyph.bbox.maxX + x,
    minY: -glyph.bbox.maxY,
    maxY: -glyph.bbox.minY,
  }))

  const minX = Math.min(...boxes.map((box) => box.minX))
  const minY = Math.min(...boxes.map((box) => box.minY))
  const maxX = Math.max(...boxes.map((box) => box.maxX))
  const maxY = Math.max(...boxes.map((box) => box.maxY))

  /**
   * The transform that puts the outlines in a y-down ink box.
   *
   * fontkit hands back font-unit outlines with y increasing upward from the
   * baseline, so the flip is `-1` on y and the offset is the height of the ink
   * above the baseline — *not* the font's ascent, which also counts the
   * breathing room above the capitals and would leave the wordmark floating
   * below the top of its own viewBox.
   */
  const shiftX = -minX
  const shiftY = -minY

  const paths = glyphs.map(({ glyph, x }) =>
    tidy(glyph.path, x + shiftX, shiftY),
  )

  return {
    paths,
    width: round(maxX - minX),
    height: round(maxY - minY),
  }
}

function symbolPaths({ fill }) {
  const { paths } = symbolData
  return `<path fill="${fill}" d="${paths.leftPage}"/>\n  <path fill="${fill}" d="${paths.bowl}"/>\n  <path fill="${fill}" d="${paths.rightPage}"/>`
}

function symbolSvg({ fill, label }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbolData.viewBox}" width="34" height="34" role="img" aria-label="${label}" fill="none">
  ${symbolPaths({ fill })}
</svg>
`
}

function wordmarkSvg(wordmark, { fill, label }) {
  const body = wordmark.paths
    .map((d) => `<path fill="${fill}" d="${d}"/>`)
    .join('\n  ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wordmark.width} ${wordmark.height}" width="${wordmark.width}" height="${wordmark.height}" role="img" aria-label="${label}" fill="none">
  ${body}
</svg>
`
}

/**
 * The horizontal lockup: symbol, gap, wordmark.
 *
 * Both halves are normalised to the same ink height and share a baseline, so the
 * lockup has one optical size rather than two that happen to be near each other.
 */
function lockupSvg(wordmark, { fill, label }) {
  const symbolInk = symbolData.ink
  const scale = round(wordmark.height / symbolInk.height, 5)
  const symbolWidth = round(symbolInk.width * scale)
  const gap = round(wordmark.height * 0.22)
  const totalWidth = round(symbolWidth + gap + wordmark.width)

  const symbolGroup = `<g transform="translate(${round(-symbolInk.x * scale)} ${round(-symbolInk.y * scale)}) scale(${scale})">
    ${symbolPaths({ fill })}
  </g>`

  const wordmarkGroup = `<g transform="translate(${round(symbolWidth + gap)} 0)">
    ${wordmark.paths.map((d) => `<path fill="${fill}" d="${d}"/>`).join('\n    ')}
  </g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${wordmark.height}" width="${totalWidth}" height="${wordmark.height}" role="img" aria-label="${label}" fill="none">
  ${symbolGroup}
  ${wordmarkGroup}
</svg>
`
}

function pathsModule(wordmark) {
  return `/**
 * Generated by \`scripts/build-wordmark.mjs\` from Geist Sans Medium.
 *
 * Do not edit by hand. Change the tracking in the script, re-run
 * \`pnpm --filter @docento/ui brand:wordmark\`, and commit the result — a
 * hand-edited path here is a wordmark that no longer matches the typeface it
 * claims to be drawn from.
 */
export const WORDMARK_TEXT = '${TEXT}'

export const WORDMARK_VIEWBOX = '0 0 ${wordmark.width} ${wordmark.height}'

export const WORDMARK_WIDTH = ${wordmark.width}

export const WORDMARK_HEIGHT = ${wordmark.height}

export const WORDMARK_PATHS = [
${wordmark.paths.map((d) => `  '${d}',`).join('\n')}
] as const
`
}

async function write(path, contents) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents, 'utf8')
}

const wordmark = buildWordmark()
const brandDir = join(root, 'src/brand')
const assetsDir = join(root, 'assets')

await write(join(brandDir, 'wordmark-paths.ts'), pathsModule(wordmark))

await write(
  join(assetsDir, 'symbol.svg'),
  symbolSvg({ fill: 'currentColor', label: 'Docento' }),
)
await write(
  join(assetsDir, 'symbol-on-light.svg'),
  symbolSvg({ fill: INK, label: 'Docento' }),
)
await write(
  join(assetsDir, 'symbol-on-dark.svg'),
  symbolSvg({ fill: PAPER, label: 'Docento' }),
)

await write(
  join(assetsDir, 'wordmark.svg'),
  wordmarkSvg(wordmark, { fill: 'currentColor', label: 'Docento' }),
)
await write(
  join(assetsDir, 'lockup-horizontal.svg'),
  lockupSvg(wordmark, { fill: 'currentColor', label: 'Docento' }),
)
await write(
  join(assetsDir, 'lockup-horizontal-on-light.svg'),
  lockupSvg(wordmark, { fill: INK, label: 'Docento' }),
)
await write(
  join(assetsDir, 'lockup-horizontal-on-dark.svg'),
  lockupSvg(wordmark, { fill: PAPER, label: 'Docento' }),
)

process.stdout.write(
  `Wordmark: ${wordmark.width}×${wordmark.height} units, ${wordmark.paths.length} glyph outlines. Wrote 7 assets.\n`,
)
