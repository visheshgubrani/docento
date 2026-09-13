import { describe, expect, it } from 'vitest'

import { renderLessonHtml } from '@/components/course-player/text-lesson-content'

/**
 * The TipTap-JSON branch of the lesson renderer is a second path to
 * `dangerouslySetInnerHTML`. It used to bypass `sanitizeLessonHtml`, on the
 * reasoning that its serializer escapes text and attribute values itself.
 *
 * That reasoning is not wrong, but it is not the property that matters. The
 * property that matters is that exactly one definition of "safe markup" exists,
 * so a new node type or a widened attribute in the serializer cannot silently
 * become a new injection point. These tests assert the sanitizer is in the path
 * for the JSON branch as well as the HTML one.
 */
const doc = (content: unknown[]) => JSON.stringify({ type: 'doc', content })

const text = (value: string, marks?: unknown[]) => ({
  type: 'text',
  text: value,
  ...(marks ? { marks } : {}),
})

const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content })

describe('renderLessonHtml — TipTap JSON branch', () => {
  it('renders ordinary documents', () => {
    const html = renderLessonHtml(
      doc([
        { type: 'heading', attrs: { level: 2 }, content: [text('Title')] },
        paragraph(text('Body with '), text('bold', [{ type: 'bold' }])),
      ]),
    )

    expect(html).toContain('<h2>Title</h2>')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('keeps in-site links and strips protocol-relative ones', () => {
    const link = (href: string) =>
      doc([paragraph(text('x', [{ type: 'link', attrs: { href } }]))])

    expect(renderLessonHtml(link('/courses/intro'))).toContain(
      'href="/courses/intro"',
    )
    expect(renderLessonHtml(link('#section'))).toContain('href="#section"')

    // `//evil.example` is scheme-relative, not a relative path. Accepting it
    // would make an author-supplied link an open redirect.
    expect(renderLessonHtml(link('//evil.example/login'))).not.toContain(
      'evil.example',
    )
  })

  describe('cannot be used to inject script', () => {
    it.each([
      [
        'a script tag in a text node',
        doc([paragraph(text('<script>alert(1)</script>'))]),
        /<script|alert\(1\)/i,
      ],
      [
        'an event handler spelled through an entity',
        doc([paragraph(text('&lt;img src=x onerror=alert(1)&gt;'))]),
        /onerror/i,
      ],
      [
        'a javascript: link mark',
        doc([
          paragraph(
            text('click', [
              { type: 'link', attrs: { href: 'javascript:alert(1)' } },
            ]),
          ),
        ]),
        /javascript:/i,
      ],
      [
        'a data: image source',
        doc([
          {
            type: 'image',
            attrs: { src: 'data:text/html;base64,PHNjcmlwdD4=' },
          },
        ]),
        /data:text\/html/i,
      ],
      [
        'an svg node smuggled through an unknown node type',
        { type: 'doc', content: [{ type: 'svg', content: [text('x')] }] },
        /<svg/i,
      ],
      [
        'an iframe node smuggled through an unknown node type',
        { type: 'doc', content: [{ type: 'iframe', attrs: {}, content: [] }] },
        /<iframe/i,
      ],
      [
        'an attribute break-out in an image alt',
        doc([
          {
            type: 'image',
            attrs: { src: '/a.png', alt: '" onerror="alert(1)' },
          },
        ]),
        /onerror="alert/i,
      ],
    ])('neutralizes %s', (_name, payload, forbidden) => {
      const html = renderLessonHtml(JSON.stringify(payload))

      expect(html).not.toMatch(forbidden)
    })
  })

  it('never emits an on* attribute, whatever the node shape', () => {
    // The general form of the above: rather than enumerate payloads, assert the
    // invariant. A new node type that produces an event handler fails here.
    const html = renderLessonHtml(
      JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { onclick: 'alert(1)', style: 'color:red' },
            content: [text('x')],
          },
          {
            type: 'image',
            attrs: {
              src: '/a.png',
              onload: 'alert(1)',
              onerror: 'alert(1)',
              style: 'color:red',
            },
          },
        ],
      }),
    )

    expect(html).not.toMatch(/\son[a-z]+\s*=/i)
    expect(html).not.toMatch(/\sstyle\s*=/i)
  })
})

describe('renderLessonHtml — the other two shapes', () => {
  it('sanitizes legacy HTML strings', () => {
    const html = renderLessonHtml('<p>ok</p><img src=x onerror=alert(1)>')

    expect(html).toContain('<p>ok</p>')
    expect(html).not.toMatch(/onerror/i)
  })

  it('returns nothing for plain text, so the caller renders it as a text node', () => {
    // A plain-text lesson must not be pushed through the HTML path, or the
    // words would be parsed as markup.
    expect(renderLessonHtml('Just some words')).toBe('')
    expect(renderLessonHtml('')).toBe('')
    expect(renderLessonHtml(null)).toBe('')
    expect(renderLessonHtml('5 < 6 and 7 > 4')).toBe('')
  })
})
