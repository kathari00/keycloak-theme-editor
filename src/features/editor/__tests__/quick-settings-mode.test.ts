import type { PresetState, QuickSettings } from '../stores/types'
import { beforeEach, describe, expect, it } from 'vitest'
import { coreActions } from '../actions/core-actions'
import { historyActions } from '../actions/history-actions'
import { presetActions } from '../actions/preset-actions'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

const V2_THEME_CSS = `
:root {
  --quickstart-primary-color: #0066cc;
  --quickstart-primary-color-dark: #0066cc;
  --quickstart-secondary-color: #c0c0c0;
  --quickstart-font-family: custom;
}
`.trim()

const HORIZONTAL_CARD_THEME_CSS = `
:root {
  --quickstart-primary-color: #0b57d0;
  --quickstart-primary-color-dark: #a8c7fa;
  --quickstart-secondary-color: #9aa0a6;
  --quickstart-font-family: custom;
  --quickstart-bg-color: #f0f4f9;
  --quickstart-bg-color-dark: #1e1f20;
  --quickstart-card-shadow-default: none;
}
`.trim()

function resetPresetStore() {
  presetStore.setState((): PresetState => ({
    selectedThemeId: 'v2',
    presetCss: V2_THEME_CSS,
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
  }))
}

function resetCoreStore() {
  coreStore.setState(() => ({
    isDarkMode: false,
    activePageId: 'login.html',
    activeStoryId: 'default',
    selectedNodeId: null,
    previewReady: false,
    deviceId: 'desktop',
  }))
}

function resetHistoryStore() {
  historyStore.setState(() => ({
    activeScopeKey: 'v2::light',
    stacksByScope: {},
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,
  }))
  historyActions.syncActiveScopeFromEditor()
}

function resetThemeStore() {
  themeStore.setState(() => ({
    baseCss: '',
    stylesCss: '',
    stylesCssByTheme: {},
    themeQuickStartDefaults: '',
    pages: [],
  }))
}

function createQuickSettings(overrides: Partial<QuickSettings>): QuickSettings {
  return {
    colorPresetId: 'custom',
    colorPresetPrimaryColor: '#000000',
    colorPresetSecondaryColor: '#111111',
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
    ...overrides,
  }
}

function applyQuickSettings(settings: QuickSettings) {
  presetStore.setState(state => ({
    ...state,
    colorPresetId: settings.colorPresetId,
    colorPresetPrimaryColor: settings.colorPresetPrimaryColor,
    colorPresetSecondaryColor: settings.colorPresetSecondaryColor,
    colorPresetFontFamily: settings.colorPresetFontFamily,
    colorPresetBgColor: settings.colorPresetBgColor,
    colorPresetBorderRadius: settings.colorPresetBorderRadius,
    colorPresetCardShadow: settings.colorPresetCardShadow,
    colorPresetHeadingFontFamily: settings.colorPresetHeadingFontFamily,
    showClientName: settings.showClientName,
    showRealmName: settings.showRealmName,
    infoMessage: settings.infoMessage,
    imprintUrl: settings.imprintUrl,
    dataProtectionUrl: settings.dataProtectionUrl,
  }))
}

