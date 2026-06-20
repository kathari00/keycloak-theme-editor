import { beforeEach, describe, expect, it } from 'vitest'
import { importActions } from '../actions/import-actions'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'

function resetStores() {
  coreStore.setState(s => ({ ...s, isDarkMode: false }))
  presetStore.setState(s => ({
    ...s,
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
})
