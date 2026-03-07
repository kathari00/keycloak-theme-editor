import type { QuickSettingsStyle } from '../stores/types'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { presetActions } from '../actions'
import { coreActions } from '../actions/core-actions'
import { historyActions, subscribeToScopeChanges } from '../actions/history-actions'
import { buildQuickSettingsStorageKey } from '../lib/quick-settings'
import { DARK_MODE_STORAGE_KEY } from '../lib/storage-keys'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { createDefaultPresetState, presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

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

function getModeSettings(themeId: string, mode: 'light' | 'dark'): QuickSettingsStyle | undefined {
  return presetStore.getState().presetQuickSettings[buildQuickSettingsStorageKey(themeId, mode)]
}

function resetStores() {
  presetStore.setState(() => createDefaultPresetState())
  coreStore.setState(() => ({
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
  // Scope is automatically synced by subscribeToScopeChanges() subscriber.
  themeStore.setState(() => ({
    baseCss: '',
    stylesCss: '',
    stylesCssByTheme: {},
    themeQuickStartDefaults: '',
    pages: [],
  }))
}

describe('quick settings mode separation', () => {
  let unsubscribeScopeChanges: () => void

  beforeEach(() => {
    unsubscribeScopeChanges = subscribeToScopeChanges()
    resetStores()
    localStorage.setItem(DARK_MODE_STORAGE_KEY, 'light')
  })

  afterEach(() => {
    unsubscribeScopeChanges?.()
  })

  it('keeps quick settings isolated per mode when toggling dark mode', () => {
    presetActions.setQuickStartStyle('#111111', '#222222', 'custom')

    coreActions.toggleDarkMode()
    expect(coreStore.getState().isDarkMode).toBe(true)
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#0066cc')
    expect(presetStore.getState().colorPresetFontFamily).toBe('custom')

    presetActions.setQuickStartStyle('#aaaaaa', '#bbbbbb', 'custom')
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#aaaaaa')

    coreActions.toggleDarkMode()
    expect(coreStore.getState().isDarkMode).toBe(false)
    expect(getModeSettings('v2', 'light')?.colorPresetPrimaryColor).toBe('#111111')
  })

  it('keeps non-color quick-start settings shared across light and dark mode', () => {
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
    expect(getModeSettings('v2', 'dark')?.colorPresetFontFamily).toBe('\'Poppins\', sans-serif')
    expect(getModeSettings('v2', 'dark')?.colorPresetBorderRadius).toBe('pill')
    expect(getModeSettings('v2', 'dark')?.colorPresetCardShadow).toBe('strong')
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

  it('seeds missing dark mode settings from theme defaults', () => {
    presetStore.setState((state) => {
      const lightKey = buildQuickSettingsStorageKey('horizontal-card', 'light')
      return {
        ...state,
        selectedThemeId: 'horizontal-card',
        presetCss: HORIZONTAL_CARD_THEME_CSS,
        colorPresetId: 'custom',
        colorPresetPrimaryColor: '#0b57d0',
        colorPresetSecondaryColor: '#9aa0a6',
        colorPresetFontFamily: 'custom',
        colorPresetBgColor: '#f0f4f9',
        colorPresetBorderRadius: 'rounded',
        colorPresetCardShadow: 'strong',
        colorPresetHeadingFontFamily: 'custom',
        presetQuickSettings: {
          [lightKey]: {
            colorPresetId: 'custom',
            colorPresetPrimaryColor: '#0b57d0',
            colorPresetSecondaryColor: '#9aa0a6',
            colorPresetFontFamily: 'custom',
            colorPresetBgColor: '#f0f4f9',
            colorPresetBorderRadius: 'rounded',
            colorPresetCardShadow: 'strong',
            colorPresetHeadingFontFamily: 'custom',
            showClientName: state.showClientName,
            showRealmName: state.showRealmName,
            infoMessage: state.infoMessage,
            imprintUrl: state.imprintUrl,
            dataProtectionUrl: state.dataProtectionUrl,
          },
        },
      }
    })

    coreActions.toggleDarkMode()

    const darkSettings = getModeSettings('horizontal-card', 'dark')
    expect(coreStore.getState().isDarkMode).toBe(true)
    expect(darkSettings?.colorPresetPrimaryColor).toBe('#a8c7fa')
    expect(darkSettings?.colorPresetBgColor).toBe('#1e1f20')
    expect(darkSettings?.colorPresetBorderRadius).toBe('rounded')
    expect(darkSettings?.colorPresetCardShadow).toBe('strong')
  })

  it('applies imported quick settings by mode and updates global content from active mode', () => {
    coreStore.setState(state => ({ ...state, isDarkMode: false }))

    presetActions.applyImportedQuickSettingsForPreset('v2', {
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

    expect(getModeSettings('v2', 'light')?.colorPresetPrimaryColor).toBe('#123456')
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#a8c7fa')
    expect(presetStore.getState().infoMessage).toBe('light-message')
  })

  it('keeps undo/redo scoped per mode', () => {
    presetActions.setQuickStartStyle('#111111', '#bbbbbb', 'custom')
    coreActions.toggleDarkMode()

    presetActions.setQuickStartStyle('#222222', '#bbbbbb', 'custom')
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#222222')
    expect(historyActions.undo()).toBe(true)
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#0066cc')
    expect(historyActions.redo()).toBe(true)
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#222222')

    coreActions.toggleDarkMode()
    expect(getModeSettings('v2', 'light')?.colorPresetPrimaryColor).toBe('#111111')
  })
})
