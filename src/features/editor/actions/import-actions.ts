import type { QuickSettings } from '../stores/types'
import { presetStore } from '../stores/preset-store'
import { withoutUndefinedValues } from './css-variable-reader'
import { getCurrentQuickSettingsMode } from './preset-state'

interface ImportedQuickSettingsByMode {
  light?: Partial<QuickSettings>
  dark?: Partial<QuickSettings>
}

function pickActiveImportedSettings(quickSettingsByMode: ImportedQuickSettingsByMode): Partial<QuickSettings> | undefined {
  const currentMode = getCurrentQuickSettingsMode()
  return quickSettingsByMode[currentMode] ?? quickSettingsByMode.light ?? quickSettingsByMode.dark
}

export const importActions = {
  applyImportedQuickSettingsForPreset: (quickSettingsByMode?: ImportedQuickSettingsByMode) => {
    if (!quickSettingsByMode) {
      return
    }

    const activeSettings = pickActiveImportedSettings(quickSettingsByMode)
    if (!activeSettings) {
      return
    }

    const nextContent = withoutUndefinedValues({
      showClientName: activeSettings.showClientName,
      showRealmName: activeSettings.showRealmName,
      infoMessage: activeSettings.infoMessage,
      imprintUrl: activeSettings.imprintUrl,
      dataProtectionUrl: activeSettings.dataProtectionUrl,
    })

    if (Object.keys(nextContent).length === 0) {
      return
    }

    presetStore.setState(nextContent)
  },
}
