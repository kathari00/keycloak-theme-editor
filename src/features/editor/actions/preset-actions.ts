import type { BaseThemeId, ThemeId } from '../../presets/types'
import type { PresetState, QuickSettings } from '../stores/types'
import { REMOVED_ASSET_ID } from '../../assets/types'
import { getThemeConfigCached, getThemeCssStructuredCached, resolveThemeBaseIdFromConfig, resolveThemeIdFromConfig } from '../../presets/queries'
import { buildQuickSettingsStorageKey, getThemeStorageKey } from '../quick-settings'
import { CUSTOM_PRESET_ID } from '../quick-start-css'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { historyActions } from './history-actions'

export type QuickSettingsMode = 'light' | 'dark'
interface ImportedQuickSettingsByMode {
  light?: Partial<QuickSettings>
  dark?: Partial<QuickSettings>
}

export { buildQuickSettingsStorageKey }

type QuickStartExtrasState = Pick<
  PresetState,
  | 'colorPresetBgColor'
  | 'colorPresetBorderRadius'
  | 'colorPresetCardShadow'
  | 'colorPresetHeadingFontFamily'
  | 'showClientName'
  | 'showRealmName'
  | 'infoMessage'
  | 'imprintUrl'
  | 'dataProtectionUrl'
>

type QuickStartExtrasUpdate = Partial<QuickStartExtrasState>
interface HistoryOptions {
  recordHistory?: boolean
}

interface SetColorPresetOptions extends HistoryOptions {
  headingFontFamily?: string
}

const DEFAULT_QUICK_START_EXTRAS: Omit<QuickStartExtrasState, 'colorPresetBgColor' | 'colorPresetCardShadow'> = {
  colorPresetBorderRadius: 'rounded',
  colorPresetHeadingFontFamily: CUSTOM_PRESET_ID,
  showClientName: false,
  showRealmName: true,
  infoMessage: '',
  imprintUrl: '',
  dataProtectionUrl: '',
}

let applyThemeSelectionRequestVersion = 0

function normalizeQuickSettingsMode(mode: QuickSettingsMode | undefined): QuickSettingsMode {
  return mode === 'dark' ? 'dark' : 'light'
}

function getCurrentQuickSettingsMode(): QuickSettingsMode {
  return coreStore.getState().isDarkMode ? 'dark' : 'light'
}

function getOppositeQuickSettingsMode(mode: QuickSettingsMode): QuickSettingsMode {
  return mode === 'dark' ? 'light' : 'dark'
}

function getQuickStartExtrasState(state: PresetState): QuickStartExtrasState {
  return {
    colorPresetBgColor: state.colorPresetBgColor,
    colorPresetBorderRadius: state.colorPresetBorderRadius,
    colorPresetCardShadow: state.colorPresetCardShadow,
    colorPresetHeadingFontFamily: state.colorPresetHeadingFontFamily,
    showClientName: state.showClientName,
    showRealmName: state.showRealmName,
    infoMessage: state.infoMessage,
    imprintUrl: state.imprintUrl,
    dataProtectionUrl: state.dataProtectionUrl,
  }
}

function buildQuickSettingsSnapshot(state: PresetState): QuickSettings {
  return {
    colorPresetId: state.colorPresetId,
    colorPresetPrimaryColor: state.colorPresetPrimaryColor,
    colorPresetSecondaryColor: state.colorPresetSecondaryColor,
    colorPresetFontFamily: state.colorPresetFontFamily,
    colorPresetBgColor: state.colorPresetBgColor,
    colorPresetBorderRadius: state.colorPresetBorderRadius,
    colorPresetCardShadow: state.colorPresetCardShadow,
    colorPresetHeadingFontFamily: state.colorPresetHeadingFontFamily,
    showClientName: state.showClientName,
    showRealmName: state.showRealmName,
    infoMessage: state.infoMessage,
    imprintUrl: state.imprintUrl,
    dataProtectionUrl: state.dataProtectionUrl,
  }
}

function withoutUndefinedValues<T extends Record<string, unknown>>(value: Partial<T>): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as Partial<T>
}

function buildQuickSettingsKey(themeId: string, mode: QuickSettingsMode): string {
  return buildQuickSettingsStorageKey(getThemeStorageKey(themeId), mode)
}

