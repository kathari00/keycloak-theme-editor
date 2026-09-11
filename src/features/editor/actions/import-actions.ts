import type { QuickSettingsMode } from '../lib/quick-settings'
import type { QuickSettings, QuickSettingsStyle } from '../stores/types'
import { presetStore } from '../stores/preset-store'
import { withoutUndefinedValues } from './css-variable-reader'
import { getCurrentQuickSettingsMode } from './preset-state'
import { applyQuickSettingsStyleUpdate } from './quick-settings-style-state'

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

    if (hasValues(nextContent)) {
      presetStore.setState(nextContent)
    }

    // Delegate per-mode style merging to the single shared mutator (quick-settings-style-state.ts)
    // instead of hand-rolling a second "flat mirrors nested[theme][mode]" implementation here —
    // that duplication was the source of past color-loss/stale-default bugs.
    for (const mode of QUICK_SETTINGS_MODES) {
      const modeStyleUpdate = pickImportedStyleSettings(quickSettingsByMode[mode])
      if (hasValues(modeStyleUpdate)) {
        applyQuickSettingsStyleUpdate(modeStyleUpdate, { mode })
      }
    }
  },
}
