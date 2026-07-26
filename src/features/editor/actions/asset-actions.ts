import type { AppliedAssets, ThemeAssetTarget, UploadedAsset } from '../../assets/types'
import { NONE_ASSET_ID } from '../../assets/types'
import { getThemeStorageKey } from '../lib/quick-settings'
import { assetStore } from '../stores/asset-store'
import { presetStore } from '../stores/preset-store'
import { historyActions } from './history-actions'
import { applyQuickSettingsStyleUpdate } from './quick-settings-style-state'

// Targets whose applied asset can be silently re-filled by a theme's declared
// defaults (see theme-selection-actions.syncDefaultAssetsForTheme). Clearing
// these writes NONE_ASSET_ID instead of deleting the key, so that resync
// logic can tell "explicitly removed" apart from "never decided."
const DEFAULT_BACKED_TARGETS = new Set<ThemeAssetTarget>(['background', 'logo'])

function clearAppliedTarget(applied: AppliedAssets, target: ThemeAssetTarget): AppliedAssets {
  const next = { ...applied }
  if (DEFAULT_BACKED_TARGETS.has(target)) {
    next[target] = NONE_ASSET_ID
  }
  else {
    delete next[target]
  }
  return next
}

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
      ? [...prevState.uploadedAssets.filter(a => a.category !== asset.category || a.isDefault), asset]
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
    let nextAppliedAssets = { ...prevAppliedAssets }

    if (asset.category === 'background' && (!prevAppliedAssets.background || prevAppliedAssets.background === assetId)) {
      nextAppliedAssets = clearAppliedTarget(nextAppliedAssets, 'background')
    }
    if (asset.category === 'logo' && (!prevAppliedAssets.logo || prevAppliedAssets.logo === assetId)) {
      nextAppliedAssets = clearAppliedTarget(nextAppliedAssets, 'logo')
    }
    if (asset.category === 'font' && prevAppliedAssets.bodyFont === assetId) {
      nextAppliedAssets = clearAppliedTarget(nextAppliedAssets, 'bodyFont')
    }
    if (asset.category === 'favicon' && prevAppliedAssets.favicon === assetId) {
      nextAppliedAssets = clearAppliedTarget(nextAppliedAssets, 'favicon')
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

    const oldBgColor = presetStore.getState().colorPresetBgColor || ''
    const clearBgColor = target === 'background' && Boolean(oldBgColor)

    const setActiveModeBackgroundColor = (colorPresetBgColor: string) => {
      if (presetStore.getState().colorPresetBgColor === colorPresetBgColor) {
        return
      }
      applyQuickSettingsStyleUpdate({ colorPresetBgColor })
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
    if (!prevAppliedAssets[target] || prevAppliedAssets[target] === NONE_ASSET_ID)
      return

    const nextAppliedAssets = clearAppliedTarget(prevAppliedAssets, target)
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
