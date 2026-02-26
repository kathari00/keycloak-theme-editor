import type { QuickSettingsMode } from './preset-actions'
import { toggleDarkMode as toggleDarkModeUtil } from '../dark-mode'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { historyActions } from './history-actions'
import { presetActions } from './preset-actions'

function resolveQuickSettingsMode(isDarkMode: boolean): QuickSettingsMode {
  return isDarkMode ? 'dark' : 'light'
}

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
    const presetState = presetStore.getState()
    const {
      showClientName,
      showRealmName,
      infoMessage,
      imprintUrl,
      dataProtectionUrl,
    } = presetState
    const currentThemeKey = presetState.selectedThemeId || 'v2'
    const currentMode = resolveQuickSettingsMode(coreStore.getState().isDarkMode)
    presetActions.saveQuickSettingsForPreset(currentThemeKey, currentMode)

    const newMode = toggleDarkModeUtil()
    coreStore.setState({ isDarkMode: newMode })
    historyActions.syncActiveScopeFromEditor()

    const nextMode = resolveQuickSettingsMode(newMode)
    const hasRestoredSettings = presetActions.restoreQuickSettingsForPreset(currentThemeKey, nextMode)
    if (!hasRestoredSettings) {
      presetActions.applyThemeModeDefaults(nextMode, themeStore.getState().themeQuickStartDefaults)
      presetActions.saveQuickSettingsForPreset(currentThemeKey, nextMode)
      return
    }

    const nextModeStorageKey = `${currentThemeKey}::${nextMode}`
    presetStore.setState((state) => {
      const savedQuickSettings = state.presetQuickSettings[nextModeStorageKey]
      return {
        ...state,
        showClientName,
        showRealmName,
        infoMessage,
        imprintUrl,
        dataProtectionUrl,
        presetQuickSettings: savedQuickSettings
          ? {
              ...state.presetQuickSettings,
              [nextModeStorageKey]: {
                ...savedQuickSettings,
                showClientName,
                showRealmName,
                infoMessage,
                imprintUrl,
                dataProtectionUrl,
              },
            }
          : state.presetQuickSettings,
      }
    })
  },
}
