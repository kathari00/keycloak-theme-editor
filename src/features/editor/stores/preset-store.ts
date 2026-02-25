import type { PresetState, QuickSettings } from './types'
import { createPersistedEditorStore } from './create-editor-store'

/**
 * Preset Store - Manages design presets and color configuration
 *
 * This store handles:
 * - Design presets (Keycloak v2, Modern Gradient, Horizontal Card, etc.)
 * - Color presets (Quick Start panel color configuration)
 * - Per-preset/per-mode quick settings persistence
 */
export const presetStore = createPersistedEditorStore<PresetState>({
  selectedThemeId: 'v2',
  presetCss: '',
  colorPresetId: 'keycloak-default',
  colorPresetPrimaryColor: '#0066cc',
  colorPresetSecondaryColor: '#c0c0c0',
  colorPresetFontFamily: 'custom',
  colorPresetBgColor: '',
  colorPresetBorderRadius: 'default',
  colorPresetCardShadow: 'default',
  colorPresetHeadingFontFamily: 'custom',
  showClientName: false,
  showRealmName: true,
  infoMessage: '',
  imprintUrl: '',
  dataProtectionUrl: '',
  presetQuickSettings: {},
}, {
  name: 'keycloak-editor-preset',
  version: 4,
  migrate: (persistedState) => {
    const LEGACY_V2_DEFAULT_FONT = '\'RedHatDisplay\', sans-serif'
    const HORIZONTAL_CARD_LIGHT_PRIMARY = '#0b57d0'
    const HORIZONTAL_CARD_LIGHT_BG = '#f0f4f9'
    const HORIZONTAL_CARD_DARK_PRIMARY = '#a8c7fa'
    const HORIZONTAL_CARD_DARK_BG = '#1e1f20'

    if (!persistedState || typeof persistedState !== 'object') {
      return persistedState as Partial<PresetState>
    }

    const state = persistedState as Partial<PresetState>
    let nextState = state

    const normalizeLegacyDefaultFont = <T extends { colorPresetFontFamily?: string }>(value: T): T => {
      if (value.colorPresetFontFamily === LEGACY_V2_DEFAULT_FONT) {
        return {
          ...value,
          colorPresetFontFamily: 'custom',
        }
      }
      return value
    }

    if ((state.selectedThemeId || '').trim() === 'v2') {
      const normalizedRoot = normalizeLegacyDefaultFont(state)
      if (normalizedRoot !== state) {
        nextState = normalizedRoot
      }
    }

    if (state.presetQuickSettings) {
      let mapChanged = false
      const normalizedMap = Object.fromEntries(
        Object.entries(state.presetQuickSettings).map(([key, settings]) => {
          if (!(key === 'v2' || key.startsWith('v2::'))) {
            return [key, settings]
          }
          const normalizedSettings = normalizeLegacyDefaultFont(settings as QuickSettings)
          if (normalizedSettings !== settings) {
            mapChanged = true
          }
          return [key, normalizedSettings]
        }),
      ) as Record<string, QuickSettings>

      const horizontalCardLight = normalizedMap['horizontal-card::light']
      const horizontalCardDark = normalizedMap['horizontal-card::dark']
      const looksLikeLegacyMirroredDarkDefaults
        = Boolean(horizontalCardDark)
          && horizontalCardDark.colorPresetPrimaryColor === HORIZONTAL_CARD_LIGHT_PRIMARY
          && horizontalCardDark.colorPresetBgColor === HORIZONTAL_CARD_LIGHT_BG
          && (!horizontalCardLight
            || (
              horizontalCardLight.colorPresetPrimaryColor === horizontalCardDark.colorPresetPrimaryColor
              && horizontalCardLight.colorPresetBgColor === horizontalCardDark.colorPresetBgColor
            ))

      if (looksLikeLegacyMirroredDarkDefaults && horizontalCardDark) {
        normalizedMap['horizontal-card::dark'] = {
          ...horizontalCardDark,
          colorPresetPrimaryColor: HORIZONTAL_CARD_DARK_PRIMARY,
          colorPresetBgColor: HORIZONTAL_CARD_DARK_BG,
        }
        mapChanged = true
      }

      if (mapChanged) {
        nextState = {
          ...nextState,
          presetQuickSettings: normalizedMap,
        }
      }
    }

    return nextState
  },
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
