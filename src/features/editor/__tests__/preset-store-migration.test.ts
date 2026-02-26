import { describe, expect, it } from 'vitest'
import { buildQuickSettingsStorageKey } from '../quick-settings'
import { createDefaultPresetState, migratePresetState } from '../stores/preset-store'

describe('preset store migration', () => {
  it('migrates legacy presetQuickSettings into quickSettingsByThemeMode', () => {
    const migrated = migratePresetState({
      selectedThemeId: 'horizontal-card',
      presetCss: '.demo { color: red; }',
      showClientName: true,
      showRealmName: false,
      infoMessage: 'hello',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: 'https://example.com/privacy',
      presetQuickSettings: {
        'horizontal-card::light': {
          colorPresetPrimaryColor: '#111111',
          colorPresetSecondaryColor: '#222222',
          colorPresetFontFamily: 'custom',
          colorPresetBgColor: '#f0f4f9',
          colorPresetBorderRadius: 'rounded',
          colorPresetCardShadow: 'strong',
          colorPresetHeadingFontFamily: 'custom',
          colorPresetId: 'custom',
        },
      },
    })

    const lightKey = buildQuickSettingsStorageKey('horizontal-card', 'light')
    expect(migrated.selectedThemeId).toBe('horizontal-card')
    expect(migrated.presetCss).toBe('.demo { color: red; }')
    expect(migrated.showClientName).toBe(true)
    expect(migrated.quickSettingsByThemeMode?.[lightKey]?.colorPresetPrimaryColor).toBe('#111111')
    expect(migrated.quickSettingsByThemeMode?.[lightKey]?.colorPresetBorderRadius).toBe('rounded')
  })

  it('backfills missing mode map from legacy flat fields', () => {
    const migrated = migratePresetState({
      selectedThemeId: 'v2',
      colorPresetId: 'custom',
      colorPresetPrimaryColor: '#123456',
      colorPresetSecondaryColor: '#abcdef',
      colorPresetFontFamily: 'custom',
      colorPresetBgColor: '#f5f5f5',
      colorPresetBorderRadius: 'pill',
      colorPresetCardShadow: 'subtle',
      colorPresetHeadingFontFamily: 'custom',
    })

    const lightKey = buildQuickSettingsStorageKey('v2', 'light')
    const darkKey = buildQuickSettingsStorageKey('v2', 'dark')
    expect(migrated.quickSettingsByThemeMode?.[lightKey]?.colorPresetPrimaryColor).toBe('#123456')
    expect(migrated.quickSettingsByThemeMode?.[darkKey]?.colorPresetPrimaryColor).toBe('#123456')
    expect(migrated.quickSettingsByThemeMode?.[lightKey]?.colorPresetBorderRadius).toBe('pill')
  })

  it('returns defaults for empty persisted state', () => {
    const migrated = migratePresetState(undefined)
    const defaults = createDefaultPresetState()
    expect(migrated.selectedThemeId).toBe(defaults.selectedThemeId)
    expect(migrated.quickSettingsByThemeMode).toBeDefined()
  })
})
