import type { PresetState } from '../stores/types'
import { getThemeCssStructuredCached } from '../../presets/queries'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { historyActions } from './history-actions'

const THEME_STORE_STORAGE_KEY = 'keycloak-editor-theme'
const PRESET_STORE_STORAGE_KEY = 'keycloak-editor-preset'
const CORE_STORE_STORAGE_KEY = 'keycloak-editor-core'
const HISTORY_SCOPE_STORAGE_KEY = 'keycloak-editor-history-scope'
const USER_CSS_STORAGE_KEY = 'keycloak-editor-user-css'
const DARK_MODE_STORAGE_KEY = 'keycloak-editor-dark-mode'
const DEFAULT_THEME_ID = 'v2'

const DEFAULT_PRESET_STATE: PresetState = {
  selectedThemeId: 'v2',
  presetCss: '',
  colorPresetId: 'keycloak-default',
  colorPresetPrimaryColor: '#0066cc',
  colorPresetSecondaryColor: '#c0c0c0',
  colorPresetFontFamily: 'custom',
  colorPresetBgColor: '',
  colorPresetBorderRadius: 'default',
  colorPresetCardShadow: 'default',
  colorPresetHeadingFontFamily: 'custom',
  showClientName: false,
  showRealmName: true,
  infoMessage: '',
  imprintUrl: '',
  dataProtectionUrl: '',
  presetQuickSettings: {},
}

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

    const defaultAssets = assetStore.state.uploadedAssets.filter(asset => asset.isDefault)
    const defaultBackground = defaultAssets.find(asset => asset.category === 'background')
    assetStore.setState(() => ({
      uploadedAssets: defaultAssets,
      appliedAssets: defaultBackground ? { background: defaultBackground.id } : {},
    }))

    presetStore.setState(() => ({
      ...DEFAULT_PRESET_STATE,
      presetQuickSettings: {},
    }))

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
      activeScopeKey: 'v2::light',
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
