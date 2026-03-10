import type { KeycloakPage } from '../../assets/types'
import type { PresetState } from '../stores/types'
import { QUICK_START_CSS_PATH } from '../lib/css-files'
import { combineCssFiles, firstFilePath, isQuickStartCssFile } from '../lib/css-files'
import { BORDER_RADIUS_OPTIONS, CARD_SHADOW_OPTIONS, COLOR_REGEX } from '../lib/quick-start-css'
import { getThemeStorageKey } from '../lib/quick-settings'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

function getActiveThemeStorageKey(): string {
  return getThemeStorageKey(presetStore.getState().selectedThemeId)
}

const CSS_VAR_RE = /--quickstart-([\w-]+)\s*:\s*([^;]+)/g

/** Parse quick-start.css text and sync recognized variable values back to the quick-start panel. */
function syncQuickStartCssToPresetStore(css: string): void {
  const vars = new Map<string, string>()
  for (const match of css.matchAll(CSS_VAR_RE)) {
    vars.set(match[1], match[2].trim())
  }
  if (vars.size === 0) return

  const updates: Record<string, unknown> = {}

  const primary = vars.get('primary-color')
  if (primary) updates.colorPresetPrimaryColor = primary

  const secondary = vars.get('secondary-color')
  if (secondary) updates.colorPresetSecondaryColor = secondary

  const font = vars.get('font-family')
  if (font) updates.colorPresetFontFamily = font

  const headingFont = vars.get('heading-font-family')
  if (headingFont) updates.colorPresetHeadingFontFamily = headingFont

  const bg = vars.get('bg-color')
  if (bg) updates.colorPresetBgColor = bg

  const radius = vars.get('border-radius')
  if (radius) {
    const match = BORDER_RADIUS_OPTIONS.find(o => o.px === radius)
    if (match) updates.colorPresetBorderRadius = match.value
  }

  const shadow = vars.get('card-shadow')
  if (shadow) {
    const match = CARD_SHADOW_OPTIONS.find(o => o.css === shadow)
    if (match) updates.colorPresetCardShadow = match.value
  }

  if (Object.keys(updates).length > 0) {
    presetStore.setState(state => ({ ...state, ...updates }))
  }
}

/** Replace a single CSS variable value in-place within a CSS text string. */
function replaceCssVariableValue(css: string, varSuffix: string, newValue: string): string {
  const pattern = new RegExp(`(--quickstart-${varSuffix}\\s*:\\s*)([^;]+)(;)`)
  return css.replace(pattern, `$1${newValue}$3`)
}

/** Map from preset store field → [CSS variable suffix, value transform]. */
function getPresetToCssVarMapping(state: PresetState): [suffix: string, value: string][] {
  const entries: [string, string][] = []
  if (state.colorPresetPrimaryColor) entries.push(['primary-color', state.colorPresetPrimaryColor])
  if (state.colorPresetSecondaryColor) entries.push(['secondary-color', state.colorPresetSecondaryColor])
  if (state.colorPresetFontFamily && state.colorPresetFontFamily !== 'custom') entries.push(['font-family', state.colorPresetFontFamily])
  if (state.colorPresetHeadingFontFamily && state.colorPresetHeadingFontFamily !== 'custom') entries.push(['heading-font-family', state.colorPresetHeadingFontFamily])
  if (state.colorPresetBgColor && COLOR_REGEX.test(state.colorPresetBgColor)) {
    entries.push(['bg-color', state.colorPresetBgColor])
    entries.push(['bg-image', 'none'])
  }
  const radius = BORDER_RADIUS_OPTIONS.find(o => o.value === state.colorPresetBorderRadius)
  if (radius) entries.push(['border-radius', radius.px])
  const shadow = CARD_SHADOW_OPTIONS.find(o => o.value === state.colorPresetCardShadow)
  if (shadow) entries.push(['card-shadow', shadow.css])
  return entries
}

/** Sync panel state changes into the CSS text of themeQuickStartDefaults (in-place variable updates). */
function syncPresetStoreToQuickStartCss(state: PresetState): void {
  const { themeQuickStartDefaults } = themeStore.getState()
  if (!themeQuickStartDefaults) return

  const mappings = getPresetToCssVarMapping(state)
  let updatedCss = themeQuickStartDefaults

  for (const [suffix, value] of mappings) {
    updatedCss = replaceCssVariableValue(updatedCss, suffix, value)
  }

  if (updatedCss === themeQuickStartDefaults) return

  const activeThemeKey = getActiveThemeStorageKey()
  themeStore.setState((s) => {
    const nextFiles = { ...s.stylesCssFiles, [QUICK_START_CSS_PATH]: updatedCss }
    return {
      ...s,
      themeQuickStartDefaults: updatedCss,
      stylesCssFiles: nextFiles,
      stylesCssFilesByTheme: {
        ...s.stylesCssFilesByTheme,
        [activeThemeKey]: nextFiles,
      },
    }
  })
}

/** Subscribe to preset store changes and sync panel values into themeQuickStartDefaults CSS. */
export function subscribeToQuickStartSync(): void {
  const relevantFields = (s: PresetState) => [
    s.colorPresetPrimaryColor,
    s.colorPresetSecondaryColor,
    s.colorPresetFontFamily,
    s.colorPresetHeadingFontFamily,
    s.colorPresetBgColor,
    s.colorPresetBorderRadius,
    s.colorPresetCardShadow,
  ].join('|')

  let lastKey = relevantFields(presetStore.getState())
  presetStore.subscribe((state) => {
    const key = relevantFields(state)
    if (key === lastKey) return
    lastKey = key
    syncPresetStoreToQuickStartCss(state)
  })
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

      // quick-start.css edits update themeQuickStartDefaults, not the user styles combined CSS
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

    // Sync quick-start variable values to the panel outside of themeStore.setState to avoid nested store updates
    if (isQuickStart) {
      syncQuickStartCssToPresetStore(css)
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
