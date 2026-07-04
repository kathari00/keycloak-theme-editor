import { beforeEach, describe, expect, it } from 'vitest'
import { importActions } from '../actions/import-actions'
import { getThemeStorageKey } from '../lib/quick-settings'
import { coreStore } from '../stores/core-store'
import { createDefaultPresetState, presetStore } from '../stores/preset-store'

function resetStores() {
  coreStore.setState(s => ({ ...s, isDarkMode: false }))
  presetStore.setState(() => ({
    ...createDefaultPresetState(),
    showClientName: false,
    showRealmName: false,
    infoMessage: '',
    imprintUrl: '',
    dataProtectionUrl: '',
  }))
}

describe('importActions.applyImportedQuickSettingsForPreset', () => {
  beforeEach(resetStores)

  it('does nothing when called with undefined', () => {
    importActions.applyImportedQuickSettingsForPreset(undefined)
    expect(presetStore.getState().showClientName).toBe(false)
  })

  it('does nothing when no mode-specific settings are present', () => {
    importActions.applyImportedQuickSettingsForPreset({})
    expect(presetStore.getState().showClientName).toBe(false)
  })

  it('applies light mode settings in light mode', () => {
    importActions.applyImportedQuickSettingsForPreset({ light: { showClientName: true } })
    expect(presetStore.getState().showClientName).toBe(true)
  })

  it('applies dark mode settings in dark mode', () => {
    coreStore.setState(s => ({ ...s, isDarkMode: true }))
    importActions.applyImportedQuickSettingsForPreset({ dark: { showClientName: true } })
    expect(presetStore.getState().showClientName).toBe(true)
  })

  it('falls back to light settings when dark is absent in dark mode', () => {
    coreStore.setState(s => ({ ...s, isDarkMode: true }))
    importActions.applyImportedQuickSettingsForPreset({ light: { showClientName: true } })
    expect(presetStore.getState().showClientName).toBe(true)
  })

  it('falls back to dark settings when light is absent in light mode', () => {
    importActions.applyImportedQuickSettingsForPreset({ dark: { showClientName: true } })
    expect(presetStore.getState().showClientName).toBe(true)
  })

  it('ignores undefined values and leaves existing state untouched', () => {
    presetStore.setState(s => ({ ...s, infoMessage: 'existing' }))
    importActions.applyImportedQuickSettingsForPreset({
      light: { showClientName: true, infoMessage: undefined },
    })
    expect(presetStore.getState().showClientName).toBe(true)
    expect(presetStore.getState().infoMessage).toBe('existing')
  })

  it('does nothing when all settings are undefined after filtering', () => {
    importActions.applyImportedQuickSettingsForPreset({
      light: { showClientName: undefined, infoMessage: undefined },
    })
    expect(presetStore.getState().showClientName).toBe(false)
  })

  it('applies all supported content fields', () => {
    importActions.applyImportedQuickSettingsForPreset({
      light: {
        showClientName: true,
        showRealmName: true,
        infoMessage: 'Hello',
        imprintUrl: 'https://example.com/imprint',
        dataProtectionUrl: 'https://example.com/privacy',
      },
    })
    const s = presetStore.getState()
    expect(s.showClientName).toBe(true)
    expect(s.showRealmName).toBe(true)
    expect(s.infoMessage).toBe('Hello')
    expect(s.imprintUrl).toBe('https://example.com/imprint')
    expect(s.dataProtectionUrl).toBe('https://example.com/privacy')
  })

  it('applies imported style fields to the active preset state', () => {
    importActions.applyImportedQuickSettingsForPreset({
      light: {
        colorPresetId: 'custom',
        colorPresetPrimaryColor: '#123456',
        colorPresetSecondaryColor: '#234567',
        colorPresetFontFamily: 'Light Body, sans-serif',
        colorPresetBgColor: '#f0f4f9',
        colorPresetBorderRadius: 'pill',
        colorPresetCardShadow: 'none',
        colorPresetHeadingFontFamily: 'Light Heading, serif',
      },
    })

    const state = presetStore.getState()
    expect(state.colorPresetId).toBe('custom')
    expect(state.colorPresetPrimaryColor).toBe('#123456')
    expect(state.colorPresetSecondaryColor).toBe('#234567')
    expect(state.colorPresetFontFamily).toBe('Light Body, sans-serif')
    expect(state.colorPresetBgColor).toBe('#f0f4f9')
    expect(state.colorPresetBorderRadius).toBe('pill')
    expect(state.colorPresetCardShadow).toBe('none')
    expect(state.colorPresetHeadingFontFamily).toBe('Light Heading, serif')
  })

  it('stores imported light and dark style fields by selected theme', () => {
    presetStore.setState(s => ({ ...s, selectedThemeId: 'modern-card' }))
    importActions.applyImportedQuickSettingsForPreset({
      light: {
        colorPresetId: 'custom',
        colorPresetPrimaryColor: '#123456',
        colorPresetSecondaryColor: '#234567',
        colorPresetFontFamily: 'Light Body, sans-serif',
        colorPresetBgColor: '#f0f4f9',
        colorPresetBorderRadius: 'pill',
        colorPresetCardShadow: 'none',
        colorPresetHeadingFontFamily: 'Light Heading, serif',
      },
      dark: {
        colorPresetId: 'custom',
        colorPresetPrimaryColor: '#abcdef',
        colorPresetSecondaryColor: '#bcdef0',
        colorPresetFontFamily: 'Dark Body, sans-serif',
        colorPresetBgColor: '#1e1f20',
        colorPresetBorderRadius: 'sharp',
        colorPresetCardShadow: 'strong',
        colorPresetHeadingFontFamily: 'Dark Heading, serif',
      },
    })

    const storedStyles = presetStore.getState().quickSettingsStylesByThemeMode[getThemeStorageKey('modern-card')]
    expect(storedStyles?.light?.colorPresetPrimaryColor).toBe('#123456')
    expect(storedStyles?.light?.colorPresetBgColor).toBe('#f0f4f9')
    expect(storedStyles?.light?.colorPresetBorderRadius).toBe('pill')
    expect(storedStyles?.light?.colorPresetCardShadow).toBe('none')
    expect(storedStyles?.dark?.colorPresetPrimaryColor).toBe('#abcdef')
    expect(storedStyles?.dark?.colorPresetBgColor).toBe('#1e1f20')
    expect(storedStyles?.dark?.colorPresetBorderRadius).toBe('sharp')
    expect(storedStyles?.dark?.colorPresetCardShadow).toBe('strong')
  })
})
