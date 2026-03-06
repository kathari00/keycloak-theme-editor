import { describe, expect, it } from 'vitest'
import { sanitizeThemeCssSourceForEditor } from '../lib/css-source-sanitizer'

describe('sanitizeThemeCssSourceForEditor', () => {
  it('removes KTE-marker-wrapped visibility blocks', () => {
    const css = `
.foo { color: red; }
/* @kte:visibility-start:hide-client-name */
/* Hide client name */
#kc-client-name,
.kc-client-name {
  display: none !important;
}
/* @kte:visibility-end */
/* @kte:visibility-start:hide-info-message */
/* Hide info message */
#kc-info-message.kcAlertClass {
  display: none !important;
}
/* @kte:visibility-end */
.bar { color: blue; }
`.trim()

    const sanitized = sanitizeThemeCssSourceForEditor(css)

    expect(sanitized).toContain('.foo { color: red; }')
    expect(sanitized).toContain('.bar { color: blue; }')
    expect(sanitized).not.toContain('@kte:visibility-start')
    expect(sanitized).not.toContain('@kte:visibility-end')
    expect(sanitized).not.toContain('display: none !important')
  })

  it('keeps unrelated css untouched', () => {
    const css = `.kc-client-name { color: inherit; }`
    const sanitized = sanitizeThemeCssSourceForEditor(css)
    expect(sanitized).toBe(css)
  })

  it('keeps old-format visibility blocks untouched (no markers)', () => {
    // Old JARs exported without markers are preserved as-is.
    // Phase 5 will handle them via metadata-based import.
    const css = `/* Hide client name */\n#kc-client-name { display: none !important; }`
    const sanitized = sanitizeThemeCssSourceForEditor(css)
    expect(sanitized).toBe(css)
  })

  it('removes multiple visibility blocks in a single pass', () => {
    const css = `
/* @kte:visibility-start:hide-realm-name */
#kc-realm-name { display: none !important; }
/* @kte:visibility-end */
.keep-me { color: red; }
/* @kte:visibility-start:hide-subtitle */
.kc-horizontal-card-subtitle { display: none !important; }
/* @kte:visibility-end */
`.trim()

    const sanitized = sanitizeThemeCssSourceForEditor(css)
    expect(sanitized).toContain('.keep-me { color: red; }')
    expect(sanitized).not.toContain('hide-realm-name')
    expect(sanitized).not.toContain('hide-subtitle')
    expect(sanitized).not.toContain('display: none !important')
  })
})
