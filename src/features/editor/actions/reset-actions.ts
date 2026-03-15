import { getThemeCssStructuredCached } from '../../presets/queries'
import { combineCssFiles, firstFilePath, singleFileMap } from '../lib/css-files'
import { buildQuickSettingsStorageKey, DEFAULT_THEME_ID } from '../lib/quick-settings'
import {
  ASSET_STORE_STORAGE_KEY,
  CORE_STORE_STORAGE_KEY,
  DARK_MODE_STORAGE_KEY,
  HISTORY_STORE_STORAGE_KEY,
  PRESET_STORE_STORAGE_KEY,
  THEME_STORE_STORAGE_KEY,
  USER_CSS_STORAGE_KEY,
} from '../lib/storage-keys'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { createDefaultPresetState, presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

function clearPersistedEditorState() {
  if (typeof window === 'undefined') {
    return
  }

  const storage = window.localStorage
  storage.removeItem(THEME_STORE_STORAGE_KEY)
  storage.removeItem(PRESET_STORE_STORAGE_KEY)
  storage.removeItem(CORE_STORE_STORAGE_KEY)
  storage.removeItem(ASSET_STORE_STORAGE_KEY)
  storage.removeItem(HISTORY_STORE_STORAGE_KEY)
  storage.removeItem(USER_CSS_STORAGE_KEY)
  storage.removeItem(DARK_MODE_STORAGE_KEY)
}

export const resetActions = {
  resetAll: async () => {
    clearPersistedEditorState()

    const defaultAssets = assetStore.getState().uploadedAssets.filter(asset => asset.isDefault)
    const defaultBackground = defaultAssets.find(asset => asset.category === 'background')
    const defaultLogo = defaultAssets.find(asset => asset.category === 'logo')
    const nextAppliedAssets = {
      ...(defaultBackground ? { background: defaultBackground.id } : {}),
      ...(defaultLogo ? { logo: defaultLogo.id } : {}),
    }
    assetStore.setState(() => ({
      uploadedAssets: defaultAssets,
      appliedAssets: nextAppliedAssets,
      appliedAssetsByTheme: {
        [DEFAULT_THEME_ID]: nextAppliedAssets,
      },
    }))

    presetStore.setState(() => createDefaultPresetState())

    themeStore.setState(state => ({
      ...state,
      stylesCss: '',
      stylesCssByTheme: {},
      stylesCssFiles: {},
      stylesCssFilesByTheme: {},
      activeCssFilePath: '',
      themeQuickStartDefaults: '',
    }))

    const currentCoreState = coreStore.getState()
    const nextActivePageId = 'login.html'
    const nextActiveStateId = 'default'
    const previewDocumentWillReload
      = currentCoreState.activePageId !== nextActivePageId
        || currentCoreState.activeStateId !== nextActiveStateId

    coreStore.setState(state => ({
      ...state,
      isDarkMode: false,
      activePageId: nextActivePageId,
      activeStateId: nextActiveStateId,
      selectedNodeId: null,
      previewReady: previewDocumentWillReload ? false : state.previewReady,
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

    const { quickStartDefaults, stylesCss, stylesCssFiles } = await getThemeCssStructuredCached(DEFAULT_THEME_ID)
    const files = Object.keys(stylesCssFiles).length > 0 ? stylesCssFiles : singleFileMap(stylesCss)
    const combined = combineCssFiles(files)
    presetStore.setState(state => ({
      ...state,
      presetCss: combined,
    }))
    themeStore.setState(state => ({
      ...state,
      stylesCss: combined,
      stylesCssByTheme: { [DEFAULT_THEME_ID]: combined },
      stylesCssFiles: files,
      stylesCssFilesByTheme: { [DEFAULT_THEME_ID]: files },
      activeCssFilePath: firstFilePath(files),
      themeQuickStartDefaults: quickStartDefaults,
    }))
  },
}
