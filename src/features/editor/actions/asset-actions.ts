import type { AppliedAssets, ThemeAssetTarget, UploadedAsset } from '../../assets/types'
import { REMOVED_ASSET_ID } from '../../assets/types'
import { assetStore } from '../stores/asset-store'
import { presetStore } from '../stores/preset-store'
import { historyActions } from './history-actions'

export const assetActions = {
  setUploadedAssets: (uploadedAssets: UploadedAsset[]) => {
    assetStore.setState({ uploadedAssets })
  },

  setAppliedAssets: (appliedAssets: AppliedAssets) => {
    assetStore.setState({ appliedAssets })
  },

  addUploadedAsset: (asset: UploadedAsset) => {
    assetStore.setState(state => ({
      uploadedAssets: [...state.uploadedAssets, asset],
    }))
  },

  removeUploadedAsset: (assetId: string) => {
    const state = assetStore.getState()
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
        assetStore.setState({ uploadedAssets: prevUploadedAssets, appliedAssets: prevAppliedAssets })
      },
      redo: () => {
        assetStore.setState({ uploadedAssets: nextUploadedAssets, appliedAssets: nextAppliedAssets })
      },
    })

    assetStore.setState({ uploadedAssets: nextUploadedAssets, appliedAssets: nextAppliedAssets })
  },

  applyAsset: (target: ThemeAssetTarget, assetId: string) => {
    const state = assetStore.getState()
    const prevAppliedAssets = { ...state.appliedAssets }
    const nextAppliedAssets = { ...prevAppliedAssets, [target]: assetId }

    if (prevAppliedAssets[target] === assetId)
      return

    const oldBgColor = presetStore.getState().colorPresetBgColor
    const clearBgColor = target === 'background' && Boolean(oldBgColor)

    historyActions.addUndoRedoAction({
      undo: () => {
        assetStore.setState({ appliedAssets: prevAppliedAssets })
        if (clearBgColor) {
          presetStore.setState({ colorPresetBgColor: oldBgColor })
        }
      },
      redo: () => {
        assetStore.setState({ appliedAssets: nextAppliedAssets })
        if (clearBgColor) {
          presetStore.setState({ colorPresetBgColor: '' })
        }
      },
    })

    assetStore.setState({ appliedAssets: nextAppliedAssets })
    if (clearBgColor) {
      presetStore.setState({ colorPresetBgColor: '' })
    }
  },

  unapplyAsset: (target: ThemeAssetTarget) => {
    const state = assetStore.getState()
    const prevAppliedAssets = { ...state.appliedAssets }
    if (!prevAppliedAssets[target])
      return

    const nextAppliedAssets = { ...prevAppliedAssets }
    delete nextAppliedAssets[target]

    historyActions.addUndoRedoAction({
      undo: () => {
        assetStore.setState({ appliedAssets: prevAppliedAssets })
      },
      redo: () => {
        assetStore.setState({ appliedAssets: nextAppliedAssets })
      },
    })

    assetStore.setState({ appliedAssets: nextAppliedAssets })
  },
}
