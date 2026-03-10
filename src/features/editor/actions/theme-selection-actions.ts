import type { ThemeConfig, ThemeId } from '../../presets/types'
import { getThemeConfigCached, getThemeCssStructuredCached, resolveThemeIdFromConfig } from '../../presets/queries'
import { combineCssFiles, firstFilePath, isQuickStartCssFile, singleFileMap } from '../lib/css-files'
import { getThemeStorageKey } from '../lib/quick-settings'
import { assetStore } from '../stores/asset-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { getCurrentQuickSettingsMode } from './preset-state'
import { quickStartExtrasActions } from './quick-start-extras-actions'

let applyThemeSelectionAbortController: AbortController | null = null

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
  if (hasThemeDefaultAsset) {
    if (!defaultAsset) {
      return
    }
    if (!currentAssetId || !hasCurrentAsset) {
      assetStore.setState({ appliedAssets: { ...appliedAssets, [category]: defaultAsset.id } })
    }
    return
  }

  const shouldDisableAsset
    = !currentAssetId
      || (currentAsset?.category === category && currentAsset.isDefault === true)

  if (shouldDisableAsset) {
    const { [category]: _removed, ...rest } = appliedAssets
    assetStore.setState({ appliedAssets: rest })
  }
}

export function syncDefaultAssetsForTheme(themeConfig: ThemeConfig, themeId: string): void {
  syncDefaultAppliedAssetForTheme(themeConfig, themeId, 'background')
  syncDefaultAppliedAssetForTheme(themeConfig, themeId, 'logo')
}

export const themeSelectionActions = {
  setThemeData: (themeId: ThemeId, themeCss: string, themeFiles?: Record<string, string>) => {
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
  },

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
    const currentThemeKey = getThemeStorageKey(presetStore.getState().selectedThemeId)
    const quickSettingsMode = getCurrentQuickSettingsMode()

    quickStartExtrasActions.saveQuickSettingsForPreset(currentThemeKey, quickSettingsMode)
    syncDefaultAssetsForTheme(themeConfig, themeId)

    const { quickStartDefaults, stylesCss, stylesCssFiles } = await getThemeCssStructuredCached(themeId)
    if (controller.signal.aborted) {
      return
    }

    themeStore.setState({ themeQuickStartDefaults: quickStartDefaults })
    themeSelectionActions.setThemeData(themeId, stylesCss, stylesCssFiles)
    assetStore.setState(state => ({
      appliedAssets: state.appliedAssetsByTheme[themeId] ?? {},
    }))
    if (!quickStartExtrasActions.restoreQuickSettingsForPreset(themeId, quickSettingsMode, { restoreSharedValues: true })) {
      quickStartExtrasActions.applyThemeModeDefaults(quickSettingsMode, quickStartDefaults)
      if (themeId === 'v2') {
        quickStartExtrasActions.setQuickStartExtras({ showRealmName: false }, { recordHistory: false })
      }
      quickStartExtrasActions.saveQuickSettingsForPreset(themeId, quickSettingsMode)
    }
    syncDefaultAssetsForTheme(themeConfig, themeId)
  },
}