function seedOppositeModeSnapshotIfMissing(
  state: PresetState,
  enabled: boolean,
): Record<string, QuickSettings> {
  if (!enabled) {
    return state.presetQuickSettings
  }
  const themeStorageKey = getThemeStorageKey(state.selectedThemeId)
  const currentMode = getCurrentQuickSettingsMode()
  const oppositeMode = getOppositeQuickSettingsMode(currentMode)
  const oppositeModeKey = buildQuickSettingsKey(themeStorageKey, oppositeMode)
  if (state.presetQuickSettings[oppositeModeKey]) {
    return state.presetQuickSettings
  }
  return {
    ...state.presetQuickSettings,
    [oppositeModeKey]: buildModeDefaultsSnapshot(state, oppositeMode),
  }
}

function buildModeScopedQuickSettingsMap(params: {
  state: PresetState
  nextSnapshot: QuickSettings
  baseQuickSettingsMap?: Record<string, QuickSettings>
}): Record<string, QuickSettings> {
  const { state, nextSnapshot, baseQuickSettingsMap } = params
  const themeStorageKey = getThemeStorageKey(state.selectedThemeId)
  const currentMode = getCurrentQuickSettingsMode()
  const currentModeKey = buildQuickSettingsKey(themeStorageKey, currentMode)
  return {
    ...(baseQuickSettingsMap ?? state.presetQuickSettings),
    [currentModeKey]: nextSnapshot,
  }
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

function mapQuickStartBorderRadius(value: string): PresetState['colorPresetBorderRadius'] {
  const normalized = value.trim().toLowerCase()
  if (normalized === '0' || normalized === '0px') {
    return 'sharp'
  }
  if (normalized === '24px') {
    return 'pill'
  }
  return 'rounded'
}

function mapQuickStartCardShadow(value: string): PresetState['colorPresetCardShadow'] {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!normalized) {
    return 'subtle'
  }
  if (normalized === 'none') {
    return 'none'
  }
  if (normalized.includes('0 8px 32px')) {
    return 'strong'
  }
  return 'subtle'
}

function syncDefaultBackgroundForBaseTheme(baseThemeId: BaseThemeId): void {
  const { uploadedAssets, appliedAssets } = assetStore.getState()
  const defaultBackground = uploadedAssets.find(
    asset => asset.category === 'background' && asset.isDefault,
  )

  const currentBackground = appliedAssets.background
  const hasCurrentBackgroundAsset = currentBackground
    ? uploadedAssets.some(asset => asset.id === currentBackground)
    : false
  if (baseThemeId === 'v2') {
    if (!defaultBackground) {
      return
    }
    if (!currentBackground || currentBackground === REMOVED_ASSET_ID || !hasCurrentBackgroundAsset) {
      assetStore.setState({
        appliedAssets: {
          ...appliedAssets,
          background: defaultBackground.id,
        },
      })
    }
    return
  }

  const shouldDisableBackground
    = !currentBackground
      || (defaultBackground ? currentBackground === defaultBackground.id : false)

  if (shouldDisableBackground && currentBackground !== REMOVED_ASSET_ID) {
    assetStore.setState({
      appliedAssets: {
        ...appliedAssets,
        background: REMOVED_ASSET_ID,
      },
    })
  }
}

function buildThemeQuickStartDefaults(themeCss: string, mode: QuickSettingsMode): {
  colorPresetId: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  extras: QuickStartExtrasUpdate
} {
  const primaryColor = readQuickStartVariable(themeCss, getQuickStartVariableNameForMode(mode, '--quickstart-primary-color'))
  const secondaryColor = readQuickStartVariable(themeCss, '--quickstart-secondary-color')
  const fontFamilyRaw = readQuickStartVariable(themeCss, '--quickstart-font-family')
  const fontFamily = fontFamilyRaw.includes('var(') ? '' : fontFamilyRaw
  const bgColor = readQuickStartVariable(themeCss, getQuickStartVariableNameForMode(mode, '--quickstart-bg-color'))
  const borderRadiusValue
    = readQuickStartVariable(themeCss, '--quickstart-border-radius')
      || readQuickStartVariable(themeCss, '--quickstart-control-border-radius-default')
  const cardShadowValue
    = readQuickStartVariable(themeCss, '--quickstart-card-shadow')
      || readQuickStartVariable(themeCss, '--quickstart-card-shadow-default')
  return {
    colorPresetId: CUSTOM_PRESET_ID,
    primaryColor,
    secondaryColor,
    fontFamily,
    extras: {
      ...DEFAULT_QUICK_START_EXTRAS,
      colorPresetBgColor: bgColor,
      colorPresetBorderRadius: mapQuickStartBorderRadius(borderRadiusValue),
      colorPresetCardShadow: mapQuickStartCardShadow(cardShadowValue),
    },
  }
}

