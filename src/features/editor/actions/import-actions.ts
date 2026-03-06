import type { QuickSettingsMode } from '../lib/quick-settings'
import type { QuickSettings } from '../stores/types'
import { getThemeStorageKey } from '../lib/quick-settings'
import { presetStore } from '../stores/preset-store'
import { buildQuickSettingsSnapshot, withoutUndefinedValues } from './css-variable-reader'
import { buildQuickSettingsKey, getCurrentQuickSettingsMode } from './preset-state'

interface ImportedQuickSettingsByMode {
  light?: Partial<QuickSettings>
  dark?: Partial<QuickSettings>
}

export const importActions = {
  applyImportedQuickSettingsForPreset: (themeId: string, quickSettingsByMode?: ImportedQuickSettingsByMode) => {
    if (!quickSettingsByMode || (!quickSettingsByMode.light && !quickSettingsByMode.dark)) {
      return
    }

    const normalizedThemeId = getThemeStorageKey(themeId)
    const currentMode = getCurrentQuickSettingsMode()
    const currentModeKey = buildQuickSettingsKey(normalizedThemeId, currentMode)

    presetStore.setState((state) => {
      const nextPresetQuickSettings = { ...state.presetQuickSettings }
      const fallbackSettings = buildQuickSettingsSnapshot(state)

      const applyModeSettings = (mode: QuickSettingsMode, partialSettings?: Partial<QuickSettings>) => {
        if (!partialSettings) {
          return
        }
        const modeKey = buildQuickSettingsKey(normalizedThemeId, mode)
        const baseSettings = nextPresetQuickSettings[modeKey] ?? fallbackSettings
        nextPresetQuickSettings[modeKey] = {
          ...baseSettings,
          ...withoutUndefinedValues(partialSettings),
        }
      }

      applyModeSettings('light', quickSettingsByMode.light)
      applyModeSettings('dark', quickSettingsByMode.dark)

      const activeModeSettings = nextPresetQuickSettings[currentModeKey]
      if (!activeModeSettings) {
        return { presetQuickSettings: nextPresetQuickSettings }
      }

      return {
        ...activeModeSettings,
        presetQuickSettings: nextPresetQuickSettings,
      }
    })
  },
}
