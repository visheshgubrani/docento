import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize author-supplied HTML before it reaches `dangerouslySetInnerHTML`.
 *
 * This replaced a set of regular expressions that removed `<script>` and
 * *quoted* `on*=` attributes. That is not a sanitizer: `onerror=alert(1)` is
 * unquoted, so `<img src=x onerror=alert(1)>` passed straight through, as did
 * `<svg onload=...>`, `<iframe>`, `<object>`, and `javascript:` URLs in
 * attributes the patterns did not anticipate.
 *
 * Hand-rolled HTML sanitization is a well-known way to ship an XSS hole — the
 * grammar is too large for patterns to cover. DOMPurify parses the markup and
 * rebuilds it from an allowlist, which is the only approach that holds.
 *
 * Course authors are semi-trusted: a compromised instructor account, or imported
 * content, reaches every enrolled learner. This is treated as untrusted input.
 *
 * `isomorphic-dompurify` is used because this runs on the server as well as the
 * client.
 */
/**
 * DOMPurify permits `data:` URIs on image-like tags by default (its
 * `DATA_URI_TAGS` carve-out), which bypasses `ALLOWED_URI_REGEXP`. That is a
 * reasonable default for a general-purpose library and the wrong one here:
 * `data:image/svg+xml` can carry script, and lesson content never needs inline
 * data. Attributes are dropped rather than rewritten, so nothing is silently
 * turned into a different URL.
 *
 * Registered once at module load. DOMPurify hooks are process-global, which is
 * acceptable because this module is the only place the library is used.
 */
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName !== 'src' && data.attrName !== 'href') return

  const value = String(data.attrValue ?? '').trim().toLowerCase()

  if (
    value.startsWith('data:') ||
    value.startsWith('javascript:') ||
    value.startsWith('vbscript:') ||
    value.startsWith('file:')
  ) {
    data.keepAttr = false
  }
});

export function sanitizeLessonHtml(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'target', 'rel',
      'colspan', 'rowspan',
    ],
    // No `data:` URIs: they are a script-execution vector in several contexts
    // and course content has no need for them.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
    FORBID_TAGS: [
      'script', 'style', 'iframe', 'object', 'embed', 'form', 'input',
      'link', 'meta', 'base', 'svg', 'math',
    ],
    FORBID_ATTR: ['style'],
    KEEP_CONTENT: true,
  })
}
