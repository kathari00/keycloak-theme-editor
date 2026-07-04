import type { KeycloakPage } from '../../assets/types'
import { combineCssFiles, firstFilePath, isQuickStartCssFile } from '../lib/css-files'
import { getThemeStorageKey } from '../lib/quick-settings'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { replaceQuickSettingsStylesForThemeFromCss } from './quick-settings-style-state'

function getActiveThemeStorageKey(): string {
  return getThemeStorageKey(presetStore.getState().selectedThemeId)
}

export const themeActions = {
  setBaseCss: (baseCss: string) => {
    themeStore.setState(state => ({ ...state, baseCss }))
  },

  /** Update the CSS content of the currently active file tab. */
  setActiveFileCss: (css: string) => {
    const activeThemeKey = getActiveThemeStorageKey()
    const { activeCssFilePath } = themeStore.getState()
    const filePath = activeCssFilePath || firstFilePath(themeStore.getState().stylesCssFiles)
    const isQuickStart = isQuickStartCssFile(filePath)

    themeStore.setState((state) => {
      const nextFiles = { ...state.stylesCssFiles, [filePath]: css }

      if (isQuickStart) {
        return {
          ...state,
          themeQuickStartDefaults: css,
          stylesCssFiles: nextFiles,
          stylesCssFilesByTheme: {
            ...state.stylesCssFilesByTheme,
            [activeThemeKey]: nextFiles,
          },
        }
      }

      const nextCombined = combineCssFiles(nextFiles)
      if (state.stylesCss === nextCombined) {
        return state
      }
      return {
        ...state,
        stylesCss: nextCombined,
        stylesCssFiles: nextFiles,
        stylesCssByTheme: {
          ...state.stylesCssByTheme,
          [activeThemeKey]: nextCombined,
        },
        stylesCssFilesByTheme: {
          ...state.stylesCssFilesByTheme,
          [activeThemeKey]: nextFiles,
        },
      }
    })

    if (isQuickStart) {
      replaceQuickSettingsStylesForThemeFromCss({
        css,
      })
    }
  },

  /** Switch the active CSS file tab. */
  setActiveCssFilePath: (filePath: string) => {
    themeStore.setState(state => ({ ...state, activeCssFilePath: filePath }))
  },

  setThemeQuickStartDefaults: (themeQuickStartDefaults: string) => {
    themeStore.setState(state => ({ ...state, themeQuickStartDefaults }))
  },

  setPages: (pages: KeycloakPage[]) => {
    themeStore.setState(state => ({ ...state, pages }))
  },

}
