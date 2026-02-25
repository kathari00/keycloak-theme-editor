import { describe, expect, it } from 'vitest'
import { sanitizeThemeCssSourceForEditor, stripQuickStartImportLine } from '../css-source-sanitizer'

describe('sanitizeThemeCssSourceForEditor', () => {
  it('removes exported quick-start visibility snapshot blocks', () => {
    const css = `
.foo { color: red; }
/* Hide client name */
#kc-client-name,
.kc-client-name,
.kc-horizontal-card-client-name,
[data-kc-client="name"] {
  display: none !important;
}
/* Hide info message */
#kc-info-message.kcAlertClass,
.kc-info-message,
[data-kc-i18n-key="infoMessage"] {
  display: none !important;
}
.bar { color: blue; }
`.trim()

    const sanitized = sanitizeThemeCssSourceForEditor(css)

    expect(sanitized).toContain('.foo { color: red; }')
    expect(sanitized).toContain('.bar { color: blue; }')
    expect(sanitized).not.toContain('Hide client name')
    expect(sanitized).not.toContain('Hide info message')
  })

  it('keeps unrelated css untouched', () => {
    const css = `.kc-client-name { color: inherit; }`
    const sanitized = sanitizeThemeCssSourceForEditor(css)
    expect(sanitized).toBe(css)
  })
})

describe('stripQuickStartImportLine', () => {
  it('removes @import quick-start.css lines', () => {
    const css = `@import "./quick-start.css";\n\n.card { color: blue; }`
    const stripped = stripQuickStartImportLine(css)
    expect(stripped).toBe('.card { color: blue; }')
    expect(stripped).not.toContain('quick-start.css')
  })

  it('keeps other @import lines intact', () => {
    const css = `@import url("https://fonts.googleapis.com/css2?family=Inter");\n.card { color: blue; }`
    const stripped = stripQuickStartImportLine(css)
    expect(stripped).toContain('@import url("https://fonts.googleapis.com/css2?family=Inter")')
    expect(stripped).toContain('.card { color: blue; }')
  })

  it('returns empty string for empty input', () => {
    expect(stripQuickStartImportLine('')).toBe('')
  })
})
