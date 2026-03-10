import type { KeycloakPage } from '../../assets/types'
import type { PresetState } from '../stores/types'
import { getUploadedImageCssVarName } from '../../assets/font-css-generator'
import { combineCssFiles, firstFilePath, isQuickStartCssFile, QUICK_START_CSS_PATH } from '../lib/css-files'
import { getThemeStorageKey } from '../lib/quick-settings'
import { BORDER_RADIUS_OPTIONS, CARD_SHADOW_OPTIONS, COLOR_REGEX } from '../lib/quick-start-css'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

function getActiveThemeStorageKey(): string {
  return getThemeStorageKey(presetStore.getState().selectedThemeId)
}

const CSS_VAR_RE = /--quickstart-([\w-]+)\s*:\s*([^;]+)/g
const AUTO_SWITCH_COLOR_SUFFIXES = new Set(['primary-color', 'secondary-color', 'bg-color'])

function getCurrentQuickStartColorMode(): 'light' | 'dark' {
  return coreStore.getState().isDarkMode ? 'dark' : 'light'
}

function getCurrentModeColorValue(
  vars: Map<string, string>,
  suffix: 'primary-color' | 'secondary-color' | 'bg-color',
): string {
  return vars.get(`${suffix}-${getCurrentQuickStartColorMode()}`)?.trim() || ''
}

/** Parse quick-start.css text and sync recognized variable values back to the quick-start panel. */
function syncQuickStartCssToPresetStore(css: string): void {
  const vars = new Map<string, string>()
  for (const match of css.matchAll(CSS_VAR_RE)) {
    vars.set(match[1], match[2].trim())
  }
  if (vars.size === 0)
    return

  presetStore.setState(state => ({
    ...state,
    colorPresetPrimaryColor: getCurrentModeColorValue(vars, 'primary-color') || state.colorPresetPrimaryColor,
    colorPresetSecondaryColor: getCurrentModeColorValue(vars, 'secondary-color') || state.colorPresetSecondaryColor,
    colorPresetFontFamily: vars.get('font-family') || state.colorPresetFontFamily,
    colorPresetHeadingFontFamily: vars.get('heading-font-family') || state.colorPresetHeadingFontFamily,
    colorPresetBgColor: getCurrentModeColorValue(vars, 'bg-color') || state.colorPresetBgColor,
    colorPresetBorderRadius: BORDER_RADIUS_OPTIONS.find(o => o.px === vars.get('border-radius'))?.value || state.colorPresetBorderRadius,
    colorPresetCardShadow: CARD_SHADOW_OPTIONS.find(o => o.css === vars.get('card-shadow'))?.value || state.colorPresetCardShadow,
  }))
}

/** Replace a single CSS variable value in-place, or insert it into the first :root block if missing. */
function replaceCssVariableValue(css: string, varSuffix: string, newValue: string): string {
  const varName = `--quickstart-${varSuffix}`
  const pattern = new RegExp(`(${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*)([^;]+)(;)`)
  if (pattern.test(css)) {
    return css.replace(pattern, `$1${newValue}$3`)
  }
  const rootCloseIndex = css.indexOf('}')
  if (rootCloseIndex === -1)
    return css
  return `${css.slice(0, rootCloseIndex)}  ${varName}: ${newValue};\n${css.slice(rootCloseIndex)}`
}

function replacePairedColorVariableValues(css: string, suffix: string, newValue: string): string {
  return replaceCssVariableValue(css, `${suffix}-${getCurrentQuickStartColorMode()}`, newValue)
}

function resolveQuickStartBgImageValue(state: PresetState): string {
  const { appliedAssets, uploadedAssets } = assetStore.getState()
  if (appliedAssets.background) {
    const bgAsset = uploadedAssets.find(asset => asset.id === appliedAssets.background)
    const bgVarName = bgAsset ? getUploadedImageCssVarName(bgAsset) : null
    if (bgVarName) {
      return `var(${bgVarName})`
    }
  }

  if (state.colorPresetBgColor && COLOR_REGEX.test(state.colorPresetBgColor)) {
    return 'none'
  }

  return 'var(--quickstart-bg-logo-url)'
}

/** Map from preset store field -> [CSS variable suffix, value transform]. */
function getPresetToCssVarMapping(state: PresetState): [suffix: string, value: string][] {
  const entries: [string, string][] = []
  if (state.colorPresetPrimaryColor)
    entries.push(['primary-color', state.colorPresetPrimaryColor])
  if (state.colorPresetSecondaryColor)
    entries.push(['secondary-color', state.colorPresetSecondaryColor])
  if (state.colorPresetFontFamily && state.colorPresetFontFamily !== 'custom')
    entries.push(['font-family', state.colorPresetFontFamily])
  if (state.colorPresetHeadingFontFamily && state.colorPresetHeadingFontFamily !== 'custom')
    entries.push(['heading-font-family', state.colorPresetHeadingFontFamily])
  if (state.colorPresetBgColor && COLOR_REGEX.test(state.colorPresetBgColor))
    entries.push(['bg-color', state.colorPresetBgColor])
  const radius = BORDER_RADIUS_OPTIONS.find(o => o.value === state.colorPresetBorderRadius)
  if (radius)
    entries.push(['border-radius', radius.px])
  const shadow = CARD_SHADOW_OPTIONS.find(o => o.value === state.colorPresetCardShadow)
  if (shadow)
    entries.push(['card-shadow', shadow.css])
  return entries
}

/** Sync panel state changes into the CSS text of themeQuickStartDefaults (in-place variable updates). */
function syncPresetStoreToQuickStartCss(state: PresetState): void {
  const { themeQuickStartDefaults } = themeStore.getState()
  if (!themeQuickStartDefaults)
    return

  const mappings = getPresetToCssVarMapping(state)
  let updatedCss = themeQuickStartDefaults

  for (const [suffix, value] of mappings) {
    updatedCss = AUTO_SWITCH_COLOR_SUFFIXES.has(suffix)
      ? replacePairedColorVariableValues(updatedCss, suffix, value)
      : replaceCssVariableValue(updatedCss, suffix, value)
  }

  const nextBgImageValue = resolveQuickStartBgImageValue(state)
  updatedCss = replaceCssVariableValue(updatedCss, 'bg-image', nextBgImageValue)

  if (updatedCss === themeQuickStartDefaults)
    return

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
    if (key === lastKey)
      return
    lastKey = key
    syncPresetStoreToQuickStartCss(state)
  })

  const assetRelevantFields = () => {
    const { appliedAssets, uploadedAssets } = assetStore.getState()
    const bgAsset = uploadedAssets.find(asset => asset.id === appliedAssets.background)
    return [appliedAssets.background || '', bgAsset?.name || ''].join('|')
  }

  let lastAssetKey = assetRelevantFields()
  assetStore.subscribe(() => {
    const key = assetRelevantFields()
    if (key === lastAssetKey)
      return
    lastAssetKey = key
    syncPresetStoreToQuickStartCss(presetStore.getState())
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