function resolveQuickStartDefaultsCss(themeCssOverride: string | undefined, fallbackCss: string): string {
  const overrideCss = (themeCssOverride || '').trim()
  if (overrideCss) {
    return overrideCss
  }

  const themeQuickStartDefaults = (themeStore.getState().themeQuickStartDefaults || '').trim()
  if (themeQuickStartDefaults) {
    return themeQuickStartDefaults
  }

  return fallbackCss
}

export function buildModeDefaultsSnapshot(state: PresetState, mode: QuickSettingsMode): QuickSettings {
  const currentSnapshot = buildQuickSettingsSnapshot(state)
  const defaultsCss = resolveQuickStartDefaultsCss(undefined, state.presetCss)
  const modeDefaults = buildThemeQuickStartDefaults(defaultsCss, mode)

  return {
    ...currentSnapshot,
    colorPresetId: modeDefaults.colorPresetId,
    colorPresetPrimaryColor: modeDefaults.primaryColor || currentSnapshot.colorPresetPrimaryColor,
    colorPresetSecondaryColor: modeDefaults.secondaryColor || currentSnapshot.colorPresetSecondaryColor,
    colorPresetFontFamily: modeDefaults.fontFamily || currentSnapshot.colorPresetFontFamily,
    colorPresetBgColor: modeDefaults.extras.colorPresetBgColor ?? currentSnapshot.colorPresetBgColor,
    colorPresetBorderRadius: modeDefaults.extras.colorPresetBorderRadius ?? currentSnapshot.colorPresetBorderRadius,
    colorPresetCardShadow: modeDefaults.extras.colorPresetCardShadow ?? currentSnapshot.colorPresetCardShadow,
    colorPresetHeadingFontFamily: modeDefaults.extras.colorPresetHeadingFontFamily ?? currentSnapshot.colorPresetHeadingFontFamily,
  }
}

