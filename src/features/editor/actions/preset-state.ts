import type { QuickSettingsMode } from '../lib/quick-settings'
import { coreStore } from '../stores/core-store'

export type { QuickSettingsMode }

export function normalizeQuickSettingsMode(mode: QuickSettingsMode | undefined): QuickSettingsMode {
  return mode === 'dark' ? 'dark' : 'light'
}

export function getCurrentQuickSettingsMode(): QuickSettingsMode {
  return coreStore.getState().isDarkMode ? 'dark' : 'light'
}
