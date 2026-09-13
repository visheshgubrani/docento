/**
 * CSV export.
 *
 * This replaces a dependency on `xlsx` (SheetJS), which was in the tree at
 * `^0.18.5`. That version carries unfixed prototype-pollution and ReDoS
 * advisories, and the patched releases are not published to npm — so there is
 * no version of it this project can safely install. An export button is not
 * worth a permanent `npm audit` finding in a repository people are asked to
 * self-host.
 *
 * CSV opens in every spreadsheet application, including Excel, so nothing is
 * lost but a file extension. The escaping below is the whole of RFC 4180:
 * wrap in quotes when the value contains a delimiter, a quote, or a newline,
 * and double any quote inside.
 */

export type CsvValue = string | number | boolean | null | undefined

export type CsvColumn<Row> = {
  /** Header text in the first row. */
  label: string
  /** How to read the value out of a row. */
  value: (row: Row) => CsvValue
}

/**
 * A spreadsheet is a hostile interpreter, not a text file.
 *
 * A cell beginning `=`, `+`, `-` or `@` is interpreted as a formula by Excel,
 * LibreOffice and Google Sheets. For an export of learner-supplied names, that
 * is a CSV injection: `=HYPERLINK(...)` or a DDE payload runs when an operator
 * opens the file. Prefixing with a tab neutralises it while leaving the value
 * readable.
 *
 * A number is exempt, and that exemption is the point. `-5` is data, not a
 * formula, and it becomes a string only on its way out of here — prefixing it
 * would turn every negative score into `\t-5` and break the column for the
 * person reading it. Only a value that is *not* a number but starts like one
 * (`-2+3`) is treated as hostile.
 */
function neutraliseFormula(value: string): string {
  const isNumber = value.trim() !== '' && Number.isFinite(Number(value))
  if (isNumber) return value

  return /^[=+\-@\t\r]/.test(value) ? `\t${value}` : value
}

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return ''

  const raw = typeof value === 'string' ? value : String(value)
  const safe = neutraliseFormula(raw)

  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replaceAll('"', '""')}"`
  }

  return safe
}

export function toCsv<Row>(
  rows: readonly Row[],
  columns: readonly CsvColumn<Row>[],
): string {
  const header = columns.map((column) => escapeCell(column.label)).join(',')
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(column.value(row))).join(','),
  )

  // CRLF is what RFC 4180 specifies and what Excel expects.
  return [header, ...body].join('\r\n')
}

/**
 * Trigger a download in the browser.
 *
 * A UTF-8 BOM is prepended so Excel reads accented names correctly rather than
 * mangling them as the local code page.
 */
export function downloadCsv<Row>(
  filename: string,
  rows: readonly Row[],
  columns: readonly CsvColumn<Row>[],
): void {
  const csv = toCsv(rows, columns)
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
