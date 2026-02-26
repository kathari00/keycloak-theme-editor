import type { AppliedAssets, ThemeAssetTarget, UploadedAsset } from '../../assets/types'
import { REMOVED_ASSET_ID } from '../../assets/types'
import { buildQuickSettingsStorageKey, resolveQuickSettingsMode } from '../quick-settings'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { historyActions } from './history-actions'

export const assetActions = {
  setUploadedAssets: (uploadedAssets: UploadedAsset[]) => {
    assetStore.setState(state => ({ ...state, uploadedAssets }))
  },

  setAppliedAssets: (appliedAssets: AppliedAssets) => {
    assetStore.setState(state => ({ ...state, appliedAssets }))
  },

  addUploadedAsset: (asset: UploadedAsset) => {
    assetStore.setState(state => ({
      ...state,
      uploadedAssets: [...state.uploadedAssets, asset],
    }))
  },

  removeUploadedAsset: (assetId: string) => {
    const state = assetStore.state
    const asset = state.uploadedAssets.find(a => a.id === assetId)
    if (!asset)
      return

    const prevUploadedAssets = state.uploadedAssets
    const nextUploadedAssets = prevUploadedAssets.filter(a => a.id !== assetId)

    const prevAppliedAssets = { ...state.appliedAssets }
    const nextAppliedAssets = { ...prevAppliedAssets }

    if (asset.category === 'background') {
      if (asset.isDefault && (!prevAppliedAssets.background || prevAppliedAssets.background === assetId)) {
        nextAppliedAssets.background = REMOVED_ASSET_ID
      }
      else if (prevAppliedAssets.background === assetId) {
        delete nextAppliedAssets.background
      }
    }
    if (asset.category === 'logo') {
      if (asset.isDefault && (!prevAppliedAssets.logo || prevAppliedAssets.logo === assetId)) {
        nextAppliedAssets.logo = REMOVED_ASSET_ID
      }
      else if (prevAppliedAssets.logo === assetId) {
        delete nextAppliedAssets.logo
      }
    }
    if (asset.category === 'font' && prevAppliedAssets.bodyFont === assetId) {
      delete nextAppliedAssets.bodyFont
    }
    if (asset.category === 'favicon' && prevAppliedAssets.favicon === assetId) {
      delete nextAppliedAssets.favicon
    }

    historyActions.addUndoRedoAction({
      undo: () => {
        assetStore.setState(current => ({
          ...current,
          uploadedAssets: prevUploadedAssets,
          appliedAssets: prevAppliedAssets,
        }))
      },
      redo: () => {
        assetStore.setState(current => ({
          ...current,
          uploadedAssets: nextUploadedAssets,
          appliedAssets: nextAppliedAssets,
        }))
      },
    })

    assetStore.setState(current => ({
      ...current,
      uploadedAssets: nextUploadedAssets,
      appliedAssets: nextAppliedAssets,
    }))
  },

  // Cross-domain: applying a background image clears background color from presetStore
  applyAsset: (target: ThemeAssetTarget, assetId: string) => {
    const state = assetStore.state
    const prevAppliedAssets = { ...state.appliedAssets }
    const nextAppliedAssets = { ...prevAppliedAssets, [target]: assetId }

    if (prevAppliedAssets[target] === assetId)
      return

    const activeQuickSettingsKey = buildQuickSettingsStorageKey(
      presetStore.state.selectedThemeId,
      resolveQuickSettingsMode(coreStore.state.isDarkMode),
    )
    const oldBgColor = presetStore.state.quickSettingsByThemeMode[activeQuickSettingsKey]?.colorPresetBgColor || ''
    const clearBgColor = target === 'background' && Boolean(oldBgColor)

    const setActiveModeBackgroundColor = (colorPresetBgColor: string) => {
      presetStore.setState((current) => {
        const activeQuickSettings = current.quickSettingsByThemeMode[activeQuickSettingsKey]
        if (!activeQuickSettings || activeQuickSettings.colorPresetBgColor === colorPresetBgColor) {
          return current
        }
        return {
          ...current,
          quickSettingsByThemeMode: {
            ...current.quickSettingsByThemeMode,
            [activeQuickSettingsKey]: {
              ...activeQuickSettings,
              colorPresetBgColor,
            },
          },
        }
      })
    }

    historyActions.addUndoRedoAction({
      undo: () => {
        assetStore.setState(current => ({ ...current, appliedAssets: prevAppliedAssets }))
        if (clearBgColor) {
          setActiveModeBackgroundColor(oldBgColor)
        }
      },
      redo: () => {
        assetStore.setState(current => ({ ...current, appliedAssets: nextAppliedAssets }))
        if (clearBgColor) {
          setActiveModeBackgroundColor('')
        }
      },
    })

    assetStore.setState(current => ({ ...current, appliedAssets: nextAppliedAssets }))
    if (clearBgColor) {
      setActiveModeBackgroundColor('')
    }
  },

  unapplyAsset: (target: ThemeAssetTarget) => {
    const state = assetStore.state
    const prevAppliedAssets = { ...state.appliedAssets }
    if (!prevAppliedAssets[target])
      return

    const nextAppliedAssets = { ...prevAppliedAssets }
    delete nextAppliedAssets[target]

    historyActions.addUndoRedoAction({
      undo: () => {
        assetStore.setState(current => ({ ...current, appliedAssets: prevAppliedAssets }))
      },
      redo: () => {
        assetStore.setState(current => ({ ...current, appliedAssets: nextAppliedAssets }))
      },
    })

    assetStore.setState(current => ({ ...current, appliedAssets: nextAppliedAssets }))
  },
}
