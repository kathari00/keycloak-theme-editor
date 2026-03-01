/**
 * Preview HTML should be static and deterministic.
 * Strip scripts and inline event handlers to prevent network calls and runtime side effects.
 */
export function sanitizePreviewHtml(html: string): string {
  if (!html) {
    return '<!doctype html><html><body></body></html>'
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll('link[rel="stylesheet"], script').forEach((element) => {
    element.remove()
  })

  doc.querySelectorAll('*').forEach((element) => {
    for (const attributeName of element.getAttributeNames()) {
      if (attributeName.toLowerCase().startsWith('on')) {
        element.removeAttribute(attributeName)
      }
    }
  })

  return doc.documentElement.outerHTML
    .replace(/(data:[^"'\\s>]*;base64,)\s+/gi, '$1')
}
