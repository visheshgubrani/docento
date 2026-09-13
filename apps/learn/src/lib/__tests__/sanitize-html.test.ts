import { describe, expect, it } from 'vitest'

import { sanitizeLessonHtml } from '../sanitize-html'

/**
 * The learner player renders author-supplied HTML with
 * `dangerouslySetInnerHTML`. These tests pin the sanitizer against the payloads
 * the previous regex implementation let through — most importantly the unquoted
 * `onerror=`, which was the actual hole.
 */
describe('sanitizeLessonHtml', () => {
  it('keeps ordinary lesson markup intact', () => {
    const input = '<h2>Title</h2><p>Body with <strong>bold</strong>.</p><ul><li>One</li></ul>'
    const output = sanitizeLessonHtml(input)

    expect(output).toContain('<h2>Title</h2>')
    expect(output).toContain('<strong>bold</strong>')
    expect(output).toContain('<li>One</li>')
  })

  it('keeps links and images with safe URLs', () => {
    const output = sanitizeLessonHtml(
      '<a href="https://example.com">link</a><img src="https://example.com/a.png" alt="a">',
    )

    expect(output).toContain('href="https://example.com"')
    expect(output).toContain('src="https://example.com/a.png"')
  })

  describe('removes script execution', () => {
    it('strips the unquoted onerror payload that defeated the old regexes', () => {
      // The exact class of hole: the regex only matched quoted handlers, so this
      // survived verbatim.
      const output = sanitizeLessonHtml('<img src=x onerror=alert(1)>')

      expect(output).not.toMatch(/onerror/i)
      expect(output).not.toContain('alert(1)')
    })

    it.each([
      ['<script>alert(1)</script>', /<script/i],
      ['<img src="x" onerror="alert(1)">', /onerror/i],
      ["<img src='x' onerror='alert(1)'>", /onerror/i],
      ['<svg onload=alert(1)></svg>', /onload|svg/i],
      ['<body onload=alert(1)>', /onload/i],
      ['<iframe src="https://evil.example"></iframe>', /<iframe/i],
      ['<object data="x"></object>', /<object/i],
      ['<embed src="x">', /<embed/i],
      ['<form action="/x"><input name="a"></form>', /<form|<input/i],
      ['<a href="javascript:alert(1)">x</a>', /javascript:/i],
      ['<a href="JaVaScRiPt:alert(1)">x</a>', /javascript:/i],
      ['<img src="data:text/html;base64,PHNjcmlwdD4=">', /data:text\/html/i],
      ['<div style="background:url(javascript:alert(1))">x</div>', /javascript:/i],
      ['<meta http-equiv="refresh" content="0;url=https://evil.example">', /<meta/i],
      ['<base href="https://evil.example/">', /<base/i],
      ['<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>', /onerror/i],
    ])('neutralizes %s', (payload, forbidden) => {
      expect(sanitizeLessonHtml(payload)).not.toMatch(forbidden)
    })
  })

  it('preserves text content of stripped tags rather than dropping the words', () => {
    // KEEP_CONTENT means a stripped wrapper does not silently delete the lesson
    // text inside it.
    expect(sanitizeLessonHtml('<div><span>still here</span></div>')).toContain(
      'still here',
    )
  })

  it('does not allow inline style, which is a CSS-based vector', () => {
    expect(sanitizeLessonHtml('<p style="color:red">x</p>')).not.toMatch(/style=/i)
  })
})
