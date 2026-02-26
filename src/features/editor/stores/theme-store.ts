import type { ThemeState } from './types'
import { THEME_STORE_STORAGE_KEY } from '../storage-keys'
import { createPersistedEditorStore } from './create-editor-store'

/**
 * Theme Store - Manages base selection, CSS, and pages
 *
 * This store handles:
 * - Base theme selection
 * - Base CSS and page definitions
 * - User-editable styles CSS overrides
 */
export const themeStore = createPersistedEditorStore<ThemeState>({
  baseCss: '',
  stylesCss: '',
  stylesCssByTheme: {},
  themeQuickStartDefaults: '',
  pages: [],
}, {
  name: THEME_STORE_STORAGE_KEY,
  version: 5,
  migrate: state => (state || {}) as Partial<ThemeState>,
  partialize: state => ({
    stylesCss: state.stylesCss,
    stylesCssByTheme: state.stylesCssByTheme,
  }),
})
