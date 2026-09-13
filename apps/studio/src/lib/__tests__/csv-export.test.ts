import { describe, expect, it } from 'vitest'

import { toCsv } from '../csv-export'

/**
 * CSV export replaced a dependency on SheetJS, which has unfixed advisories and
 * no patched release on npm. The interesting behaviour is not the happy path —
 * it is what happens when a learner's name contains a comma, and what happens
 * when it starts with `=`.
 */
describe('toCsv', () => {
  const columns = [
    {
      label: 'Name',
      value: (row: { name: string; score: number }) => row.name,
    },
    {
      label: 'Score',
      value: (row: { name: string; score: number }) => row.score,
    },
  ]

  it('writes a header and one line per row', () => {
    const csv = toCsv([{ name: 'Ada', score: 10 }], columns)

    expect(csv).toBe('Name,Score\r\nAda,10')
  })

  it('renders null and undefined as empty rather than as the words', () => {
    const csv = toCsv(
      [{ name: null, score: undefined }],
      [
        {
          label: 'Name',
          value: (row: { name: null; score: undefined }) => row.name,
        },
        {
          label: 'Score',
          value: (row: { name: null; score: undefined }) => row.score,
        },
      ],
    )

    expect(csv).toBe('Name,Score\r\n,')
  })

  describe('quoting', () => {
    it('quotes a value containing the delimiter', () => {
      const csv = toCsv([{ name: 'Sharma, Priya', score: 1 }], columns)

      expect(csv).toContain('"Sharma, Priya"')
    })

    it('quotes and doubles a value containing a quote', () => {
      const csv = toCsv([{ name: 'Ada "The Count"', score: 1 }], columns)

      expect(csv).toContain('"Ada ""The Count"""')
    })

    it('quotes a value containing a newline', () => {
      const csv = toCsv([{ name: 'two\nlines', score: 1 }], columns)

      expect(csv).toContain('"two\nlines"')
    })
  })

  describe('formula injection', () => {
    // A spreadsheet treats a leading =, +, - or @ as the start of a formula.
    // Exported names are learner-supplied, so this is a real vector rather than
    // a theoretical one.
    it.each([
      ['=HYPERLINK("https://evil.example","click")'],
      ['+1+1'],
      ['-2+3'],
      ['@SUM(A1:A9)'],
      ["=cmd|' /C calc'!A1"],
    ])('neutralises %s', (payload) => {
      // One column only, so the cell is the whole line once the quoting that a
      // comma (or a quote) forces has been accounted for. Checking this against
      // a two-column export would be testing the CSV parser as much as the
      // guard.
      const csv = toCsv(
        [{ name: payload }],
        [{ label: 'Name', value: (row: { name: string }) => row.name }],
      )
      const cell = csv.split('\r\n')[1] ?? ''
      const body = cell.startsWith('"')
        ? cell.slice(1, -1).replaceAll('""', '"')
        : cell

      // The value survives for a human to read, but the cell no longer *starts*
      // with a character a spreadsheet treats as the beginning of a formula.
      expect(body.startsWith('\t')).toBe(true)
      expect(body.slice(1)).toBe(payload)
    })

    it('leaves an ordinary negative number alone once it is not a string', () => {
      // Numbers are rendered by String(), so a negative score is data and must
      // not gain a stray tab.
      const csv = toCsv([{ name: 'Ada', score: -5 }], columns)

      expect(csv).toContain(',-5')
    })
  })
})
