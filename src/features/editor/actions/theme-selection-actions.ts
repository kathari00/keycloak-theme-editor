import type { ThemeConfig, ThemeId } from '../../presets/types'
import type { QuickSettingsMode } from '../lib/quick-settings'
import { getThemeConfigCached, getThemeCssStructuredCached, resolveThemeIdFromConfig } from '../../presets/queries'
import { combineCssFiles, firstFilePath, isQuickStartCssFile, singleFileMap } from '../lib/css-files'
import { getThemeStorageKey } from '../lib/quick-settings'
import { COLOR_REGEX } from '../lib/quick-start-css'
import { assetStore } from '../stores/asset-store'
import { DEFAULT_QUICK_START_CONTENT, presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { getCurrentQuickSettingsMode } from './preset-state'
import { quickStartExtrasActions } from './quick-start-extras-actions'

let applyThemeSelectionAbortController: AbortController | null = null

interface ApplyThemeCssDataParams {
  themeId: ThemeId
  stylesCss: string
  stylesCssFiles?: Record<string, string>
  quickStartDefaults?: string
  baseCss?: string
  quickSettingsMode?: QuickSettingsMode
  replaceQuickSettingsStyles?: boolean
}

function syncDefaultAppliedAssetForTheme(
  themeConfig: ThemeConfig,
  themeId: string,
  category: 'background' | 'logo',
): void {
  const theme = themeConfig.themes.find(candidate => candidate.id === themeId)
  const defaultAssetNames = new Set(
    (theme?.defaultAssets || [])
      .filter(asset => asset.category === category)
      .map(asset => asset.name.toLowerCase()),
  )
  const hasThemeDefaultAsset = defaultAssetNames.size > 0

  const { uploadedAssets, appliedAssets } = assetStore.getState()
  const defaultAsset = uploadedAssets.find(
    asset => asset.category === category
      && asset.isDefault
      && defaultAssetNames.has(asset.name.toLowerCase()),
  )

  const currentAssetId = appliedAssets[category]
  const currentAsset = currentAssetId
    ? uploadedAssets.find(asset => asset.id === currentAssetId)
    : undefined
  const hasCurrentAsset = currentAssetId
    ? uploadedAssets.some(asset => asset.id === currentAssetId)
    : false
  const hasActiveBackgroundColor = category === 'background'
    && COLOR_REGEX.test(presetStore.getState().colorPresetBgColor || '')
  const setAppliedAssetsForCurrentTheme = (nextAppliedAssets: typeof appliedAssets) => {
    const currentThemeKey = getThemeStorageKey(presetStore.getState().selectedThemeId)
    const targetThemeKey = getThemeStorageKey(themeId)
    assetStore.setState(state => ({
      appliedAssets: nextAppliedAssets,
      appliedAssetsByTheme: currentThemeKey === targetThemeKey
        ? {
            ...state.appliedAssetsByTheme,
            [targetThemeKey]: nextAppliedAssets,
          }
        : state.appliedAssetsByTheme,
    }))
  }
  if (hasActiveBackgroundColor) {
    if (currentAssetId && (!hasCurrentAsset || currentAsset?.isDefault)) {
      const { [category]: _removed, ...rest } = appliedAssets
      setAppliedAssetsForCurrentTheme(rest)
    }
    return
  }
  if (hasThemeDefaultAsset) {
    if (!defaultAsset) {
      return
    }
    if (!currentAssetId || !hasCurrentAsset) {
      const nextAppliedAssets = { ...appliedAssets, [category]: defaultAsset.id }
      setAppliedAssetsForCurrentTheme(nextAppliedAssets)
    }
    return
  }

  const shouldDisableAsset
    = !currentAssetId
      || (currentAsset?.category === category && currentAsset.isDefault === true)

  if (shouldDisableAsset) {
    const { [category]: _removed, ...rest } = appliedAssets
    setAppliedAssetsForCurrentTheme(rest)
  }
}

export function syncDefaultAssetsForTheme(themeConfig: ThemeConfig, themeId: string): void {
  syncDefaultAppliedAssetForTheme(themeConfig, themeId, 'background')
  syncDefaultAppliedAssetForTheme(themeConfig, themeId, 'logo')
}

function hasDefaultQuickStartContent(): boolean {
  const state = presetStore.getState()
  return Object.entries(DEFAULT_QUICK_START_CONTENT).every(([key, value]) => (
    state[key as keyof typeof DEFAULT_QUICK_START_CONTENT] === value
  ))
}

function applyThemeContentDefaults(themeConfig: ThemeConfig, themeId: string): void {
  const contentDefaults = themeConfig.themes.find(candidate => candidate.id === themeId)?.contentDefaults
  if (!contentDefaults || Object.keys(contentDefaults).length === 0 || !hasDefaultQuickStartContent()) {
    return
  }

  presetStore.setState(contentDefaults)
}

function setThemeData(themeId: ThemeId, themeCss: string, themeFiles?: Record<string, string>): void {
  const previousThemeKey = getThemeStorageKey(presetStore.getState().selectedThemeId)
  const nextThemeKey = getThemeStorageKey(themeId)

  presetStore.setState({ selectedThemeId: themeId, presetCss: themeCss })
  themeStore.setState((state) => {
    // Save current theme's CSS before switching
    const nextStylesCssByTheme = previousThemeKey === nextThemeKey
      ? { ...state.stylesCssByTheme }
      : { ...state.stylesCssByTheme, [previousThemeKey]: state.stylesCss }
    const nextStylesCssFilesByTheme = previousThemeKey === nextThemeKey
      ? { ...state.stylesCssFilesByTheme }
      : { ...state.stylesCssFilesByTheme, [previousThemeKey]: state.stylesCssFiles }

    const freshFiles = themeFiles && Object.keys(themeFiles).length > 0
      ? themeFiles
      : null
    const restoredFiles = nextStylesCssFilesByTheme[nextThemeKey]
    const hasRestoredFiles = restoredFiles && Object.keys(restoredFiles).length > 0
    // Merge: persisted edits take priority, fresh files fill gaps (e.g. newly added theme files)
    const nextFiles = hasRestoredFiles && freshFiles
      ? { ...freshFiles, ...restoredFiles }
      : freshFiles ?? (hasRestoredFiles ? restoredFiles : singleFileMap(themeCss))
    const nextStylesCss = combineCssFiles(nextFiles)
    const restoredQuickStart = Object.entries(nextFiles).find(([p]) => isQuickStartCssFile(p))

    return {
      stylesCss: nextStylesCss,
      stylesCssByTheme: { ...nextStylesCssByTheme, [nextThemeKey]: nextStylesCss },
      stylesCssFiles: nextFiles,
      stylesCssFilesByTheme: { ...nextStylesCssFilesByTheme, [nextThemeKey]: nextFiles },
      activeCssFilePath: nextFiles[state.activeCssFilePath] ? state.activeCssFilePath : firstFilePath(nextFiles),
      ...(restoredQuickStart ? { themeQuickStartDefaults: restoredQuickStart[1] } : {}),
    }
  })
  // Scope change is handled automatically by subscribeToScopeChanges() subscriber.
}

function applyThemeCssData(params: ApplyThemeCssDataParams): void {
  const {
    themeId,
    stylesCss,
    stylesCssFiles,
    quickStartDefaults,
    baseCss,
    quickSettingsMode,
    replaceQuickSettingsStyles,
  } = params

  themeStore.setState(state => ({
    ...state,
    ...(quickStartDefaults !== undefined ? { themeQuickStartDefaults: quickStartDefaults } : {}),
    ...(baseCss !== undefined ? { baseCss } : {}),
  }))
  setThemeData(themeId, stylesCss, stylesCssFiles)

  if (quickSettingsMode) {
    quickStartExtrasActions.applyThemeModeDefaults(quickSettingsMode, quickStartDefaults, {
      themeId,
      replaceStyles: replaceQuickSettingsStyles,
    })
  }
}

export const themeSelectionActions = {
  setThemeData,
  applyThemeCssData,
  applyThemeContentDefaults,

  syncBackgroundForCurrentTheme: async () => {
    const themeConfig = await getThemeConfigCached()
    const currentThemeId = resolveThemeIdFromConfig(themeConfig, presetStore.getState().selectedThemeId)
    assetStore.setState((state) => {
      const currentThemeAppliedAssets = state.appliedAssetsByTheme[currentThemeId]
      return currentThemeAppliedAssets
        ? { appliedAssets: currentThemeAppliedAssets }
        : state
    })
    syncDefaultAssetsForTheme(themeConfig, currentThemeId)
  },

  applyThemeSelection: async (value: string) => {
    applyThemeSelectionAbortController?.abort()
    const controller = new AbortController()
    applyThemeSelectionAbortController = controller

    const themeConfig = await getThemeConfigCached()
    if (controller.signal.aborted) {
      return
    }

    const themeId = resolveThemeIdFromConfig(themeConfig, value)
    const quickSettingsMode = getCurrentQuickSettingsMode()

    syncDefaultAssetsForTheme(themeConfig, themeId)

    const { quickStartDefaults, stylesCss, stylesCssFiles } = await getThemeCssStructuredCached(themeId)
    if (controller.signal.aborted) {
      return
    }

    themeSelectionActions.applyThemeCssData({
      themeId,
      stylesCss,
      stylesCssFiles,
      quickStartDefaults,
      quickSettingsMode,
    })
    applyThemeContentDefaults(themeConfig, themeId)
    assetStore.setState(state => ({
      appliedAssets: state.appliedAssetsByTheme[themeId] ?? {},
    }))

    syncDefaultAssetsForTheme(themeConfig, themeId)
  },
}
