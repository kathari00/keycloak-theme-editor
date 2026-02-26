import type { QuickSettingsStyle } from '../stores/types'
import { beforeEach, describe, expect, it } from 'vitest'
import { coreActions } from '../actions/core-actions'
import { historyActions } from '../actions/history-actions'
import { presetActions } from '../actions/preset-actions'
import { buildQuickSettingsStorageKey } from '../quick-settings'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { createDefaultPresetState, presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { DARK_MODE_STORAGE_KEY } from '../storage-keys'

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
  historyActions.syncActiveScopeFromEditor()
  themeStore.setState(() => ({
    baseCss: '',
    stylesCss: '',
    stylesCssByTheme: {},
    themeQuickStartDefaults: '',
    pages: [],
  }))
}

describe('quick settings mode separation', () => {
  beforeEach(() => {
    resetStores()
    localStorage.setItem(DARK_MODE_STORAGE_KEY, 'light')
  })

  it('keeps quick settings isolated per mode when toggling dark mode', () => {
    presetActions.setColorPreset('custom', '#111111', '#222222', 'custom')

    coreActions.toggleDarkMode()
    expect(coreStore.getState().isDarkMode).toBe(true)
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#0066cc')

    presetActions.setColorPreset('custom', '#aaaaaa', '#bbbbbb', 'custom')
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#aaaaaa')

    coreActions.toggleDarkMode()
    expect(coreStore.getState().isDarkMode).toBe(false)
    expect(getModeSettings('v2', 'light')?.colorPresetPrimaryColor).toBe('#111111')
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
    expect(darkSettings?.colorPresetCardShadow).toBe('none')
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
    presetActions.setColorPreset('custom', '#111111', '#bbbbbb', 'custom')
    coreActions.toggleDarkMode()

    presetActions.setColorPreset('custom', '#222222', '#bbbbbb', 'custom')
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#222222')
    expect(historyActions.undo()).toBe(true)
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#0066cc')
    expect(historyActions.redo()).toBe(true)
    expect(getModeSettings('v2', 'dark')?.colorPresetPrimaryColor).toBe('#222222')

    coreActions.toggleDarkMode()
    expect(getModeSettings('v2', 'light')?.colorPresetPrimaryColor).toBe('#111111')
  })
})

