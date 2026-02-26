import type { PresetState, QuickSettingsStyle } from './types'
import { DEFAULT_THEME_ID } from '../quick-settings'
import { PRESET_STORE_STORAGE_KEY } from '../storage-keys'
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

export const DEFAULT_QUICK_START_CONTENT = {
  showClientName: false,
  showRealmName: true,
  infoMessage: '',
  imprintUrl: '',
  dataProtectionUrl: '',
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

/**
 * Preset Store - Manages design presets and quick-start configuration
 */
export const presetStore = createPersistedEditorStore<PresetState>(createDefaultPresetState(), {
  name: PRESET_STORE_STORAGE_KEY,
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
