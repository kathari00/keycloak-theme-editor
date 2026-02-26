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

function toQuickSettings(value: unknown, styleFallback: QuickSettingsStyle, contentFallback: typeof DEFAULT_QUICK_START_CONTENT): QuickSettings {
  const source = (typeof value === 'object' && value !== null) ? value as Partial<QuickSettings> : {}
  const style = toQuickSettingsStyle(source, styleFallback)
  return {
    ...style,
    showClientName: typeof source.showClientName === 'boolean' ? source.showClientName : contentFallback.showClientName,
    showRealmName: typeof source.showRealmName === 'boolean' ? source.showRealmName : contentFallback.showRealmName,
    infoMessage: typeof source.infoMessage === 'string' ? source.infoMessage : contentFallback.infoMessage,
    imprintUrl: typeof source.imprintUrl === 'string' ? source.imprintUrl : contentFallback.imprintUrl,
    dataProtectionUrl: typeof source.dataProtectionUrl === 'string' ? source.dataProtectionUrl : contentFallback.dataProtectionUrl,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function createDefaultPresetState(): PresetState {
  return {
    selectedThemeId: DEFAULT_THEME_ID,
    presetCss: '',
    ...DEFAULT_QUICK_SETTINGS_STYLE,
    ...DEFAULT_QUICK_START_CONTENT,
    presetQuickSettings: {},
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

  const content = {
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
  }

  const legacyFlatStyle = toQuickSettingsStyle(persistedState, DEFAULT_QUICK_SETTINGS_STYLE)
  const migratedPresetQuickSettings: Record<string, QuickSettings> = {}

  const legacyPresetQuickSettings = isRecord((persistedState as { presetQuickSettings?: unknown }).presetQuickSettings)
    ? (persistedState as { presetQuickSettings: Record<string, unknown> }).presetQuickSettings
    : null
  const legacyQuickSettingsByThemeMode = isRecord((persistedState as { quickSettingsByThemeMode?: unknown }).quickSettingsByThemeMode)
    ? (persistedState as { quickSettingsByThemeMode: Record<string, unknown> }).quickSettingsByThemeMode
    : null

  if (legacyPresetQuickSettings) {
    for (const [key, value] of Object.entries(legacyPresetQuickSettings)) {
      const normalizedKey = key.trim()
      if (!normalizedKey || !normalizedKey.includes('::')) {
        continue
      }
      migratedPresetQuickSettings[normalizedKey] = toQuickSettings(value, legacyFlatStyle, content)
    }
  }

  if (legacyQuickSettingsByThemeMode) {
    for (const [key, value] of Object.entries(legacyQuickSettingsByThemeMode)) {
      const normalizedKey = key.trim()
      if (!normalizedKey || !normalizedKey.includes('::')) {
        continue
      }
      if (migratedPresetQuickSettings[normalizedKey]) {
        continue
      }
      migratedPresetQuickSettings[normalizedKey] = toQuickSettings(value, legacyFlatStyle, content)
    }
  }

  if (Object.keys(migratedPresetQuickSettings).length === 0) {
    const themeKey = getThemeStorageKey(selectedThemeId)
    const snapshot: QuickSettings = {
      ...legacyFlatStyle,
      ...content,
    }
    migratedPresetQuickSettings[buildQuickSettingsStorageKey(themeKey, 'light')] = { ...snapshot }
    migratedPresetQuickSettings[buildQuickSettingsStorageKey(themeKey, 'dark')] = { ...snapshot }
  }

  const selectedThemeKey = getThemeStorageKey(selectedThemeId)
  const selectedLightKey = buildQuickSettingsStorageKey(selectedThemeKey, 'light')
  const rootSettings
    = migratedPresetQuickSettings[selectedLightKey]
      ?? Object.values(migratedPresetQuickSettings)[0]
      ?? { ...DEFAULT_QUICK_SETTINGS_STYLE, ...content }

  return {
    selectedThemeId,
    presetCss,
    colorPresetId: rootSettings.colorPresetId,
    colorPresetPrimaryColor: rootSettings.colorPresetPrimaryColor,
    colorPresetSecondaryColor: rootSettings.colorPresetSecondaryColor,
    colorPresetFontFamily: rootSettings.colorPresetFontFamily,
    colorPresetBgColor: rootSettings.colorPresetBgColor,
    colorPresetBorderRadius: rootSettings.colorPresetBorderRadius,
    colorPresetCardShadow: rootSettings.colorPresetCardShadow,
    colorPresetHeadingFontFamily: rootSettings.colorPresetHeadingFontFamily,
    ...content,
    presetQuickSettings: migratedPresetQuickSettings,
  }
}

/**
 * Preset Store - Manages design presets and quick-start configuration
 */
export const presetStore = createPersistedEditorStore<PresetState>(createDefaultPresetState(), {
  name: PRESET_STORE_STORAGE_KEY,
  version: 7,
  migrate: migratePresetState,
  partialize: state => ({
    selectedThemeId: state.selectedThemeId,
    presetCss: state.presetCss,
    colorPresetId: state.colorPresetId,
    colorPresetPrimaryColor: state.colorPresetPrimaryColor,
    colorPresetSecondaryColor: state.colorPresetSecondaryColor,
    colorPresetFontFamily: state.colorPresetFontFamily,
    colorPresetBgColor: state.colorPresetBgColor,
    colorPresetBorderRadius: state.colorPresetBorderRadius,
    colorPresetCardShadow: state.colorPresetCardShadow,
    colorPresetHeadingFontFamily: state.colorPresetHeadingFontFamily,
    showClientName: state.showClientName,
    showRealmName: state.showRealmName,
    infoMessage: state.infoMessage,
    imprintUrl: state.imprintUrl,
    dataProtectionUrl: state.dataProtectionUrl,
    presetQuickSettings: state.presetQuickSettings,
  }),
})
