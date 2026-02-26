import { getThemeCssStructuredCached } from '../../presets/queries'
import { buildQuickSettingsStorageKey, DEFAULT_THEME_ID } from '../quick-settings'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { createDefaultPresetState, presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import {
  CORE_STORE_STORAGE_KEY,
  DARK_MODE_STORAGE_KEY,
  HISTORY_SCOPE_STORAGE_KEY,
  PRESET_STORE_STORAGE_KEY,
  THEME_STORE_STORAGE_KEY,
  USER_CSS_STORAGE_KEY,
} from '../storage-keys'
import { historyActions } from './history-actions'

function clearPersistedEditorState() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const storage = window.localStorage
    storage.removeItem(THEME_STORE_STORAGE_KEY)
    storage.removeItem(PRESET_STORE_STORAGE_KEY)
    storage.removeItem(CORE_STORE_STORAGE_KEY)
    storage.removeItem(HISTORY_SCOPE_STORAGE_KEY)
    storage.removeItem(USER_CSS_STORAGE_KEY)
    storage.removeItem(DARK_MODE_STORAGE_KEY)
  }
  catch {
    // Ignore storage access errors.
  }
}

export const resetActions = {
  resetAll: async () => {
    clearPersistedEditorState()

    const defaultAssets = assetStore.getState().uploadedAssets.filter(asset => asset.isDefault)
    const defaultBackground = defaultAssets.find(asset => asset.category === 'background')
    assetStore.setState(() => ({
      uploadedAssets: defaultAssets,
      appliedAssets: defaultBackground ? { background: defaultBackground.id } : {},
    }))

    presetStore.setState(() => createDefaultPresetState())

    themeStore.setState(state => ({
      ...state,
      stylesCss: '',
      stylesCssByTheme: {},
      themeQuickStartDefaults: '',
    }))

    coreStore.setState(state => ({
      ...state,
      isDarkMode: false,
      activePageId: 'login.html',
      activeStoryId: 'default',
      selectedNodeId: null,
      previewReady: false,
      deviceId: 'desktop',
    }))

    historyStore.setState(() => ({
      activeScopeKey: buildQuickSettingsStorageKey(DEFAULT_THEME_ID, 'light'),
      stacksByScope: {},
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    }))

    historyActions.syncActiveScopeFromEditor()

    try {
      const { quickStartDefaults, stylesCss } = await getThemeCssStructuredCached(DEFAULT_THEME_ID)
      presetStore.setState(state => ({
        ...state,
        presetCss: stylesCss,
      }))
      themeStore.setState(state => ({
        ...state,
        stylesCss,
        stylesCssByTheme: { [DEFAULT_THEME_ID]: stylesCss },
        themeQuickStartDefaults: quickStartDefaults,
      }))
    }
    catch {
      // Ignore CSS loading failures; reset still applies structural defaults.
    }
  },
}

