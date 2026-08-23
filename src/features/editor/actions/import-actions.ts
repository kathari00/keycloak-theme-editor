import type { QuickSettingsMode } from '../lib/quick-settings'
import type { QuickSettings, QuickSettingsStyle, QuickSettingsStylesByMode } from '../stores/types'
import { getThemeStorageKey } from '../lib/quick-settings'
import { presetStore } from '../stores/preset-store'
import { withoutUndefinedValues } from './css-variable-reader'
import { getCurrentQuickSettingsMode } from './preset-state'
import { getQuickSettingsStyleFromPresetState } from './quick-settings-style-state'

interface ImportedQuickSettingsByMode {
  light?: Partial<QuickSettings>
  dark?: Partial<QuickSettings>
}

const QUICK_SETTINGS_MODES: QuickSettingsMode[] = ['light', 'dark']

function pickActiveImportedSettings(
  quickSettingsByMode: ImportedQuickSettingsByMode,
  currentMode: QuickSettingsMode,
): Partial<QuickSettings> | undefined {
  return quickSettingsByMode[currentMode] ?? quickSettingsByMode.light ?? quickSettingsByMode.dark
}

function pickImportedContentSettings(settings: Partial<QuickSettings> | undefined) {
  return withoutUndefinedValues({
    showClientName: settings?.showClientName,
    showRealmName: settings?.showRealmName,
    infoMessage: settings?.infoMessage,
    imprintUrl: settings?.imprintUrl,
    dataProtectionUrl: settings?.dataProtectionUrl,
    imprintLabel: settings?.imprintLabel,
    dataProtectionLabel: settings?.dataProtectionLabel,
  })
}

function pickImportedStyleSettings(settings: Partial<QuickSettings> | undefined): Partial<QuickSettingsStyle> {
  return withoutUndefinedValues({
    colorPresetId: settings?.colorPresetId,
    colorPresetPrimaryColor: settings?.colorPresetPrimaryColor,
    colorPresetSecondaryColor: settings?.colorPresetSecondaryColor,
    colorPresetFontFamily: settings?.colorPresetFontFamily,
    colorPresetBgColor: settings?.colorPresetBgColor,
    colorPresetBorderRadius: settings?.colorPresetBorderRadius,
    colorPresetCardShadow: settings?.colorPresetCardShadow,
    colorPresetHeadingFontFamily: settings?.colorPresetHeadingFontFamily,
  })
}

function hasValues(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0
}

function buildImportedStylesByMode(
  quickSettingsByMode: ImportedQuickSettingsByMode,
  existingStyles: QuickSettingsStylesByMode,
  fallbackStyle: QuickSettingsStyle,
): QuickSettingsStylesByMode {
  const nextStyles: QuickSettingsStylesByMode = {}

  for (const mode of QUICK_SETTINGS_MODES) {
    const styleUpdate = pickImportedStyleSettings(quickSettingsByMode[mode])
    if (!hasValues(styleUpdate)) {
      continue
    }

    nextStyles[mode] = {
      ...(existingStyles[mode] ?? fallbackStyle),
      ...styleUpdate,
    }
  }

  return nextStyles
}

export const importActions = {
  applyImportedQuickSettingsForPreset: (quickSettingsByMode?: ImportedQuickSettingsByMode) => {
    if (!quickSettingsByMode) {
      return
    }

    const currentMode = getCurrentQuickSettingsMode()
    const activeSettings = pickActiveImportedSettings(quickSettingsByMode, currentMode)
    if (!activeSettings) {
      return
    }

    const nextContent = pickImportedContentSettings(activeSettings)
    const nextActiveStyle = pickImportedStyleSettings(activeSettings)

    if (!hasValues(nextContent) && !hasValues(nextActiveStyle)) {
      return
    }

    presetStore.setState((state) => {
      const themeKey = getThemeStorageKey(state.selectedThemeId)
      const existingStyles = state.quickSettingsStylesByThemeMode[themeKey] ?? {}
      const currentStyle = getQuickSettingsStyleFromPresetState(state)
      const importedStylesByMode = buildImportedStylesByMode(quickSettingsByMode, existingStyles, currentStyle)
      const nextThemeStyles = hasValues(importedStylesByMode)
        ? { ...existingStyles, ...importedStylesByMode }
        : existingStyles

      return {
        ...nextContent,
        ...nextActiveStyle,
        quickSettingsStylesByThemeMode: hasValues(importedStylesByMode)
          ? {
              ...state.quickSettingsStylesByThemeMode,
              [themeKey]: nextThemeStyles,
            }
          : state.quickSettingsStylesByThemeMode,
      }
    })
  },
}