describe('quick settings mode separation', () => {
  beforeEach(() => {
    resetPresetStore()
    resetCoreStore()
    resetHistoryStore()
    resetThemeStore()
    localStorage.setItem('keycloak-editor-dark-mode', 'light')
  })

  it('saves and restores quick settings per preset and mode', () => {
    const lightSettings = createQuickSettings({
      colorPresetPrimaryColor: '#111111',
      colorPresetSecondaryColor: '#222222',
    })
    const darkSettings = createQuickSettings({
      colorPresetPrimaryColor: '#aaaaaa',
      colorPresetSecondaryColor: '#bbbbbb',
    })

    applyQuickSettings(lightSettings)
    presetActions.saveQuickSettingsForPreset('v2', 'light')

    applyQuickSettings(darkSettings)
    presetActions.saveQuickSettingsForPreset('v2', 'dark')

    applyQuickSettings(createQuickSettings({ colorPresetPrimaryColor: '#ff00ff' }))
    expect(presetActions.restoreQuickSettingsForPreset('v2', 'light')).toBe(true)
    expect(presetStore.state.colorPresetPrimaryColor).toBe(lightSettings.colorPresetPrimaryColor)
    expect(presetStore.state.colorPresetSecondaryColor).toBe(lightSettings.colorPresetSecondaryColor)

    expect(presetActions.restoreQuickSettingsForPreset('v2', 'dark')).toBe(true)
    expect(presetStore.state.colorPresetPrimaryColor).toBe(darkSettings.colorPresetPrimaryColor)
    expect(presetStore.state.colorPresetSecondaryColor).toBe(darkSettings.colorPresetSecondaryColor)
  })

  it('ignores preset-only key without mode suffix', () => {
    const presetOnlySettings = createQuickSettings({
      colorPresetPrimaryColor: '#13579b',
      colorPresetSecondaryColor: '#2468ac',
    })
    presetStore.setState(state => ({
      ...state,
      presetQuickSettings: { v2: presetOnlySettings },
    }))

    expect(presetActions.restoreQuickSettingsForPreset('v2', 'dark')).toBe(false)
    expect(presetStore.state.colorPresetPrimaryColor).not.toBe('#13579b')
    expect(presetStore.state.presetQuickSettings['v2::dark']).toBeUndefined()
  })

  it('restores mode-specific quick settings when toggling dark mode', () => {
    const lightSettings = createQuickSettings({ colorPresetPrimaryColor: '#0057d8' })
    const darkSettings = createQuickSettings({ colorPresetPrimaryColor: '#a8c7fa' })
    applyQuickSettings(lightSettings)
    presetActions.saveQuickSettingsForPreset('v2', 'light')

    applyQuickSettings(darkSettings)
    presetActions.saveQuickSettingsForPreset('v2', 'dark')

    applyQuickSettings(lightSettings)
    coreStore.setState(state => ({ ...state, isDarkMode: false }))

    coreActions.toggleDarkMode()
    expect(coreStore.state.isDarkMode).toBe(true)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#a8c7fa')

    coreActions.toggleDarkMode()
    expect(coreStore.state.isDarkMode).toBe(false)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#0057d8')
  })

  it('keeps template content global when toggling dark mode', () => {
    const lightSettings = createQuickSettings({
      colorPresetBgColor: '#f0f4f9',
      showRealmName: true,
      showClientName: false,
      infoMessage: 'light',
    })
    const darkSettings = createQuickSettings({
      colorPresetBgColor: '#1e1f20',
      showRealmName: false,
      showClientName: true,
      infoMessage: 'dark',
    })

    applyQuickSettings(lightSettings)
    presetActions.saveQuickSettingsForPreset('v2', 'light')

    applyQuickSettings(darkSettings)
    presetActions.saveQuickSettingsForPreset('v2', 'dark')

    applyQuickSettings(lightSettings)
    coreStore.setState(state => ({ ...state, isDarkMode: false }))

    coreActions.toggleDarkMode()
    expect(coreStore.state.isDarkMode).toBe(true)
    expect(presetStore.state.colorPresetBgColor).toBe('#1e1f20')
    expect(presetStore.state.showRealmName).toBe(true)
    expect(presetStore.state.showClientName).toBe(false)
    expect(presetStore.state.infoMessage).toBe('light')

    coreActions.toggleDarkMode()
    expect(coreStore.state.isDarkMode).toBe(false)
    expect(presetStore.state.colorPresetBgColor).toBe('#f0f4f9')
    expect(presetStore.state.showRealmName).toBe(true)
    expect(presetStore.state.showClientName).toBe(false)
    expect(presetStore.state.infoMessage).toBe('light')
  })

  it('keeps first quick settings edit scoped to active mode', () => {
    coreStore.setState(state => ({ ...state, isDarkMode: false }))

    presetActions.setColorPreset('custom', '#123456', '#abcdef', 'custom')

    expect(presetStore.state.presetQuickSettings['v2::light']?.colorPresetPrimaryColor).toBe('#123456')
    expect(presetStore.state.presetQuickSettings['v2::dark']?.colorPresetPrimaryColor).toBe('#0066cc')

    coreActions.toggleDarkMode()
    expect(coreStore.state.isDarkMode).toBe(true)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#0066cc')
    expect(presetStore.state.presetQuickSettings['v2::dark']?.colorPresetPrimaryColor).toBe('#0066cc')
  })

  it('seeds horizontal-card dark defaults on first dark toggle', () => {
    presetStore.setState(state => ({
      ...state,
      selectedThemeId: 'horizontal-card',
      presetCss: HORIZONTAL_CARD_THEME_CSS,
      colorPresetId: 'custom',
      colorPresetPrimaryColor: '#0b57d0',
      colorPresetBgColor: '#f0f4f9',
      presetQuickSettings: {},
    }))
    coreStore.setState(state => ({ ...state, isDarkMode: false }))

    coreActions.toggleDarkMode()

    expect(coreStore.state.isDarkMode).toBe(true)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#a8c7fa')
    expect(presetStore.state.colorPresetBgColor).toBe('#1e1f20')
    expect(presetStore.state.presetQuickSettings['horizontal-card::dark']?.colorPresetPrimaryColor).toBe('#a8c7fa')
    expect(presetStore.state.presetQuickSettings['horizontal-card::dark']?.colorPresetBgColor).toBe('#1e1f20')
  })

  it('uses quick-start defaults when styles CSS has no quick-start variables', () => {
    themeStore.setState(state => ({
      ...state,
      themeQuickStartDefaults: HORIZONTAL_CARD_THEME_CSS,
    }))
    presetStore.setState(state => ({
      ...state,
      selectedThemeId: 'horizontal-card',
      presetCss: '.kcFormCardClass { display: grid; }',
      colorPresetId: 'custom',
      colorPresetPrimaryColor: '#0b57d0',
      colorPresetBgColor: '#f0f4f9',
      presetQuickSettings: {},
    }))
    coreStore.setState(state => ({ ...state, isDarkMode: false }))

    coreActions.toggleDarkMode()

    expect(coreStore.state.isDarkMode).toBe(true)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#a8c7fa')
    expect(presetStore.state.colorPresetBgColor).toBe('#1e1f20')
  })

  it('keeps horizontal-card dark defaults after first light edit', () => {
    presetStore.setState(state => ({
      ...state,
      selectedThemeId: 'horizontal-card',
      presetCss: HORIZONTAL_CARD_THEME_CSS,
      colorPresetId: 'custom',
      colorPresetPrimaryColor: '#0b57d0',
      colorPresetBgColor: '#f0f4f9',
      presetQuickSettings: {},
    }))
    coreStore.setState(state => ({ ...state, isDarkMode: false }))

    presetActions.setColorPreset('custom', '#13579b', '#9aa0a6', 'custom')
    coreActions.toggleDarkMode()

    expect(coreStore.state.isDarkMode).toBe(true)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#a8c7fa')
    expect(presetStore.state.colorPresetBgColor).toBe('#1e1f20')
  })

  it('seeds horizontal-card light defaults on first light toggle from dark mode', () => {
    localStorage.setItem('keycloak-editor-dark-mode', 'dark')
    presetStore.setState(state => ({
      ...state,
      selectedThemeId: 'horizontal-card',
      presetCss: HORIZONTAL_CARD_THEME_CSS,
      colorPresetId: 'custom',
      colorPresetPrimaryColor: '#a8c7fa',
      colorPresetBgColor: '#1e1f20',
      presetQuickSettings: {},
    }))
    coreStore.setState(state => ({ ...state, isDarkMode: true }))

    coreActions.toggleDarkMode()

    expect(coreStore.state.isDarkMode).toBe(false)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#0b57d0')
    expect(presetStore.state.colorPresetBgColor).toBe('#f0f4f9')
    expect(presetStore.state.presetQuickSettings['horizontal-card::light']?.colorPresetPrimaryColor).toBe('#0b57d0')
    expect(presetStore.state.presetQuickSettings['horizontal-card::light']?.colorPresetBgColor).toBe('#f0f4f9')
  })

  it('applies imported quick settings to both modes and activates current mode values', () => {
    coreStore.setState(state => ({ ...state, isDarkMode: false }))

    presetActions.applyImportedQuickSettingsForPreset('v2', {
      light: {
        colorPresetPrimaryColor: '#123456',
        colorPresetSecondaryColor: '#abcdef',
      },
      dark: {
        colorPresetPrimaryColor: '#a8c7fa',
        colorPresetSecondaryColor: '#9aa0a6',
      },
    })

    expect(presetStore.state.presetQuickSettings['v2::light']?.colorPresetPrimaryColor).toBe('#123456')
    expect(presetStore.state.presetQuickSettings['v2::dark']?.colorPresetPrimaryColor).toBe('#a8c7fa')
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#123456')
    expect(presetStore.state.colorPresetSecondaryColor).toBe('#abcdef')
  })

  it('keeps light snapshot stable after dark undo/redo and mode switch', () => {
    presetActions.setColorPreset('custom', '#111111', '#bbbbbb', 'custom')
    presetActions.saveQuickSettingsForPreset('v2', 'light')

    coreActions.toggleDarkMode()
    expect(coreStore.state.isDarkMode).toBe(true)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#0066cc')

    presetActions.setColorPreset('custom', '#222222', '#bbbbbb', 'custom')
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#222222')
    expect(historyActions.undo()).toBe(true)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#0066cc')
    expect(historyActions.redo()).toBe(true)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#222222')

    coreActions.toggleDarkMode()
    expect(coreStore.state.isDarkMode).toBe(false)
    expect(presetStore.state.colorPresetPrimaryColor).toBe('#111111')
  })
})
