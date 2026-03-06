import type { ThemeConfig, ThemeId } from '../../presets/types'
import { REMOVED_ASSET_ID } from '../../assets/types'
import { getThemeConfigCached, getThemeCssStructuredCached, resolveThemeIdFromConfig } from '../../presets/queries'
import { getThemeStorageKey } from '../lib/quick-settings'
import { assetStore } from '../stores/asset-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { getCurrentQuickSettingsMode } from './preset-state'
import { quickStartExtrasActions } from './quick-start-extras-actions'

let applyThemeSelectionAbortController: AbortController | null = null

export function syncDefaultBackgroundForTheme(themeConfig: ThemeConfig, themeId: string): void {
  const theme = themeConfig.themes.find(candidate => candidate.id === themeId)
  const defaultBackgroundNames = new Set(
    (theme?.defaultAssets || [])
      .filter(asset => asset.category === 'background')
      .map(asset => asset.name.toLowerCase()),
  )
  const hasThemeDefaultBackground = defaultBackgroundNames.size > 0

  const { uploadedAssets, appliedAssets } = assetStore.getState()
  const defaultBackground = uploadedAssets.find(
    asset => asset.category === 'background'
      && asset.isDefault
      && defaultBackgroundNames.has(asset.name.toLowerCase()),
  )

  const currentBackground = appliedAssets.background
  const currentBackgroundAsset = currentBackground
    ? uploadedAssets.find(asset => asset.id === currentBackground)
    : undefined
  const hasCurrentBackgroundAsset = currentBackground
    ? uploadedAssets.some(asset => asset.id === currentBackground)
    : false
  if (hasThemeDefaultBackground) {
    if (!defaultBackground) {
      return
    }
    if (!currentBackground || currentBackground === REMOVED_ASSET_ID || !hasCurrentBackgroundAsset) {
      assetStore.setState({ appliedAssets: { ...appliedAssets, background: defaultBackground.id } })
    }
    return
  }

  const shouldDisableBackground
    = !currentBackground
      || (currentBackgroundAsset?.category === 'background' && currentBackgroundAsset.isDefault === true)

  if (shouldDisableBackground && currentBackground !== REMOVED_ASSET_ID) {
    assetStore.setState({ appliedAssets: { ...appliedAssets, background: REMOVED_ASSET_ID } })
  }
}

export const themeSelectionActions = {
  setThemeData: (themeId: ThemeId, themeCss: string) => {
    const previousThemeKey = getThemeStorageKey(presetStore.getState().selectedThemeId)
    const nextThemeKey = getThemeStorageKey(themeId)

    presetStore.setState({ selectedThemeId: themeId, presetCss: themeCss })
    themeStore.setState((state) => {
      const nextStylesCssByTheme = previousThemeKey === nextThemeKey
        ? { ...state.stylesCssByTheme }
        : { ...state.stylesCssByTheme, [previousThemeKey]: state.stylesCss }
      const nextStylesCss = nextStylesCssByTheme[nextThemeKey] ?? themeCss
      return {
        stylesCss: nextStylesCss,
        stylesCssByTheme: { ...nextStylesCssByTheme, [nextThemeKey]: nextStylesCss },
      }
    })
    // Scope change is handled automatically by subscribeToScopeChanges() subscriber.
  },

  syncBackgroundForCurrentTheme: async () => {
    const themeConfig = await getThemeConfigCached()
    const currentThemeId = resolveThemeIdFromConfig(themeConfig, presetStore.getState().selectedThemeId)
    syncDefaultBackgroundForTheme(themeConfig, currentThemeId)
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
    syncDefaultBackgroundForTheme(themeConfig, themeId)

    const { quickStartDefaults, stylesCss } = await getThemeCssStructuredCached(themeId)
    if (controller.signal.aborted) {
      return
    }

    themeStore.setState({ themeQuickStartDefaults: quickStartDefaults })
    themeSelectionActions.setThemeData(themeId, stylesCss)
    if (!quickStartExtrasActions.restoreQuickSettingsForPreset(themeId, quickSettingsMode, { restoreSharedValues: true })) {
      quickStartExtrasActions.applyThemeModeDefaults(quickSettingsMode, quickStartDefaults)
      quickStartExtrasActions.saveQuickSettingsForPreset(themeId, quickSettingsMode)
    }
  },
}
