import type { KeycloakPage } from '../../assets/types'
import { getThemeStorageKey } from '../lib/quick-settings'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

function getActiveThemeStorageKey(): string {
  return getThemeStorageKey(presetStore.getState().selectedThemeId)
}

function setStylesCssForActiveTheme(stylesCss: string) {
  const activeThemeKey = getActiveThemeStorageKey()
  themeStore.setState((state) => {
    if (state.stylesCss === stylesCss && state.stylesCssByTheme[activeThemeKey] === stylesCss) {
      return state
    }
    return {
      ...state,
      stylesCss,
      stylesCssByTheme: {
        ...state.stylesCssByTheme,
        [activeThemeKey]: stylesCss,
      },
    }
  })
}

export const themeActions = {
  setBaseCss: (baseCss: string) => {
    themeStore.setState(state => ({ ...state, baseCss }))
  },

  setStylesCss: (stylesCss: string) => {
    setStylesCssForActiveTheme(stylesCss)
  },

  setThemeQuickStartDefaults: (themeQuickStartDefaults: string) => {
    themeStore.setState(state => ({ ...state, themeQuickStartDefaults }))
  },

  setPages: (pages: KeycloakPage[]) => {
    themeStore.setState(state => ({ ...state, pages }))
  },

}
