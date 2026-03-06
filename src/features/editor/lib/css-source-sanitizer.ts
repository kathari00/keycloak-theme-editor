/**
 * Matches a quick-start visibility block wrapped with KTE marker comments:
 *   /* @kte:visibility-start:{rule-id} * /
 *   ... CSS rules ...
 *   /* @kte:visibility-end * /
 *
 * These markers are injected by buildQuickStartCss() since Phase 3B.
 */
const VISIBILITY_MARKER_RE = /\/\*\s*@kte:visibility-start:[^\n*]*\*\/[\s\S]*?\/\*\s*@kte:visibility-end\s*\*\//g

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

  return cssText.replace(VISIBILITY_MARKER_RE, '').trim()
}
