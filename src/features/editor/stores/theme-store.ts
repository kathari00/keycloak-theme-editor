import type { ThemeState } from './types'
import { createPersistedEditorStore } from './create-editor-store'
import { THEME_STORE_STORAGE_KEY } from '../storage-keys'

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
