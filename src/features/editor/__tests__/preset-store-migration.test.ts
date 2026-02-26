import { describe, expect, it } from 'vitest'
import { buildQuickSettingsStorageKey } from '../quick-settings'
import { createDefaultPresetState, migratePresetState } from '../stores/preset-store'

describe('preset store migration', () => {
  it('keeps legacy presetQuickSettings and restores flat active fields', () => {
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
          showClientName: true,
          showRealmName: false,
          infoMessage: 'hello',
          imprintUrl: 'https://example.com/imprint',
          dataProtectionUrl: 'https://example.com/privacy',
        },
      },
    })

    const lightKey = buildQuickSettingsStorageKey('horizontal-card', 'light')
    expect(migrated.selectedThemeId).toBe('horizontal-card')
    expect(migrated.presetCss).toBe('.demo { color: red; }')
    expect(migrated.colorPresetPrimaryColor).toBe('#111111')
    expect(migrated.showClientName).toBe(true)
    expect(migrated.presetQuickSettings?.[lightKey]?.colorPresetPrimaryColor).toBe('#111111')
    expect(migrated.presetQuickSettings?.[lightKey]?.colorPresetBorderRadius).toBe('rounded')
  })

  it('migrates quickSettingsByThemeMode into presetQuickSettings and backfills content', () => {
    const migrated = migratePresetState({
      selectedThemeId: 'v2',
      showClientName: true,
      infoMessage: 'hello',
      quickSettingsByThemeMode: {
        'v2::light': {
          colorPresetId: 'custom',
          colorPresetPrimaryColor: '#123456',
          colorPresetSecondaryColor: '#abcdef',
          colorPresetFontFamily: 'custom',
          colorPresetBgColor: '#f5f5f5',
          colorPresetBorderRadius: 'pill',
          colorPresetCardShadow: 'subtle',
          colorPresetHeadingFontFamily: 'custom',
        },
      },
    })

    const lightKey = buildQuickSettingsStorageKey('v2', 'light')
    expect(migrated.presetQuickSettings?.[lightKey]?.colorPresetPrimaryColor).toBe('#123456')
    expect(migrated.presetQuickSettings?.[lightKey]?.showClientName).toBe(true)
    expect(migrated.colorPresetPrimaryColor).toBe('#123456')
  })

  it('returns defaults for empty persisted state', () => {
    const migrated = migratePresetState(undefined)
    const defaults = createDefaultPresetState()
    expect(migrated.selectedThemeId).toBe(defaults.selectedThemeId)
    expect(migrated.presetQuickSettings).toBeDefined()
  })
})
