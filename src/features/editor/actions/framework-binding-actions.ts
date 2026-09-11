import type { BootstrapVariantId, FrameworkId } from '../lib/framework-bindings/types'
import { presetStore } from '../stores/preset-store'
import { getActiveThemeKey } from './quick-settings-style-state'

export const frameworkBindingActions = {
  setFrameworkIdForTheme: (frameworkId: FrameworkId, themeId?: string) => {
    const themeKey = getActiveThemeKey(themeId)
    presetStore.setState(state => ({
      frameworkIdByTheme: {
        ...state.frameworkIdByTheme,
        [themeKey]: frameworkId,
      },
    }))
  },
  setBootstrapVariantIdForTheme: (bootstrapVariantId: BootstrapVariantId, themeId?: string) => {
    const themeKey = getActiveThemeKey(themeId)
    presetStore.setState(state => ({
      bootstrapVariantIdByTheme: {
        ...state.bootstrapVariantIdByTheme,
        [themeKey]: bootstrapVariantId,
      },
    }))
  },
}
