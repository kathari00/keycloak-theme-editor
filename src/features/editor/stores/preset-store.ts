import type { PresetState, QuickSettings, QuickSettingsStyle } from './types'
import { buildQuickSettingsStorageKey, DEFAULT_THEME_ID, getThemeStorageKey } from '../quick-settings'
import { createPersistedEditorStore } from './create-editor-store'
import { PRESET_STORE_STORAGE_KEY } from '../storage-keys'

export const DEFAULT_QUICK_SETTINGS_STYLE: QuickSettingsStyle = {
  colorPresetId: 'keycloak-default',
  colorPresetPrimaryColor: '#0066cc',
  colorPresetSecondaryColor: '#c0c0c0',
  colorPresetFontFamily: 'custom',
  colorPresetBgColor: '',
  colorPresetBorderRadius: 'default',
  colorPresetCardShadow: 'default',
  colorPresetHeadingFontFamily: 'custom',
}

export const DEFAULT_QUICK_START_CONTENT = {
  showClientName: false,
  showRealmName: true,
  infoMessage: '',
  imprintUrl: '',
  dataProtectionUrl: '',
}

function cloneDefaultQuickSettingsStyle(): QuickSettingsStyle {
  return { ...DEFAULT_QUICK_SETTINGS_STYLE }
}

function toQuickSettingsStyle(value: unknown, fallback: QuickSettingsStyle): QuickSettingsStyle {
  const source = (typeof value === 'object' && value !== null) ? value as Partial<QuickSettings> : {}
  return {
    colorPresetId: typeof source.colorPresetId === 'string' ? source.colorPresetId : fallback.colorPresetId,
    colorPresetPrimaryColor: typeof source.colorPresetPrimaryColor === 'string' ? source.colorPresetPrimaryColor : fallback.colorPresetPrimaryColor,
    colorPresetSecondaryColor: typeof source.colorPresetSecondaryColor === 'string' ? source.colorPresetSecondaryColor : fallback.colorPresetSecondaryColor,
    colorPresetFontFamily: typeof source.colorPresetFontFamily === 'string' ? source.colorPresetFontFamily : fallback.colorPresetFontFamily,
    colorPresetBgColor: typeof source.colorPresetBgColor === 'string' ? source.colorPresetBgColor : fallback.colorPresetBgColor,
    colorPresetBorderRadius: source.colorPresetBorderRadius === 'sharp'
      || source.colorPresetBorderRadius === 'rounded'
      || source.colorPresetBorderRadius === 'pill'
      || source.colorPresetBorderRadius === 'default'
      ? source.colorPresetBorderRadius
      : fallback.colorPresetBorderRadius,
    colorPresetCardShadow: source.colorPresetCardShadow === 'none'
      || source.colorPresetCardShadow === 'subtle'
      || source.colorPresetCardShadow === 'strong'
      || source.colorPresetCardShadow === 'default'
      ? source.colorPresetCardShadow
      : fallback.colorPresetCardShadow,
    colorPresetHeadingFontFamily: typeof source.colorPresetHeadingFontFamily === 'string'
      ? source.colorPresetHeadingFontFamily
      : fallback.colorPresetHeadingFontFamily,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function createDefaultPresetState(): PresetState {
  return {
    selectedThemeId: DEFAULT_THEME_ID,
    presetCss: '',
    ...DEFAULT_QUICK_START_CONTENT,
    quickSettingsByThemeMode: {
      [buildQuickSettingsStorageKey(DEFAULT_THEME_ID, 'light')]: cloneDefaultQuickSettingsStyle(),
      [buildQuickSettingsStorageKey(DEFAULT_THEME_ID, 'dark')]: cloneDefaultQuickSettingsStyle(),
    },
  }
}

export function migratePresetState(persistedState: unknown): Partial<PresetState> {
  const defaults = createDefaultPresetState()
  if (!isRecord(persistedState)) {
    return defaults
  }

  const selectedThemeId = typeof persistedState.selectedThemeId === 'string'
    ? persistedState.selectedThemeId
    : defaults.selectedThemeId
  const presetCss = typeof persistedState.presetCss === 'string'
    ? persistedState.presetCss
    : defaults.presetCss

  const migratedQuickSettingsByThemeMode: Record<string, QuickSettingsStyle> = {}
  const quickSettingsByThemeMode = isRecord(persistedState.quickSettingsByThemeMode)
    ? persistedState.quickSettingsByThemeMode
    : null
  const legacyPresetQuickSettings = isRecord((persistedState as any).presetQuickSettings)
    ? (persistedState as any).presetQuickSettings as Record<string, unknown>
    : null

  const sourceMaps = [quickSettingsByThemeMode, legacyPresetQuickSettings].filter(
    (value): value is Record<string, unknown> => value !== null,
  )
  for (const sourceMap of sourceMaps) {
    for (const [key, value] of Object.entries(sourceMap)) {
      const normalizedKey = key.trim()
      if (!normalizedKey || !normalizedKey.includes('::')) {
        continue
      }
      migratedQuickSettingsByThemeMode[normalizedKey] = toQuickSettingsStyle(value, DEFAULT_QUICK_SETTINGS_STYLE)
    }
  }

  const legacyStyleFallback = toQuickSettingsStyle(persistedState, DEFAULT_QUICK_SETTINGS_STYLE)
  if (Object.keys(migratedQuickSettingsByThemeMode).length === 0) {
    const themeKey = getThemeStorageKey(selectedThemeId)
    migratedQuickSettingsByThemeMode[buildQuickSettingsStorageKey(themeKey, 'light')] = { ...legacyStyleFallback }
    migratedQuickSettingsByThemeMode[buildQuickSettingsStorageKey(themeKey, 'dark')] = { ...legacyStyleFallback }
  }

  return {
    selectedThemeId,
    presetCss,
    showClientName: typeof persistedState.showClientName === 'boolean'
      ? persistedState.showClientName
      : defaults.showClientName,
    showRealmName: typeof persistedState.showRealmName === 'boolean'
      ? persistedState.showRealmName
      : defaults.showRealmName,
    infoMessage: typeof persistedState.infoMessage === 'string'
      ? persistedState.infoMessage
      : defaults.infoMessage,
    imprintUrl: typeof persistedState.imprintUrl === 'string'
      ? persistedState.imprintUrl
      : defaults.imprintUrl,
    dataProtectionUrl: typeof persistedState.dataProtectionUrl === 'string'
      ? persistedState.dataProtectionUrl
      : defaults.dataProtectionUrl,
    quickSettingsByThemeMode: migratedQuickSettingsByThemeMode,
  }
}

/**
 * Preset Store - Manages design presets and quick-start configuration
 */
export const presetStore = createPersistedEditorStore<PresetState>(createDefaultPresetState(), {
  name: PRESET_STORE_STORAGE_KEY,
  version: 6,
  migrate: migratePresetState,
  partialize: state => ({
    selectedThemeId: state.selectedThemeId,
    presetCss: state.presetCss,
    showClientName: state.showClientName,
    showRealmName: state.showRealmName,
    infoMessage: state.infoMessage,
    imprintUrl: state.imprintUrl,
    dataProtectionUrl: state.dataProtectionUrl,
    quickSettingsByThemeMode: state.quickSettingsByThemeMode,
  }),
})
