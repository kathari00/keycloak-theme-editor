import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { editorActions, presetActions, themeActions } from '../actions'
import { coreActions } from '../actions/core-actions'
import { historyActions, subscribeToScopeChanges } from '../actions/history-actions'
import { subscribeToQuickStartSync } from '../actions/theme-actions'
import { QUICK_START_CSS_PATH } from '../lib/css-files'
import { DARK_MODE_STORAGE_KEY } from '../lib/storage-keys'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { createDefaultPresetState, presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

const HORIZONTAL_CARD_THEME_CSS = `
:root {
  --quickstart-primary-color-light: #0b57d0;
  --quickstart-primary-color-dark: #a8c7fa;
  --quickstart-primary-color: var(--quickstart-primary-color-light);
  --quickstart-secondary-color-light: #9aa0a6;
  --quickstart-secondary-color-dark: #9aa0a6;
  --quickstart-secondary-color: var(--quickstart-secondary-color-light);
  --quickstart-font-family: custom;
  --quickstart-bg-color-light: #f0f4f9;
  --quickstart-bg-color-dark: #1e1f20;
  --quickstart-bg-color: var(--quickstart-bg-color-light);
  --quickstart-card-shadow: none;
}
`.trim()

const V2_THEME_CSS = `
:root {
  --quickstart-primary-color-light: #0066cc;
  --quickstart-primary-color-dark: #0066cc;
  --quickstart-primary-color: var(--quickstart-primary-color-light);
  --quickstart-secondary-color-light: #c0c0c0;
  --quickstart-secondary-color-dark: #c0c0c0;
  --quickstart-secondary-color: var(--quickstart-secondary-color-light);
  --quickstart-bg-color-light: transparent;
  --quickstart-bg-color-dark: transparent;
  --quickstart-bg-color: var(--quickstart-bg-color-light);
}
`.trim()

subscribeToQuickStartSync()

function readQuickStartVar(name: string): string | undefined {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return themeStore.getState().themeQuickStartDefaults.match(new RegExp(`${escapedName}\\s*:\\s*([^;]+);`))?.[1]?.trim()
}

function resetStores() {
  presetStore.setState(() => createDefaultPresetState())
  coreStore.setState(() => ({
    isDarkMode: false,
    activePageId: 'login.html',
    activeStateId: 'default',
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
  themeStore.setState(() => ({
    baseCss: '',
    stylesCss: '',
    stylesCssByTheme: {},
    stylesCssFiles: {},
    stylesCssFilesByTheme: {},
    activeCssFilePath: '',
    themeQuickStartDefaults: '',
    pages: [],
  }))
  assetStore.setState(() => ({
    uploadedAssets: [],
    appliedAssets: {},
    appliedAssetsByTheme: {},
  }))
}

describe('quick settings mode separation', () => {
  let unsubscribeScopeChanges: () => void

  beforeEach(() => {
    unsubscribeScopeChanges = subscribeToScopeChanges()
    resetStores()
    themeStore.setState(state => ({ ...state, themeQuickStartDefaults: V2_THEME_CSS }))
    localStorage.setItem(DARK_MODE_STORAGE_KEY, 'light')
  })

  afterEach(() => {
    unsubscribeScopeChanges?.()
  })

  it('keeps quick-start colors isolated per mode via quick-start.css', () => {
    presetActions.setQuickStartStyle('#111111', '#222222', 'custom')

    expect(readQuickStartVar('--quickstart-primary-color-light')).toBe('#111111')
    expect(readQuickStartVar('--quickstart-primary-color-dark')).toBe('#0066cc')

    coreActions.toggleDarkMode()
    expect(coreStore.getState().isDarkMode).toBe(true)
    expect(presetStore.getState().colorPresetPrimaryColor).toBe('#0066cc')

    presetActions.setQuickStartStyle('#aaaaaa', '#bbbbbb', 'custom')
    expect(readQuickStartVar('--quickstart-primary-color-dark')).toBe('#aaaaaa')

    coreActions.toggleDarkMode()
    expect(coreStore.getState().isDarkMode).toBe(false)
    expect(presetStore.getState().colorPresetPrimaryColor).toBe('#111111')
  })

  it('keeps non-color quick-start style settings shared across light and dark mode', () => {
    presetActions.setQuickStartStyle('#111111', '#222222', '\'Poppins\', sans-serif', {
      headingFontFamily: '\'Poppins\', sans-serif',
    })
    presetActions.setQuickStartExtras({
      colorPresetBorderRadius: 'pill',
      colorPresetCardShadow: 'strong',
    })

    coreActions.toggleDarkMode()

    expect(presetStore.getState().colorPresetFontFamily).toBe('\'Poppins\', sans-serif')
    expect(presetStore.getState().colorPresetHeadingFontFamily).toBe('\'Poppins\', sans-serif')
    expect(presetStore.getState().colorPresetBorderRadius).toBe('pill')
    expect(presetStore.getState().colorPresetCardShadow).toBe('strong')
    expect(readQuickStartVar('--quickstart-font-family')).toBe('\'Poppins\', sans-serif')
    expect(readQuickStartVar('--quickstart-heading-font-family')).toBe('\'Poppins\', sans-serif')
  })

  it('keeps template content global when switching modes', () => {
    presetActions.setQuickStartExtras({
      showRealmName: false,
      showClientName: true,
      infoMessage: 'global-info',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: 'https://example.com/privacy',
    })

    coreActions.toggleDarkMode()
    expect(coreStore.getState().isDarkMode).toBe(true)
    expect(presetStore.getState().showRealmName).toBe(false)
    expect(presetStore.getState().showClientName).toBe(true)
    expect(presetStore.getState().infoMessage).toBe('global-info')
    expect(presetStore.getState().imprintUrl).toBe('https://example.com/imprint')
    expect(presetStore.getState().dataProtectionUrl).toBe('https://example.com/privacy')
  })

  it('loads dark mode settings from the theme quick-start css', () => {
    presetStore.setState(state => ({
      ...state,
      selectedThemeId: 'horizontal-card',
      presetCss: HORIZONTAL_CARD_THEME_CSS,
    }))
    themeStore.setState(state => ({
      ...state,
      themeQuickStartDefaults: HORIZONTAL_CARD_THEME_CSS,
    }))

    coreActions.toggleDarkMode()

    expect(coreStore.getState().isDarkMode).toBe(true)
    expect(presetStore.getState().colorPresetPrimaryColor).toBe('#a8c7fa')
    expect(presetStore.getState().colorPresetBgColor).toBe('#1e1f20')
    expect(presetStore.getState().colorPresetCardShadow).toBe('none')
  })

  it('applies imported quick settings content from the active mode only', () => {
    coreStore.setState(state => ({ ...state, isDarkMode: false }))

    presetActions.applyImportedQuickSettingsForPreset({
      light: {
        colorPresetPrimaryColor: '#123456',
        colorPresetSecondaryColor: '#abcdef',
        infoMessage: 'light-message',
      },
      dark: {
        colorPresetPrimaryColor: '#a8c7fa',
        colorPresetSecondaryColor: '#9aa0a6',
        infoMessage: 'dark-message',
      },
    })

    expect(presetStore.getState().colorPresetPrimaryColor).toBe('#0066cc')
    expect(presetStore.getState().infoMessage).toBe('light-message')
  })

  it('preserves dark quick-start css edits made while light mode is active', () => {
    presetStore.setState(state => ({
      ...state,
      selectedThemeId: 'horizontal-card',
    }))

    themeStore.setState(state => ({
      ...state,
      themeQuickStartDefaults: HORIZONTAL_CARD_THEME_CSS,
      stylesCssFiles: {
        [QUICK_START_CSS_PATH]: HORIZONTAL_CARD_THEME_CSS,
      },
      activeCssFilePath: QUICK_START_CSS_PATH,
    }))

    themeActions.setActiveFileCss(
      HORIZONTAL_CARD_THEME_CSS.replace(
        '--quickstart-primary-color-dark: #a8c7fa;',
        '--quickstart-primary-color-dark: #222222;',
      ),
    )

    coreActions.toggleDarkMode()

    expect(presetStore.getState().colorPresetPrimaryColor).toBe('#222222')
  })

  it('writes the selected background asset into quick-start bg-image', () => {
    assetStore.setState(() => ({
      uploadedAssets: [{
        id: 'custom-bg',
        name: 'custom-bg.png',
        category: 'background',
        mimeType: 'image/png',
        base64Data: 'abc',
        size: 3,
        createdAt: 0,
        isDefault: false,
      }],
      appliedAssets: {},
      appliedAssetsByTheme: {},
    }))

    editorActions.applyAsset('background', 'custom-bg')

    expect(readQuickStartVar('--quickstart-bg-image')).toBe('var(--uploaded-bg-custom-bg)')
  })

  it('keeps undo and redo scoped per mode', () => {
    presetActions.setQuickStartStyle('#111111', '#bbbbbb', 'custom')
    coreActions.toggleDarkMode()

    presetActions.setQuickStartStyle('#222222', '#bbbbbb', 'custom')
    expect(presetStore.getState().colorPresetPrimaryColor).toBe('#222222')
    expect(historyActions.undo()).toBe(true)
    expect(presetStore.getState().colorPresetPrimaryColor).toBe('#0066cc')
    expect(historyActions.redo()).toBe(true)
    expect(presetStore.getState().colorPresetPrimaryColor).toBe('#222222')

    coreActions.toggleDarkMode()
    expect(presetStore.getState().colorPresetPrimaryColor).toBe('#111111')
  })
})
