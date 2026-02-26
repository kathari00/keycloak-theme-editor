import type { BaseThemeId, ThemeId } from '../../presets/types'
import type { QuickSettingsMode } from '../quick-settings'
import type { PresetState, QuickSettings, QuickSettingsStyle, QuickStartContentSettings } from '../stores/types'
import { REMOVED_ASSET_ID } from '../../assets/types'
import { getThemeConfigCached, getThemeCssStructuredCached, resolveThemeBaseIdFromConfig, resolveThemeIdFromConfig } from '../../presets/queries'
import { buildQuickSettingsStorageKey, getThemeStorageKey, resolveQuickSettingsMode } from '../quick-settings'
import { CUSTOM_PRESET_ID } from '../quick-start-css'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { DEFAULT_QUICK_SETTINGS_STYLE, presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { historyActions } from './history-actions'

interface ImportedQuickSettingsByMode {
  light?: Partial<QuickSettings>
  dark?: Partial<QuickSettings>
}

export type { QuickSettingsMode }
export { buildQuickSettingsStorageKey }

type QuickStartStyleExtras = Pick<
  QuickSettingsStyle,
  | 'colorPresetBgColor'
  | 'colorPresetBorderRadius'
  | 'colorPresetCardShadow'
  | 'colorPresetHeadingFontFamily'
>

type QuickStartExtrasUpdate = Partial<QuickStartStyleExtras & QuickStartContentSettings>

interface HistoryOptions {
  recordHistory?: boolean
}

interface SetColorPresetOptions extends HistoryOptions {
  headingFontFamily?: string
}

const STYLE_FIELD_KEYS = [
  'colorPresetId',
  'colorPresetPrimaryColor',
  'colorPresetSecondaryColor',
  'colorPresetFontFamily',
  'colorPresetBgColor',
  'colorPresetBorderRadius',
  'colorPresetCardShadow',
  'colorPresetHeadingFontFamily',
] as const

const CONTENT_FIELD_KEYS = [
  'showClientName',
  'showRealmName',
  'infoMessage',
  'imprintUrl',
  'dataProtectionUrl',
] as const

const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

let applyThemeSelectionRequestVersion = 0

function getCurrentQuickSettingsMode(): QuickSettingsMode {
  return resolveQuickSettingsMode(coreStore.state.isDarkMode)
}

function getStyleSettingsKey(themeId: string | null | undefined, mode: QuickSettingsMode): string {
  return buildQuickSettingsStorageKey(getThemeStorageKey(themeId), mode)
}

function getStyleSettingsForMode(
  state: PresetState,
  themeId: string | null | undefined,
  mode: QuickSettingsMode,
): QuickSettingsStyle | undefined {
  return state.quickSettingsByThemeMode[getStyleSettingsKey(themeId, mode)]
}

function getQuickStartContent(state: PresetState): QuickStartContentSettings {
  return {
    showClientName: state.showClientName,
    showRealmName: state.showRealmName,
    infoMessage: state.infoMessage,
    imprintUrl: state.imprintUrl,
    dataProtectionUrl: state.dataProtectionUrl,
  }
}

function updateQuickStartContent(
  state: PresetState,
  content: QuickStartContentSettings,
): PresetState {
  return { ...state, ...content }
}

function readQuickStartVariable(cssText: string, variableName: string): string {
  const marker = `${variableName}:`
  const markerIndex = cssText.indexOf(marker)
  if (markerIndex < 0) {
    return ''
  }

  const valueStartIndex = markerIndex + marker.length
  const valueEndIndex = cssText.indexOf(';', valueStartIndex)
  if (valueEndIndex < 0) {
    return ''
  }
  return cssText.slice(valueStartIndex, valueEndIndex).trim()
}

function getQuickStartVariableNameForMode(mode: QuickSettingsMode, baseVariableName: string): string {
  return mode === 'dark' ? `${baseVariableName}-dark` : baseVariableName
}

function syncDefaultBackgroundForBaseTheme(baseThemeId: BaseThemeId): void {
  const { uploadedAssets, appliedAssets } = assetStore.state
  const defaultBackground = uploadedAssets.find(
    asset => asset.category === 'background' && asset.isDefault,
  )

  const currentBackground = appliedAssets.background
  if (baseThemeId === 'v2') {
    if (!defaultBackground) {
      return
    }
    if (!currentBackground || currentBackground === REMOVED_ASSET_ID) {
      assetStore.setState(state => ({
        ...state,
        appliedAssets: {
          ...state.appliedAssets,
          background: defaultBackground.id,
        },
      }))
    }
    return
  }

  const shouldDisableBackground
    = !currentBackground
      || (defaultBackground ? currentBackground === defaultBackground.id : false)

  if (shouldDisableBackground && currentBackground !== REMOVED_ASSET_ID) {
    assetStore.setState(state => ({
      ...state,
      appliedAssets: { ...state.appliedAssets, background: REMOVED_ASSET_ID },
    }))
  }
}

function buildThemeQuickStartDefaults(themeCss: string, mode: QuickSettingsMode): QuickSettingsStyle {
  const primaryColor = readQuickStartVariable(themeCss, getQuickStartVariableNameForMode(mode, '--quickstart-primary-color'))
  const secondaryColor = readQuickStartVariable(themeCss, '--quickstart-secondary-color')
  const fontFamilyRaw = readQuickStartVariable(themeCss, '--quickstart-font-family')
  const fontFamily = fontFamilyRaw.includes('var(') ? '' : fontFamilyRaw
  const bgColor = readQuickStartVariable(themeCss, getQuickStartVariableNameForMode(mode, '--quickstart-bg-color'))
  const cardShadowDefault = readQuickStartVariable(themeCss, '--quickstart-card-shadow-default')
  return {
    colorPresetId: CUSTOM_PRESET_ID,
    colorPresetPrimaryColor: primaryColor,
    colorPresetSecondaryColor: secondaryColor,
    colorPresetFontFamily: fontFamily,
    colorPresetBgColor: bgColor,
    colorPresetBorderRadius: 'default',
    colorPresetCardShadow: cardShadowDefault === 'none' ? 'none' : 'default',
    colorPresetHeadingFontFamily: CUSTOM_PRESET_ID,
  }
}

function resolveQuickStartDefaultsCss(themeCssOverride: string | undefined, fallbackCss: string): string {
  const overrideCss = (themeCssOverride || '').trim()
  if (overrideCss) {
    return overrideCss
  }

  const themeQuickStartDefaults = (themeStore.state.themeQuickStartDefaults || '').trim()
  if (themeQuickStartDefaults) {
    return themeQuickStartDefaults
  }

  return fallbackCss
}

export function buildModeDefaultsSnapshot(
  state: PresetState,
  mode: QuickSettingsMode,
  themeCssOverride?: string,
): QuickSettingsStyle {
  const currentSettings = getStyleSettingsForMode(state, state.selectedThemeId, mode) ?? DEFAULT_QUICK_SETTINGS_STYLE
  const defaultsCss = resolveQuickStartDefaultsCss(themeCssOverride, state.presetCss)
  const modeDefaults = buildThemeQuickStartDefaults(defaultsCss, mode)

  return {
    ...currentSettings,
    colorPresetId: modeDefaults.colorPresetId,
    colorPresetPrimaryColor: modeDefaults.colorPresetPrimaryColor || currentSettings.colorPresetPrimaryColor,
    colorPresetSecondaryColor: modeDefaults.colorPresetSecondaryColor || currentSettings.colorPresetSecondaryColor,
    colorPresetFontFamily: modeDefaults.colorPresetFontFamily || currentSettings.colorPresetFontFamily,
    colorPresetBgColor: modeDefaults.colorPresetBgColor,
    colorPresetBorderRadius: modeDefaults.colorPresetBorderRadius,
    colorPresetCardShadow: modeDefaults.colorPresetCardShadow,
    colorPresetHeadingFontFamily: modeDefaults.colorPresetHeadingFontFamily,
  }
}

function getActiveModeSettings(state: PresetState): QuickSettingsStyle {
  const mode = getCurrentQuickSettingsMode()
  return getStyleSettingsForMode(state, state.selectedThemeId, mode) ?? buildModeDefaultsSnapshot(state, mode)
}

function setStyleSettingsForMode(
  state: PresetState,
  themeId: string | null | undefined,
  mode: QuickSettingsMode,
  nextSettings: QuickSettingsStyle,
): PresetState {
  return {
    ...state,
    quickSettingsByThemeMode: {
      ...state.quickSettingsByThemeMode,
      [getStyleSettingsKey(themeId, mode)]: nextSettings,
    },
  }
}

function pickDefinedStyleFields(value: Partial<QuickSettings>): Partial<QuickSettingsStyle> {
  const picked: Partial<QuickSettingsStyle> = {}
  for (const key of STYLE_FIELD_KEYS) {
    if (value[key] !== undefined) {
      picked[key] = value[key] as never
    }
  }
  return picked
}

function pickDefinedContentFields(value: Partial<QuickSettings>): Partial<QuickStartContentSettings> {
  const picked: Partial<QuickStartContentSettings> = {}
  for (const key of CONTENT_FIELD_KEYS) {
    if (value[key] !== undefined) {
      picked[key] = value[key] as never
    }
  }
  return picked
}

export const presetActions = {
  setThemeData: (themeId: ThemeId, themeCss: string) => {
    const previousThemeKey = getThemeStorageKey(presetStore.state.selectedThemeId)
    const nextThemeKey = getThemeStorageKey(themeId)

    presetStore.setState(state => ({
      ...state,
      selectedThemeId: themeId,
      presetCss: themeCss,
    }))
    themeStore.setState((state) => {
      const nextStylesCssByTheme = {
        ...state.stylesCssByTheme,
        [previousThemeKey]: state.stylesCss,
      }
      const nextStylesCss = nextStylesCssByTheme[nextThemeKey] ?? themeCss
      return {
        ...state,
        stylesCss: nextStylesCss,
        stylesCssByTheme: {
          ...nextStylesCssByTheme,
          [nextThemeKey]: nextStylesCss,
        },
      }
    })
    historyActions.syncActiveScopeFromEditor()
  },

  syncBackgroundForCurrentTheme: async () => {
    const themeConfig = await getThemeConfigCached()
    const currentThemeBaseId = resolveThemeBaseIdFromConfig(themeConfig, presetStore.state.selectedThemeId)
    syncDefaultBackgroundForBaseTheme(currentThemeBaseId)
  },

  applyThemeModeDefaults: (mode: QuickSettingsMode, themeCssOverride?: string) => {
    const normalizedMode = resolveQuickSettingsMode(mode)
    presetStore.setState((state) => {
      const defaults = buildModeDefaultsSnapshot(state, normalizedMode, themeCssOverride)
      return setStyleSettingsForMode(state, state.selectedThemeId, normalizedMode, defaults)
    })
  },

  setColorPreset: (
    presetId: string,
    primaryColor: string,
    secondaryColor: string,
    fontFamily: string,
    options?: SetColorPresetOptions,
  ) => {
    const mode = getCurrentQuickSettingsMode()
    const state = presetStore.state
    const previousSettings = getStyleSettingsForMode(state, state.selectedThemeId, mode) ?? buildModeDefaultsSnapshot(state, mode)
    const nextSettings: QuickSettingsStyle = {
      ...previousSettings,
      colorPresetId: presetId,
      colorPresetPrimaryColor: primaryColor,
      colorPresetSecondaryColor: secondaryColor,
      colorPresetFontFamily: fontFamily,
      colorPresetHeadingFontFamily: options?.headingFontFamily ?? previousSettings.colorPresetHeadingFontFamily,
    }

    const sameValues = JSON.stringify(previousSettings) === JSON.stringify(nextSettings)
    if (sameValues) {
      return
    }

    const onlyColorChanged
      = previousSettings.colorPresetId === nextSettings.colorPresetId
        && previousSettings.colorPresetFontFamily === nextSettings.colorPresetFontFamily
        && previousSettings.colorPresetHeadingFontFamily === nextSettings.colorPresetHeadingFontFamily

    if (options?.recordHistory !== false) {
      historyActions.addUndoRedoAction({
        undo: () => {
          presetStore.setState(s => setStyleSettingsForMode(s, s.selectedThemeId, mode, previousSettings))
        },
        redo: () => {
          presetStore.setState(s => setStyleSettingsForMode(s, s.selectedThemeId, mode, nextSettings))
        },
        coalesceKey: onlyColorChanged ? 'quickstart-color-picker' : undefined,
      })
    }

    presetStore.setState(s => setStyleSettingsForMode(s, s.selectedThemeId, mode, nextSettings))
  },

  setQuickStartExtras: (update: QuickStartExtrasUpdate, options?: HistoryOptions) => {
    const mode = getCurrentQuickSettingsMode()
    const presetBefore = presetStore.state
    const assetsBefore = assetStore.state

    const styleBefore = getStyleSettingsForMode(presetBefore, presetBefore.selectedThemeId, mode)
      ?? buildModeDefaultsSnapshot(presetBefore, mode)
    const stylePatch = pickDefinedStyleFields(update)
    const styleAfter: QuickSettingsStyle = { ...styleBefore, ...stylePatch }

    const contentBefore = getQuickStartContent(presetBefore)
    const contentPatch = pickDefinedContentFields(update)
    const contentAfter: QuickStartContentSettings = { ...contentBefore, ...contentPatch }

    const hasBgColor = Boolean(
      styleAfter.colorPresetBgColor
      && HEX_COLOR_REGEX.test(styleAfter.colorPresetBgColor),
    )
    const assetsOldValues = { appliedAssets: assetsBefore.appliedAssets }
    const assetsNewValues = hasBgColor
      ? { appliedAssets: { ...assetsBefore.appliedAssets, background: REMOVED_ASSET_ID } }
      : assetsOldValues

    const sameStyleValues = JSON.stringify(styleBefore) === JSON.stringify(styleAfter)
    const sameContentValues = JSON.stringify(contentBefore) === JSON.stringify(contentAfter)
    const sameAssetValues = assetsOldValues.appliedAssets.background === assetsNewValues.appliedAssets.background
    if (sameStyleValues && sameContentValues && sameAssetValues) {
      return
    }

    const { colorPresetBgColor: oldBgColor, ...oldStyleWithoutBg } = styleBefore
    const { colorPresetBgColor: newBgColor, ...newStyleWithoutBg } = styleAfter
    const onlyBgColorChanged
      = oldBgColor !== newBgColor
        && JSON.stringify(oldStyleWithoutBg) === JSON.stringify(newStyleWithoutBg)
        && sameContentValues

    const applyPresetState = (nextStyle: QuickSettingsStyle, nextContent: QuickStartContentSettings) => {
      presetStore.setState((state) => {
        const withModeSettings = setStyleSettingsForMode(state, state.selectedThemeId, mode, nextStyle)
        return updateQuickStartContent(withModeSettings, nextContent)
      })
    }

    if (options?.recordHistory !== false) {
      historyActions.addUndoRedoAction({
        undo: () => {
          applyPresetState(styleBefore, contentBefore)
          assetStore.setState(s => ({ ...s, ...assetsOldValues }))
        },
        redo: () => {
          applyPresetState(styleAfter, contentAfter)
          if (hasBgColor) {
            assetStore.setState(s => ({ ...s, ...assetsNewValues }))
          }
        },
        coalesceKey: onlyBgColorChanged ? 'quickstart-bg-color-picker' : undefined,
      })
    }

    applyPresetState(styleAfter, contentAfter)
    if (hasBgColor) {
      assetStore.setState(state => ({ ...state, ...assetsNewValues }))
    }
  },

  applyThemeSelection: async (value: string) => {
    const requestVersion = ++applyThemeSelectionRequestVersion
    const themeConfig = await getThemeConfigCached()
    if (requestVersion !== applyThemeSelectionRequestVersion) {
      return
    }

    const themeId = resolveThemeIdFromConfig(themeConfig, value)
    const themeBaseId = resolveThemeBaseIdFromConfig(themeConfig, themeId)
    const quickSettingsMode = getCurrentQuickSettingsMode()

    syncDefaultBackgroundForBaseTheme(themeBaseId)

    const { quickStartDefaults, stylesCss } = await getThemeCssStructuredCached(themeId)
    if (requestVersion !== applyThemeSelectionRequestVersion) {
      return
    }

    themeStore.setState(state => ({ ...state, themeQuickStartDefaults: quickStartDefaults }))
    presetActions.setThemeData(themeId, stylesCss)

    const hasModeSettings = Boolean(
      getStyleSettingsForMode(presetStore.state, themeId, quickSettingsMode),
    )
    if (!hasModeSettings) {
      presetActions.applyThemeModeDefaults(quickSettingsMode, quickStartDefaults)
    }
  },

  applyImportedQuickSettingsForPreset: (themeId: string, quickSettingsByMode?: ImportedQuickSettingsByMode) => {
    if (!quickSettingsByMode || (!quickSettingsByMode.light && !quickSettingsByMode.dark)) {
      return
    }

    const normalizedThemeId = getThemeStorageKey(themeId)
    const currentMode = getCurrentQuickSettingsMode()

    presetStore.setState((state) => {
      const nextMap = { ...state.quickSettingsByThemeMode }
      const fallbackState = { ...state, selectedThemeId: normalizedThemeId }

      const mergeModeSettings = (mode: QuickSettingsMode, partialSettings?: Partial<QuickSettings>) => {
        if (!partialSettings) {
          return
        }
        const key = getStyleSettingsKey(normalizedThemeId, mode)
        const baseSettings = nextMap[key] ?? buildModeDefaultsSnapshot(fallbackState, mode)
        nextMap[key] = {
          ...baseSettings,
          ...pickDefinedStyleFields(partialSettings),
        }
      }

      mergeModeSettings('light', quickSettingsByMode.light)
      mergeModeSettings('dark', quickSettingsByMode.dark)

      const activePartial = currentMode === 'dark'
        ? quickSettingsByMode.dark
        : quickSettingsByMode.light
      const nextContent = {
        ...getQuickStartContent(state),
        ...pickDefinedContentFields(activePartial ?? {}),
      }

      return {
        ...state,
        ...nextContent,
        quickSettingsByThemeMode: nextMap,
      }
    })
  },

  saveQuickSettingsForPreset: (themeId: string, mode: QuickSettingsMode = 'light') => {
    const state = presetStore.state
    const normalizedMode = resolveQuickSettingsMode(mode)
    const nextSettings = getActiveModeSettings(state)
    const currentSettings = getStyleSettingsForMode(state, themeId, normalizedMode)
    if (JSON.stringify(currentSettings) === JSON.stringify(nextSettings)) {
      return
    }

    presetStore.setState(s => setStyleSettingsForMode(s, themeId, normalizedMode, nextSettings))
  },

  restoreQuickSettingsForPreset: (themeId: string, mode: QuickSettingsMode = 'light'): boolean => {
    const normalizedMode = resolveQuickSettingsMode(mode)
    return Boolean(getStyleSettingsForMode(presetStore.state, themeId, normalizedMode))
  },
}
