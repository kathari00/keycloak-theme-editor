import type { PresetState, QuickSettingsStyle } from './types'
import { DEFAULT_THEME_ID } from '../lib/quick-settings'
import { PRESET_STORE_STORAGE_KEY } from '../lib/storage-keys'
import { createPersistedEditorStore } from './create-editor-store'

export const DEFAULT_QUICK_SETTINGS_STYLE: QuickSettingsStyle = {
  colorPresetId: 'keycloak-default',
  colorPresetPrimaryColor: '#0066cc',
  colorPresetSecondaryColor: '#c0c0c0',
  colorPresetFontFamily: 'custom',
  colorPresetBgColor: '',
  colorPresetBorderRadius: 'sharp',
  colorPresetCardShadow: 'subtle',
  colorPresetHeadingFontFamily: 'custom',
}

export const DEFAULT_IMPRINT_LABEL = 'Imprint'
export const DEFAULT_DATA_PROTECTION_LABEL = 'Data Protection'

export const DEFAULT_QUICK_START_CONTENT = {
  showClientName: false,
  showRealmName: false,
  infoMessage: '',
  imprintUrl: '',
  dataProtectionUrl: '',
  imprintLabel: DEFAULT_IMPRINT_LABEL,
  dataProtectionLabel: DEFAULT_DATA_PROTECTION_LABEL,
}

export function createDefaultPresetState(): PresetState {
  return {
    selectedThemeId: DEFAULT_THEME_ID,
    presetCss: '',
    quickSettingsStylesByThemeMode: {},
    enabledLocales: [],
    quickStartContentByLocale: {},
    frameworkIdByTheme: {},
    bootstrapVariantIdByTheme: {},
    layoutIdByTheme: {},
    ...DEFAULT_QUICK_SETTINGS_STYLE,
    ...DEFAULT_QUICK_START_CONTENT,
  }
}

const PRESET_STORE_VERSION = 1

/** `modern-card`/`horizontal-card` were split into the `custom` style plus a separate layout pick. */
export function migratePresetState(persistedState: unknown): Partial<PresetState> {
  if (!persistedState || typeof persistedState !== 'object') {
    return persistedState as Partial<PresetState>
  }

  const state = persistedState as Partial<PresetState>
  if (state.selectedThemeId !== 'modern-card' && state.selectedThemeId !== 'horizontal-card') {
    return state
  }

  const wasHorizontalCard = state.selectedThemeId === 'horizontal-card'
  return {
    ...state,
    selectedThemeId: 'custom',
    layoutIdByTheme: wasHorizontalCard
      ? { ...state.layoutIdByTheme, custom: 'horizontal' }
      : state.layoutIdByTheme,
  }
}

/**
 * Preset Store - Manages design presets and quick-start configuration
 */
export const presetStore = createPersistedEditorStore<PresetState>(createDefaultPresetState(), {
  name: PRESET_STORE_STORAGE_KEY,
  version: PRESET_STORE_VERSION,
  migrate: persistedState => migratePresetState(persistedState),
  partialize: state => ({
    selectedThemeId: state.selectedThemeId,
    presetCss: state.presetCss,
    quickSettingsStylesByThemeMode: state.quickSettingsStylesByThemeMode,
    frameworkIdByTheme: state.frameworkIdByTheme,
    bootstrapVariantIdByTheme: state.bootstrapVariantIdByTheme,
    layoutIdByTheme: state.layoutIdByTheme,
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
    imprintLabel: state.imprintLabel,
    dataProtectionLabel: state.dataProtectionLabel,
    enabledLocales: state.enabledLocales,
    quickStartContentByLocale: state.quickStartContentByLocale,
  }),
})
