import { toggleDarkMode as toggleDarkModeUtil } from '../lib/dark-mode'
import { getThemeStorageKey, resolveQuickSettingsMode } from '../lib/quick-settings'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { quickStartExtrasActions as presetActions } from './quick-start-extras-actions'

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
    const currentThemeKey = getThemeStorageKey(presetState.selectedThemeId)
    const currentMode = resolveQuickSettingsMode(coreStore.getState().isDarkMode)
    presetActions.saveQuickSettingsForPreset(currentThemeKey, currentMode)

    const newMode = toggleDarkModeUtil()
    coreStore.setState({ isDarkMode: newMode })

    const nextMode = resolveQuickSettingsMode(newMode)
    const hasRestoredSettings = presetActions.restoreQuickSettingsForPreset(currentThemeKey, nextMode)
    if (!hasRestoredSettings) {
      presetActions.applyThemeModeDefaults(nextMode, themeStore.getState().themeQuickStartDefaults, {
        preserveSharedValues: true,
      })
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
