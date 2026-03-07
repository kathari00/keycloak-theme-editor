import type { AppliedAssets, ThemeAssetTarget, UploadedAsset } from '../../assets/types'
import { buildQuickSettingsStorageKey, getThemeStorageKey, resolveQuickSettingsMode } from '../lib/quick-settings'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { historyActions } from './history-actions'

function getActiveThemeAssetKey(): string {
  return getThemeStorageKey(presetStore.getState().selectedThemeId)
}

function withThemeAppliedAssets(
  appliedAssetsByTheme: Record<string, AppliedAssets>,
  themeKey: string,
  appliedAssets: AppliedAssets,
): Record<string, AppliedAssets> {
  return {
    ...appliedAssetsByTheme,
    [themeKey]: appliedAssets,
  }
}

export const assetActions = {
  setUploadedAssets: (uploadedAssets: UploadedAsset[]) => {
    assetStore.setState(state => ({ ...state, uploadedAssets }))
  },

  setAppliedAssets: (appliedAssets: AppliedAssets) => {
    const themeKey = getActiveThemeAssetKey()
    assetStore.setState(state => ({
      ...state,
      appliedAssets,
      appliedAssetsByTheme: withThemeAppliedAssets(state.appliedAssetsByTheme, themeKey, appliedAssets),
    }))
  },

  addUploadedAsset: (asset: UploadedAsset) => {
    const singleAssetCategory = asset.category === 'background' || asset.category === 'logo' || asset.category === 'favicon'
    const prevState = assetStore.getState()
    const themeKey = getActiveThemeAssetKey()
    const nextUploadedAssets = singleAssetCategory
      ? [...prevState.uploadedAssets.filter(a => a.category !== asset.category), asset]
      : [...prevState.uploadedAssets, asset]

    const target: ThemeAssetTarget | null = asset.category === 'background'
      ? 'background'
      : asset.category === 'logo'
        ? 'logo'
        : asset.category === 'favicon'
          ? 'favicon'
          : null

    const nextAppliedAssets = target
      ? { ...prevState.appliedAssets, [target]: asset.id }
      : prevState.appliedAssets
    const prevAppliedAssetsByTheme = prevState.appliedAssetsByTheme
    const nextAppliedAssetsByTheme = target
      ? withThemeAppliedAssets(prevAppliedAssetsByTheme, themeKey, nextAppliedAssets)
      : prevAppliedAssetsByTheme

    historyActions.addUndoRedoAction({
      undo: () => {
        assetStore.setState(current => ({
          ...current,
          uploadedAssets: prevState.uploadedAssets,
          appliedAssets: prevState.appliedAssets,
          appliedAssetsByTheme: prevAppliedAssetsByTheme,
        }))
      },
      redo: () => {
        assetStore.setState(current => ({
          ...current,
          uploadedAssets: nextUploadedAssets,
          appliedAssets: nextAppliedAssets,
          appliedAssetsByTheme: nextAppliedAssetsByTheme,
        }))
      },
    })

    assetStore.setState(state => ({
      ...state,
      uploadedAssets: nextUploadedAssets,
      appliedAssets: nextAppliedAssets,
      appliedAssetsByTheme: nextAppliedAssetsByTheme,
    }))
  },

  removeUploadedAsset: (assetId: string) => {
    const state = assetStore.getState()
    const themeKey = getActiveThemeAssetKey()
    const asset = state.uploadedAssets.find(a => a.id === assetId)
    if (!asset)
      return

    const prevUploadedAssets = state.uploadedAssets
    const nextUploadedAssets = prevUploadedAssets.filter(a => a.id !== assetId)

    const prevAppliedAssets = { ...state.appliedAssets }
    const nextAppliedAssets = { ...prevAppliedAssets }

    if (asset.category === 'background' && (!prevAppliedAssets.background || prevAppliedAssets.background === assetId)) {
      delete nextAppliedAssets.background
    }
    if (asset.category === 'logo' && (!prevAppliedAssets.logo || prevAppliedAssets.logo === assetId)) {
      delete nextAppliedAssets.logo
    }
    if (asset.category === 'font' && prevAppliedAssets.bodyFont === assetId) {
      delete nextAppliedAssets.bodyFont
    }
    if (asset.category === 'favicon' && prevAppliedAssets.favicon === assetId) {
      delete nextAppliedAssets.favicon
    }
    const prevAppliedAssetsByTheme = state.appliedAssetsByTheme
    const nextAppliedAssetsByTheme = withThemeAppliedAssets(prevAppliedAssetsByTheme, themeKey, nextAppliedAssets)

    historyActions.addUndoRedoAction({
      undo: () => {
        assetStore.setState(current => ({
          ...current,
          uploadedAssets: prevUploadedAssets,
          appliedAssets: prevAppliedAssets,
          appliedAssetsByTheme: prevAppliedAssetsByTheme,
        }))
      },
      redo: () => {
        assetStore.setState(current => ({
          ...current,
          uploadedAssets: nextUploadedAssets,
          appliedAssets: nextAppliedAssets,
          appliedAssetsByTheme: nextAppliedAssetsByTheme,
        }))
      },
    })

    assetStore.setState(current => ({
      ...current,
      uploadedAssets: nextUploadedAssets,
      appliedAssets: nextAppliedAssets,
      appliedAssetsByTheme: nextAppliedAssetsByTheme,
    }))
  },

  // Cross-domain: applying a background image clears background color from presetStore
  applyAsset: (target: ThemeAssetTarget, assetId: string) => {
    const state = assetStore.getState()
    const themeKey = getActiveThemeAssetKey()
    const prevAppliedAssets = { ...state.appliedAssets }
    const nextAppliedAssets = { ...prevAppliedAssets, [target]: assetId }
    const prevAppliedAssetsByTheme = state.appliedAssetsByTheme
    const nextAppliedAssetsByTheme = withThemeAppliedAssets(prevAppliedAssetsByTheme, themeKey, nextAppliedAssets)

    if (prevAppliedAssets[target] === assetId)
      return

    const activeQuickSettingsKey = buildQuickSettingsStorageKey(
      presetStore.getState().selectedThemeId,
      resolveQuickSettingsMode(coreStore.getState().isDarkMode),
    )
    const oldBgColor = presetStore.getState().presetQuickSettings[activeQuickSettingsKey]?.colorPresetBgColor || ''
    const clearBgColor = target === 'background' && Boolean(oldBgColor)

    const setActiveModeBackgroundColor = (colorPresetBgColor: string) => {
      presetStore.setState((current) => {
        const activeQuickSettings = current.presetQuickSettings[activeQuickSettingsKey]
        const nextRootBgColor = current.colorPresetBgColor === colorPresetBgColor ? current.colorPresetBgColor : colorPresetBgColor
        if (!activeQuickSettings && current.colorPresetBgColor === nextRootBgColor) {
          return current
        }
        return {
          ...current,
          colorPresetBgColor: nextRootBgColor,
          presetQuickSettings: activeQuickSettings
            ? {
                ...current.presetQuickSettings,
                [activeQuickSettingsKey]: {
                  ...activeQuickSettings,
                  colorPresetBgColor,
                },
              }
            : current.presetQuickSettings,
        }
      })
    }

    historyActions.addUndoRedoAction({
      undo: () => {
        assetStore.setState(current => ({
          ...current,
          appliedAssets: prevAppliedAssets,
          appliedAssetsByTheme: prevAppliedAssetsByTheme,
        }))
        if (clearBgColor) {
          setActiveModeBackgroundColor(oldBgColor)
        }
      },
      redo: () => {
        assetStore.setState(current => ({
          ...current,
          appliedAssets: nextAppliedAssets,
          appliedAssetsByTheme: nextAppliedAssetsByTheme,
        }))
        if (clearBgColor) {
          setActiveModeBackgroundColor('')
        }
      },
    })

    assetStore.setState(current => ({
      ...current,
      appliedAssets: nextAppliedAssets,
      appliedAssetsByTheme: nextAppliedAssetsByTheme,
    }))
    if (clearBgColor) {
      setActiveModeBackgroundColor('')
    }
  },

  unapplyAsset: (target: ThemeAssetTarget) => {
    const state = assetStore.getState()
    const themeKey = getActiveThemeAssetKey()
    const prevAppliedAssets = { ...state.appliedAssets }
    if (!prevAppliedAssets[target])
      return

    const nextAppliedAssets = { ...prevAppliedAssets }
    delete nextAppliedAssets[target]
    const prevAppliedAssetsByTheme = state.appliedAssetsByTheme
    const nextAppliedAssetsByTheme = withThemeAppliedAssets(prevAppliedAssetsByTheme, themeKey, nextAppliedAssets)

    historyActions.addUndoRedoAction({
      undo: () => {
        assetStore.setState(current => ({
          ...current,
          appliedAssets: prevAppliedAssets,
          appliedAssetsByTheme: prevAppliedAssetsByTheme,
        }))
      },
      redo: () => {
        assetStore.setState(current => ({
          ...current,
          appliedAssets: nextAppliedAssets,
          appliedAssetsByTheme: nextAppliedAssetsByTheme,
        }))
      },
    })

    assetStore.setState(current => ({
      ...current,
      appliedAssets: nextAppliedAssets,
      appliedAssetsByTheme: nextAppliedAssetsByTheme,
    }))
  },
}
