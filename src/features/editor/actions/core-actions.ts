import { toggleDarkMode as toggleDarkModeUtil } from '../lib/dark-mode'
import { resolveQuickSettingsMode } from '../lib/quick-settings'
import { coreStore } from '../stores/core-store'
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
    const newMode = toggleDarkModeUtil()
    coreStore.setState({ isDarkMode: newMode })
    const nextMode = resolveQuickSettingsMode(newMode)
    presetActions.applyThemeModeDefaults(nextMode, themeStore.getState().themeQuickStartDefaults)
  },
}
