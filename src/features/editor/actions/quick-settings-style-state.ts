import type { QuickSettingsMode } from '../lib/quick-settings'
import type { PresetState, QuickSettingsStyle, QuickSettingsStylesByMode } from '../stores/types'
import { getThemeStorageKey } from '../lib/quick-settings'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { buildThemeQuickStartDefaults } from './css-variable-reader'

type QuickSettingsStyleKey = keyof QuickSettingsStyle

const QUICK_SETTINGS_MODES: QuickSettingsMode[] = ['light', 'dark']

export const SHARED_QUICK_SETTINGS_STYLE_KEYS: QuickSettingsStyleKey[] = [
  'colorPresetId',
  'colorPresetFontFamily',
  'colorPresetBorderRadius',
  'colorPresetCardShadow',
  'colorPresetHeadingFontFamily',
]

export const SHARED_QUICK_START_EXTRAS_STYLE_KEYS: QuickSettingsStyleKey[] = [
  'colorPresetBorderRadius',
  'colorPresetCardShadow',
  'colorPresetHeadingFontFamily',
]

function getActiveQuickSettingsMode(): QuickSettingsMode {
  return coreStore.getState().isDarkMode ? 'dark' : 'light'
}

function getActiveThemeKey(themeId?: string): string {
  return getThemeStorageKey(themeId ?? presetStore.getState().selectedThemeId)
}

export function getQuickSettingsStyleFromPresetState(state: PresetState): QuickSettingsStyle {
  return {
    colorPresetId: state.colorPresetId,
    colorPresetPrimaryColor: state.colorPresetPrimaryColor,
    colorPresetSecondaryColor: state.colorPresetSecondaryColor,
    colorPresetFontFamily: state.colorPresetFontFamily,
    colorPresetBgColor: state.colorPresetBgColor,
    colorPresetBorderRadius: state.colorPresetBorderRadius,
    colorPresetCardShadow: state.colorPresetCardShadow,
    colorPresetHeadingFontFamily: state.colorPresetHeadingFontFamily,
  }
}

function buildQuickSettingsStylesByModeFromCss(css: string): Required<Record<QuickSettingsMode, QuickSettingsStyle>> {
  return {
    light: buildThemeQuickStartDefaults(css, 'light'),
    dark: buildThemeQuickStartDefaults(css, 'dark'),
  }
}

function pickStyleUpdate(
  update: Partial<QuickSettingsStyle>,
  keys: readonly QuickSettingsStyleKey[],
): Partial<QuickSettingsStyle> {
  const result: Partial<QuickSettingsStyle> = {}
  for (const key of keys) {
    const value = update[key]
    if (value !== undefined) {
      ;(result as Record<QuickSettingsStyleKey, QuickSettingsStyle[QuickSettingsStyleKey]>)[key] = value
    }
  }
  return result
}

function hasStyleUpdate(update: Partial<QuickSettingsStyle>): boolean {
  return Object.keys(update).length > 0
}

export function applyQuickSettingsStyleUpdate(
  update: Partial<QuickSettingsStyle>,
  options: {
    themeId?: string
    mode?: QuickSettingsMode
    sharedKeys?: readonly QuickSettingsStyleKey[]
    updateAllModes?: boolean
  } = {},
): void {
  if (!hasStyleUpdate(update)) {
    return
  }

  const themeKey = getActiveThemeKey(options.themeId)
  const activeMode = options.mode ?? getActiveQuickSettingsMode()
  const sharedUpdate = options.sharedKeys ? pickStyleUpdate(update, options.sharedKeys) : {}

  presetStore.setState((state) => {
    const currentStyle = getQuickSettingsStyleFromPresetState(state)
    const themeStyles = state.quickSettingsStylesByThemeMode[themeKey] ?? {}
    const nextThemeStyles: QuickSettingsStylesByMode = { ...themeStyles }

    for (const mode of QUICK_SETTINGS_MODES) {
      const modeUpdate = options.updateAllModes
        ? update
        : mode === activeMode
          ? update
          : sharedUpdate

      if (!hasStyleUpdate(modeUpdate)) {
        continue
      }

      const baseStyle = nextThemeStyles[mode] ?? themeStyles[activeMode] ?? currentStyle
      nextThemeStyles[mode] = {
        ...baseStyle,
        ...modeUpdate,
      }
    }

    return {
      ...update,
      quickSettingsStylesByThemeMode: {
        ...state.quickSettingsStylesByThemeMode,
        [themeKey]: nextThemeStyles,
      },
    }
  })
}

export function applyQuickSettingsStyleMode(params: {
  themeId?: string
  mode: QuickSettingsMode
  sourceCss?: string
}): void {
  const themeKey = getActiveThemeKey(params.themeId)

  presetStore.setState((state) => {
    const currentStyle = getQuickSettingsStyleFromPresetState(state)
    const existingThemeStyles = state.quickSettingsStylesByThemeMode[themeKey] ?? {}
    const cssStyles = params.sourceCss ? buildQuickSettingsStylesByModeFromCss(params.sourceCss) : null
    const nextThemeStyles: QuickSettingsStylesByMode = { ...existingThemeStyles }

    if (cssStyles) {
      for (const mode of QUICK_SETTINGS_MODES) {
        if (!nextThemeStyles[mode]) {
          nextThemeStyles[mode] = cssStyles[mode]
        }
      }
    }

    const nextStyle = nextThemeStyles[params.mode] ?? cssStyles?.[params.mode] ?? currentStyle

    return {
      ...nextStyle,
      quickSettingsStylesByThemeMode: {
        ...state.quickSettingsStylesByThemeMode,
        [themeKey]: nextThemeStyles,
      },
    }
  })
}

export function replaceQuickSettingsStylesForThemeFromCss(params: {
  themeId?: string
  css: string
  activeMode?: QuickSettingsMode
}): void {
  // Bail out entirely on CSS with no quickstart variables at all (e.g. mid-edit,
  // or a plain custom stylesheet) rather than overwriting saved colors with defaults.
  if (!/--quickstart-/.test(params.css)) {
    return
  }

  const themeKey = getActiveThemeKey(params.themeId)
  const activeMode = params.activeMode ?? getActiveQuickSettingsMode()
  const parsedStyles = buildQuickSettingsStylesByModeFromCss(params.css)

  presetStore.setState((state) => {
    const currentStyle = getQuickSettingsStyleFromPresetState(state)
    const existingThemeStyles = state.quickSettingsStylesByThemeMode[themeKey] ?? {}

    const nextThemeStyles: QuickSettingsStylesByMode = {}
    for (const mode of QUICK_SETTINGS_MODES) {
      const base = existingThemeStyles[mode] ?? currentStyle
      const parsed = parsedStyles[mode]
      // Colors absent from this parse (e.g. no dark-mode variant declared) keep
      // their previous value instead of falling back to buildThemeQuickStartDefaults'
      // "not found" sentinel ('').
      nextThemeStyles[mode] = {
        ...parsed,
        colorPresetPrimaryColor: parsed.colorPresetPrimaryColor || base.colorPresetPrimaryColor,
        colorPresetSecondaryColor: parsed.colorPresetSecondaryColor || base.colorPresetSecondaryColor,
        colorPresetBgColor: parsed.colorPresetBgColor || base.colorPresetBgColor,
      }
    }

    return {
      ...nextThemeStyles[activeMode],
      quickSettingsStylesByThemeMode: {
        ...state.quickSettingsStylesByThemeMode,
        [themeKey]: nextThemeStyles,
      },
    }
  })
}
