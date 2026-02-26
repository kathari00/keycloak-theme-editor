import type { KeycloakPage } from '../../assets/types'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

const DEFAULT_THEME_ID = 'v2'

function getActiveThemeStorageKey(): string {
  const selectedThemeId = (presetStore.getState().selectedThemeId || '').trim()
  return selectedThemeId || DEFAULT_THEME_ID
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