export const presetActions = {
  setThemeData: (themeId: ThemeId, themeCss: string) => {
    const previousThemeKey = getThemeStorageKey(presetStore.getState().selectedThemeId)
    const nextThemeKey = getThemeStorageKey(themeId)

    presetStore.setState({ selectedThemeId: themeId, presetCss: themeCss })
    themeStore.setState((state) => {
      const nextStylesCssByTheme = previousThemeKey === nextThemeKey
        ? { ...state.stylesCssByTheme }
        : {
            ...state.stylesCssByTheme,
            [previousThemeKey]: state.stylesCss,
          }
      const nextStylesCss = nextStylesCssByTheme[nextThemeKey] ?? themeCss
      return {
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
    const currentThemeBaseId = resolveThemeBaseIdFromConfig(themeConfig, presetStore.getState().selectedThemeId)
    syncDefaultBackgroundForBaseTheme(currentThemeBaseId)
  },

  applyThemeModeDefaults: (mode: QuickSettingsMode, themeCssOverride?: string) => {
    const state = presetStore.getState()
    const defaultsCss = resolveQuickStartDefaultsCss(themeCssOverride, state.presetCss)
    const defaults = buildThemeQuickStartDefaults(defaultsCss, mode)
    presetStore.setState({
      colorPresetId: defaults.colorPresetId,
      colorPresetPrimaryColor: defaults.primaryColor,
      colorPresetSecondaryColor: defaults.secondaryColor,
      colorPresetFontFamily: defaults.fontFamily,
      ...defaults.extras,
    })
  },

  setColorPreset: (
    presetId: string,
    primaryColor: string,
    secondaryColor: string,
    fontFamily: string,
    options?: SetColorPresetOptions,
  ) => {
    const prev = presetStore.getState()
    const shouldSeedOppositeMode = options?.recordHistory !== false
    const seededQuickSettingsMap = seedOppositeModeSnapshotIfMissing(prev, shouldSeedOppositeMode)
    const previousQuickSettingsMap = seededQuickSettingsMap
    const oldValues = {
      colorPresetId: prev.colorPresetId,
      colorPresetPrimaryColor: prev.colorPresetPrimaryColor,
      colorPresetSecondaryColor: prev.colorPresetSecondaryColor,
      colorPresetFontFamily: prev.colorPresetFontFamily,
      colorPresetHeadingFontFamily: prev.colorPresetHeadingFontFamily,
    }
    const newValues = {
      colorPresetId: presetId,
      colorPresetPrimaryColor: primaryColor,
      colorPresetSecondaryColor: secondaryColor,
      colorPresetFontFamily: fontFamily,
      colorPresetHeadingFontFamily: options?.headingFontFamily ?? prev.colorPresetHeadingFontFamily,
    }
    const sameValues
      = oldValues.colorPresetId === newValues.colorPresetId
        && oldValues.colorPresetPrimaryColor === newValues.colorPresetPrimaryColor
        && oldValues.colorPresetSecondaryColor === newValues.colorPresetSecondaryColor
        && oldValues.colorPresetFontFamily === newValues.colorPresetFontFamily
        && oldValues.colorPresetHeadingFontFamily === newValues.colorPresetHeadingFontFamily
    if (sameValues) {
      return
    }
    const onlyColorChanged
      = oldValues.colorPresetId === newValues.colorPresetId
        && oldValues.colorPresetFontFamily === newValues.colorPresetFontFamily
        && oldValues.colorPresetHeadingFontFamily === newValues.colorPresetHeadingFontFamily

    const nextQuickSettingsSnapshot: QuickSettings = {
      ...buildQuickSettingsSnapshot(prev),
      ...newValues,
    }
    const nextPresetQuickSettings = buildModeScopedQuickSettingsMap({
      state: prev,
      nextSnapshot: nextQuickSettingsSnapshot,
      baseQuickSettingsMap: seededQuickSettingsMap,
    })

    presetStore.setState({ ...newValues, presetQuickSettings: nextPresetQuickSettings })

    if (options?.recordHistory !== false) {
      historyActions.addUndoRedoAction({
        undo: () => {
          presetStore.setState({ ...oldValues, presetQuickSettings: previousQuickSettingsMap })
        },
        redo: () => {
          presetStore.setState({ ...newValues, presetQuickSettings: nextPresetQuickSettings })
        },
        coalesceKey: onlyColorChanged ? 'quickstart-color-picker' : undefined,
      })
    }
  },

  setQuickStartExtras: (update: QuickStartExtrasUpdate, options?: HistoryOptions) => {
    const prevPreset = presetStore.getState()
    const prevAsset = assetStore.getState()
    const shouldSeedOppositeMode = options?.recordHistory !== false
    const seededQuickSettingsMap = seedOppositeModeSnapshotIfMissing(prevPreset, shouldSeedOppositeMode)
    const previousQuickSettingsMap = seededQuickSettingsMap

    const presetOldValues = getQuickStartExtrasState(prevPreset)
    const presetNewValues: QuickStartExtrasState = {
      ...presetOldValues,
      ...update,
    }

    const hasBgColor = Boolean(
      presetNewValues.colorPresetBgColor
      && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(presetNewValues.colorPresetBgColor),
    )
    const assetOldValues = { appliedAssets: prevAsset.appliedAssets }
    const assetNewValues = hasBgColor
      ? { appliedAssets: { ...prevAsset.appliedAssets, background: REMOVED_ASSET_ID } }
      : assetOldValues
    const { colorPresetBgColor: oldBgColor, ...oldPresetWithoutBg } = presetOldValues
    const { colorPresetBgColor: newBgColor, ...newPresetWithoutBg } = presetNewValues
    const samePresetValues = JSON.stringify(presetOldValues) === JSON.stringify(presetNewValues)
    const onlyBgColorChanged
      = oldBgColor !== newBgColor
        && JSON.stringify(oldPresetWithoutBg) === JSON.stringify(newPresetWithoutBg)
    const sameAssetValues = assetOldValues.appliedAssets.background === assetNewValues.appliedAssets.background
    if (samePresetValues && sameAssetValues) {
      return
    }

    const nextQuickSettingsSnapshot: QuickSettings = {
      ...buildQuickSettingsSnapshot(prevPreset),
      ...presetNewValues,
    }
    const nextPresetQuickSettings = buildModeScopedQuickSettingsMap({
      state: prevPreset,
      nextSnapshot: nextQuickSettingsSnapshot,
      baseQuickSettingsMap: seededQuickSettingsMap,
    })

    if (options?.recordHistory !== false) {
      historyActions.addUndoRedoAction({
        undo: () => {
          presetStore.setState({ ...presetOldValues, presetQuickSettings: previousQuickSettingsMap })
          assetStore.setState(assetOldValues)
        },
        redo: () => {
          presetStore.setState({ ...presetNewValues, presetQuickSettings: nextPresetQuickSettings })
          if (hasBgColor) {
            assetStore.setState(assetNewValues)
          }
        },
        coalesceKey: onlyBgColorChanged ? 'quickstart-bg-color-picker' : undefined,
      })
    }

    presetStore.setState({ ...presetNewValues, presetQuickSettings: nextPresetQuickSettings })
    if (hasBgColor) {
      assetStore.setState(assetNewValues)
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
    const currentThemeKey = getThemeStorageKey(presetStore.getState().selectedThemeId)
    const quickSettingsMode = getCurrentQuickSettingsMode()

    presetActions.saveQuickSettingsForPreset(currentThemeKey, quickSettingsMode)
    syncDefaultBackgroundForBaseTheme(themeBaseId)

    const { quickStartDefaults, stylesCss } = await getThemeCssStructuredCached(themeId)
    if (requestVersion !== applyThemeSelectionRequestVersion) {
      return
    }

    themeStore.setState({ themeQuickStartDefaults: quickStartDefaults })
    presetActions.setThemeData(themeId, stylesCss)
    if (!presetActions.restoreQuickSettingsForPreset(themeId, quickSettingsMode)) {
      presetActions.applyThemeModeDefaults(quickSettingsMode, quickStartDefaults)
      presetActions.saveQuickSettingsForPreset(themeId, quickSettingsMode)
    }
  },

  applyImportedQuickSettingsForPreset: (themeId: string, quickSettingsByMode?: ImportedQuickSettingsByMode) => {
    if (!quickSettingsByMode || (!quickSettingsByMode.light && !quickSettingsByMode.dark)) {
      return
    }

    const normalizedThemeId = getThemeStorageKey(themeId)
    const currentMode = getCurrentQuickSettingsMode()
    const currentModeKey = buildQuickSettingsKey(normalizedThemeId, currentMode)

    presetStore.setState((state) => {
      const nextPresetQuickSettings = { ...state.presetQuickSettings }
      const fallbackSettings = buildQuickSettingsSnapshot(state)

      const applyModeSettings = (mode: QuickSettingsMode, partialSettings?: Partial<QuickSettings>) => {
        if (!partialSettings) {
          return
        }
        const modeKey = buildQuickSettingsKey(normalizedThemeId, mode)
        const baseSettings = nextPresetQuickSettings[modeKey] ?? fallbackSettings
        nextPresetQuickSettings[modeKey] = {
          ...baseSettings,
          ...withoutUndefinedValues(partialSettings),
        }
      }

      applyModeSettings('light', quickSettingsByMode.light)
      applyModeSettings('dark', quickSettingsByMode.dark)

      const activeModeSettings = nextPresetQuickSettings[currentModeKey]
      if (!activeModeSettings) {
        return { presetQuickSettings: nextPresetQuickSettings }
      }

      return {
        ...activeModeSettings,
        presetQuickSettings: nextPresetQuickSettings,
      }
    })
  },

  saveQuickSettingsForPreset: (themeId: string, mode: QuickSettingsMode = 'light') => {
    const s = presetStore.getState()
    const normalizedMode = normalizeQuickSettingsMode(mode)
    const storageKey = buildQuickSettingsKey(themeId, normalizedMode)
    const settings = buildQuickSettingsSnapshot(s)
    presetStore.setState(state => ({
      presetQuickSettings: { ...state.presetQuickSettings, [storageKey]: settings },
    }))
  },

  restoreQuickSettingsForPreset: (themeId: string, mode: QuickSettingsMode = 'light'): boolean => {
    const normalizedMode = normalizeQuickSettingsMode(mode)
    const storageKey = buildQuickSettingsKey(themeId, normalizedMode)
    const state = presetStore.getState()
    const saved = state.presetQuickSettings[storageKey]
    if (!saved) {
      return false
    }
    presetStore.setState(currentState => ({
      ...saved,
      presetQuickSettings: currentState.presetQuickSettings,
    }))
    return true
  },
}
