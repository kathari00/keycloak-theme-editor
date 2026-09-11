import type { FrameworkBinding } from '../../editor/lib/framework-bindings/types'

const FRAMEWORK_OVERLAY_ATTR = 'data-kte-framework-classes'

/**
 * Mirrors `buildFrameworkThemeProperties` (theme-export) for the preview, which never runs
 * FreeMarker — the preview page is a static pre-rendered HTML fixture, so `theme.properties`
 * class overlays have nothing to attach to there. This walks the preview DOM directly and adds
 * the framework's classes to any element carrying one of the bound `kc*Class` hooks.
 *
 * Runs on every sync (including when switching back to 'native' or between frameworks), so it
 * first strips whatever a previous pass appended — tracked via `data-kte-framework-classes` —
 * rather than accumulating classes across framework switches.
 */
export function applyFrameworkClassOverlay(doc: Document, binding: FrameworkBinding): void {
  doc.querySelectorAll(`[${FRAMEWORK_OVERLAY_ATTR}]`).forEach((element) => {
    const previouslyAdded = (element.getAttribute(FRAMEWORK_OVERLAY_ATTR) || '').split(/\s+/).filter(Boolean)
    previouslyAdded.forEach(cls => element.classList.remove(cls))
    element.removeAttribute(FRAMEWORK_OVERLAY_ATTR)
  })

  const classMapKeys = Object.keys(binding.classMap)
  if (binding.id === 'native' || classMapKeys.length === 0) {
    return
  }

  const selector = classMapKeys.map(key => `.${key}`).join(',')
  doc.querySelectorAll(selector).forEach((element) => {
    const addedTokens: string[] = []
    // Snapshot first: this element typically carries 1-2 kc*Class hooks, far fewer than the
    // ~25-key classMap, and add() below must not mutate the list this loop is reading.
    for (const key of Array.from(element.classList)) {
      const mapped = binding.classMap[key]
      if (!mapped) {
        continue
      }
      for (const token of mapped.split(/\s+/).filter(Boolean)) {
        if (!element.classList.contains(token)) {
          element.classList.add(token)
          addedTokens.push(token)
        }
      }
    }
    if (addedTokens.length > 0) {
      element.setAttribute(FRAMEWORK_OVERLAY_ATTR, addedTokens.join(' '))
    }
  })
}

const THEME_STYLES_LINK_PATTERN = /\/resources\/css\/styles\.css(?:[?#]|$)/

/**
 * The preview page is a static pre-rendered HTML fixture carrying its own real `<link rel="stylesheet"
 * href=".../resources/css/styles.css">` tag (baked in from the actual Keycloak render) — separate from,
 * and loaded independently of, the inline `<style>` tags this app injects. Suppressing the inline
 * "theme styles" injection alone (see `effectiveStylesCss` in PreviewShell) does nothing to this link,
 * so a framework binding — meant to replace the preset's own design, not layer under it — must also
 * disable it directly. Leaves the theme's `quick-start.css` link alone; that's just token defaults,
 * not "design" CSS, and our own generated quick-start CSS already overrides it.
 */
export function setThemeDesignStylesheetDisabled(doc: Document, disabled: boolean): void {
  doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
    if (THEME_STYLES_LINK_PATTERN.test(link.getAttribute('href') || '')) {
      link.disabled = disabled
    }
  })
}
