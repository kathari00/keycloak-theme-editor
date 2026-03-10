import type { ThemeState } from './types'
import { THEME_STORE_STORAGE_KEY } from '../lib/storage-keys'
import { createPersistedEditorStore } from './create-editor-store'

/**
 * Theme Store - Manages base selection, CSS, and pages
 *
 * This store handles:
 * - Base theme selection
 * - Base CSS and page definitions
 * - User-editable styles CSS overrides (multiple files with tabs)
 */
export const themeStore = createPersistedEditorStore<ThemeState>({
  baseCss: '',
  stylesCss: '',
  stylesCssByTheme: {},
  stylesCssFiles: {},
  stylesCssFilesByTheme: {},
  activeCssFilePath: '',
  themeQuickStartDefaults: '',
  pages: [],
}, {
  name: THEME_STORE_STORAGE_KEY,
  partialize: state => ({
    stylesCss: state.stylesCss,
    stylesCssByTheme: state.stylesCssByTheme,
    stylesCssFiles: state.stylesCssFiles,
    stylesCssFilesByTheme: state.stylesCssFilesByTheme,
    activeCssFilePath: state.activeCssFilePath,
    themeQuickStartDefaults: state.themeQuickStartDefaults,
  }),
})
