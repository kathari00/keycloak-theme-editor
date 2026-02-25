/**
 * Preview HTML should be static and deterministic.
 * Strip scripts and inline event handlers to prevent network calls and runtime side effects.
 */
export function sanitizePreviewHtml(html: string): string {
  if (!html)
    return '<!doctype html><html><body></body></html>'

  return html
    .replace(/<link\b(?=[^>]*rel=["']stylesheet["'])[^>]*>/gi, '')
    .replace(/(data:[^"'\\s>]*;base64,)\s+/gi, '$1')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
}
