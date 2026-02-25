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
    coreStore.setState(state => ({ ...state, activePageId }))
  },

  setActiveStoryId: (activeStoryId: string) => {
    coreStore.setState(state => ({ ...state, activeStoryId }))
  },

  setSelectedNodeId: (selectedNodeId: string | null) => {
    coreStore.setState(state => ({ ...state, selectedNodeId }))
  },

  setPreviewReady: (previewReady: boolean) => {
    coreStore.setState(state => ({ ...state, previewReady }))
  },

  setDeviceId: (deviceId: 'desktop' | 'tablet' | 'mobile') => {
    coreStore.setState(state => ({ ...state, deviceId }))
  },

  toggleDarkMode: () => {
    const {
      showClientName,
      showRealmName,
      infoMessage,
      imprintUrl,
      dataProtectionUrl,
    } = presetStore.state
    const currentThemeKey = presetStore.state.selectedThemeId || 'v2'
    const currentMode = resolveQuickSettingsMode(coreStore.state.isDarkMode)
    presetActions.saveQuickSettingsForPreset(currentThemeKey, currentMode)

    const newMode = toggleDarkModeUtil()
    coreStore.setState(state => ({ ...state, isDarkMode: newMode }))
    historyActions.syncActiveScopeFromEditor()

    const nextMode = resolveQuickSettingsMode(newMode)
    const hasRestoredSettings = presetActions.restoreQuickSettingsForPreset(currentThemeKey, nextMode)
    if (!hasRestoredSettings) {
      presetActions.applyThemeModeDefaults(nextMode, themeStore.state.themeQuickStartDefaults)
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
