import { toggleDarkMode as toggleDarkModeUtil } from '../dark-mode'
import { resolveQuickSettingsMode } from '../quick-settings'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { historyActions } from './history-actions'
import { buildQuickSettingsStorageKey, presetActions } from './preset-actions'

export const coreActions = {
  setActivePage: (activePageId: string) => {
    coreStore.setState({ activePageId })
  },

  setActiveStoryId: (activeStoryId: string) => {
    coreStore.setState({ activeStoryId })
  },

  setSelectedNodeId: (selectedNodeId: string | null) => {
    coreStore.setState({ selectedNodeId })
  },

  setPreviewReady: (previewReady: boolean) => {
    coreStore.setState({ previewReady })
  },

  setDeviceId: (deviceId: 'desktop' | 'tablet' | 'mobile') => {
    coreStore.setState({ deviceId })
  },

  toggleDarkMode: () => {
    const currentThemeKey = presetStore.getState().selectedThemeId || 'v2'
    const newMode = toggleDarkModeUtil()
    coreStore.setState({ isDarkMode: newMode })
    historyActions.syncActiveScopeFromEditor()

    const nextMode = resolveQuickSettingsMode(newMode)
    const nextModeStorageKey = buildQuickSettingsStorageKey(currentThemeKey, nextMode)
    const hasSettings = Boolean(presetStore.getState().quickSettingsByThemeMode[nextModeStorageKey])
    if (!hasSettings) {
      presetActions.applyThemeModeDefaults(nextMode, themeStore.getState().themeQuickStartDefaults)
    }
  },
}

