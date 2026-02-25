import type { ThemeState } from './types'
import { createPersistedEditorStore } from './create-editor-store'

const DEFAULT_THEME_ID = 'v2'

/**
 * Theme Store - Manages base selection, CSS, and pages
 *
 * This store handles:
 * - Base theme selection
 * - Base CSS and page definitions
 * - User-editable styles CSS overrides
 */

/**
 * Strip quick-start variable lines and @import quick-start.css from CSS text.
 * Used during migration from legacy merged customCss to stylesCss.
 */
function stripQuickStartContentFromCss(css: string): string {
  if (!css) return ''
  return css
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('--quickstart-')) return false
      const lower = trimmed.toLowerCase()
      if (lower.startsWith('@import') && lower.includes('quick-start.css')) return false
      return true
    })
    .join('\n')
    .replace(/:root\s*\{\s*\}/g, '')
    .trim()
}

function normalizeStylesCssByTheme(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') {
    return {}
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, css]) => typeof css === 'string'),
  ) as Record<string, string>
}

export function migrateThemeState(persistedState: unknown): Partial<ThemeState> {
  if (!persistedState || typeof persistedState !== 'object') {
    return persistedState as Partial<ThemeState>
  }

  const state = persistedState as Record<string, unknown>
  const legacyCustomCss = typeof state.customCss === 'string'
    ? state.customCss
    : ''

  const { customCss: _legacyCustomCss, ...stateWithoutLegacyCss } = state

  // Migrate from legacy merged customCss to stylesCss when stylesCss is missing.
  const hasStylesCss = typeof state.stylesCss === 'string' && state.stylesCss !== ''
  const stylesCss = hasStylesCss
    ? state.stylesCss as string
    : stripQuickStartContentFromCss(legacyCustomCss)
  const stylesCssByTheme = normalizeStylesCssByTheme(state.stylesCssByTheme)
  if (stylesCss && Object.keys(stylesCssByTheme).length === 0) {
    stylesCssByTheme[DEFAULT_THEME_ID] = stylesCss
  }

  return {
    ...stateWithoutLegacyCss as Partial<ThemeState>,
    stylesCss,
    stylesCssByTheme,
    themeQuickStartDefaults: typeof state.themeQuickStartDefaults === 'string'
      ? state.themeQuickStartDefaults
      : '',
  }
}

export const themeStore = createPersistedEditorStore<ThemeState>({
  baseCss: '',
  stylesCss: '',
  stylesCssByTheme: {},
  themeQuickStartDefaults: '',
  pages: [],
}, {
  name: 'keycloak-editor-theme',
  version: 5,
  migrate: migrateThemeState,
  partialize: state => ({
    stylesCss: state.stylesCss,
    stylesCssByTheme: state.stylesCssByTheme,
  }),
})
