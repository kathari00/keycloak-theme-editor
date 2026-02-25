const QUICK_START_EXPORT_VISIBILITY_RULE_PATTERNS = [
  /\/\*\s*Hide realm name\s*\*\/\s*#kc-realm-name\s*,\s*\.kc-realm-name\s*,\s*\.kc-horizontal-card-realm-name\s*\{[^{}]*display\s*:\s*none\s*!important;?[^{}]*\}\s*/gi,
  /\/\*\s*Hide client name\s*\*\/\s*#kc-client-name\s*,\s*\.kc-client-name\s*,\s*\.kc-horizontal-card-client-name\s*,\s*\[data-kc-client="name"\]\s*\{[^{}]*display\s*:\s*none\s*!important;?[^{}]*\}\s*/gi,
  /\/\*\s*Hide subtitle row when both client and realm are disabled\s*\*\/\s*\.kc-horizontal-card-subtitle\s*\{[^{}]*display\s*:\s*none\s*!important;?[^{}]*\}\s*/gi,
  /\/\*\s*Hide info message\s*\*\/\s*#kc-info-message\.kcAlertClass\s*,\s*\.kc-info-message\s*,\s*\[data-kc-i18n-key="infoMessage"\]\s*\{[^{}]*display\s*:\s*none\s*!important;?[^{}]*\}\s*/gi,
  /\/\*\s*Hide client container\s*\*\/\s*#kc-client\s*,\s*\.kc-client\s*\{[^{}]*display\s*:\s*none\s*!important;?[^{}]*\}\s*/gi,
]

/**
 * Remove exported quick-start visibility blocks from source CSS loaded in editor.
 *
 * These blocks represent a snapshot of toggle state at export time and can
 * lock the preview (e.g. permanently hidden client name) when users reuse
 * exported styles as editor source.
 */
export function sanitizeThemeCssSourceForEditor(cssText: string): string {
  if (!cssText.trim()) {
    return ''
  }

  return QUICK_START_EXPORT_VISIBILITY_RULE_PATTERNS.reduce(
    (nextCss, pattern) => nextCss.replace(pattern, ''),
    cssText,
  ).trim()
}

/**
 * Strip `@import "./quick-start.css"` lines from styles.css content.
 * Used when loading styles.css separately (quick-start is managed independently).
 */
export function stripQuickStartImportLine(cssText: string): string {
  if (!cssText) return ''
  return cssText
    .split(/\r?\n/)
    .filter((line) => {
      const lower = line.trim().toLowerCase()
      return !(lower.startsWith('@import') && lower.includes('quick-start.css'))
    })
    .join('\n')
    .trim()
}
