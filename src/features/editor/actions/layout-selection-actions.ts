import type { LayoutId } from '../lib/layouts/types'
import { presetStore } from '../stores/preset-store'
import { getActiveThemeKey } from './quick-settings-style-state'

export const layoutSelectionActions = {
  setLayoutIdForTheme: (layoutId: LayoutId, themeId?: string) => {
    const themeKey = getActiveThemeKey(themeId)
    presetStore.setState(state => ({
      layoutIdByTheme: {
        ...state.layoutIdByTheme,
        [themeKey]: layoutId,
      },
    }))
  },
}
