import type { AppliedAssets } from '../../assets/types'
import type { QuickSettingsMode } from '../lib/quick-settings'
import type { QuickStartExtrasUpdate } from './css-variable-reader'
import { COLOR_REGEX, CUSTOM_PRESET_ID } from '../lib/quick-start-css'
import { assetStore } from '../stores/asset-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { buildThemeQuickStartDefaults, getQuickStartExtrasState } from './css-variable-reader'
import { historyActions } from './history-actions'

interface SetQuickStartStyleOptions {
  headingFontFamily?: string
  recordHistory?: boolean
}

export const quickStartExtrasActions = {
  setQuickStartStyle: (
    primaryColor: string,
    secondaryColor: string,
    fontFamily: string,
    options?: SetQuickStartStyleOptions,
  ) => {
    const prevPreset = presetStore.getState()
    const oldValues = {
      colorPresetId: prevPreset.colorPresetId,
      colorPresetPrimaryColor: prevPreset.colorPresetPrimaryColor,
      colorPresetSecondaryColor: prevPreset.colorPresetSecondaryColor,
      colorPresetFontFamily: prevPreset.colorPresetFontFamily,
      colorPresetHeadingFontFamily: prevPreset.colorPresetHeadingFontFamily,
    }
    const newValues = {
      colorPresetId: CUSTOM_PRESET_ID,
      colorPresetPrimaryColor: primaryColor,
      colorPresetSecondaryColor: secondaryColor,
      colorPresetFontFamily: fontFamily,
      colorPresetHeadingFontFamily: options?.headingFontFamily ?? prevPreset.colorPresetHeadingFontFamily,
    }
    const sameValues
      = oldValues.colorPresetPrimaryColor === newValues.colorPresetPrimaryColor
        && oldValues.colorPresetSecondaryColor === newValues.colorPresetSecondaryColor
        && oldValues.colorPresetFontFamily === newValues.colorPresetFontFamily
        && oldValues.colorPresetHeadingFontFamily === newValues.colorPresetHeadingFontFamily
    if (sameValues) {
      return
    }

    const onlyColorChanged
      = oldValues.colorPresetFontFamily === newValues.colorPresetFontFamily
        && oldValues.colorPresetHeadingFontFamily === newValues.colorPresetHeadingFontFamily

    presetStore.setState(newValues)

    if (options?.recordHistory !== false) {
      historyActions.addUndoRedoAction({
        undo: () => {
          presetStore.setState(oldValues)
        },
        redo: () => {
          presetStore.setState(newValues)
        },
        scope: onlyColorChanged ? 'mode' : 'theme',
        coalesceKey: onlyColorChanged ? 'quickstart-color-picker' : undefined,
      })
    }
  },

  applyThemeModeDefaults: (
    mode: QuickSettingsMode,
    themeCssOverride?: string,
  ) => {
    const state = presetStore.getState()
    const defaultsCss
      = (themeCssOverride || '').trim()
        || (themeStore.getState().themeQuickStartDefaults || '').trim()
        || state.presetCss
    const defaults = buildThemeQuickStartDefaults(defaultsCss, mode)
    presetStore.setState({
      colorPresetId: defaults.colorPresetId,
      colorPresetPrimaryColor: defaults.colorPresetPrimaryColor || state.colorPresetPrimaryColor,
      colorPresetSecondaryColor: defaults.colorPresetSecondaryColor || state.colorPresetSecondaryColor,
      colorPresetFontFamily: defaults.colorPresetFontFamily,
      colorPresetBgColor: defaults.colorPresetBgColor,
      colorPresetBorderRadius: defaults.colorPresetBorderRadius,
      colorPresetCardShadow: defaults.colorPresetCardShadow,
      colorPresetHeadingFontFamily: defaults.colorPresetHeadingFontFamily,
    })
  },

  setQuickStartExtras: (update: QuickStartExtrasUpdate, options?: { recordHistory?: boolean }) => {
    const prevPreset = presetStore.getState()
    const prevAsset = assetStore.getState()

    const presetOldValues = getQuickStartExtrasState(prevPreset)
    const presetNewValues: Required<QuickStartExtrasUpdate>
      = { ...presetOldValues, ...update } as Required<QuickStartExtrasUpdate>

    const hasBgColor = Boolean(
      presetNewValues.colorPresetBgColor
      && COLOR_REGEX.test(presetNewValues.colorPresetBgColor),
    )
    const bgColorChanged = 'colorPresetBgColor' in update
    const assetOldValues = { appliedAssets: prevAsset.appliedAssets }
    const { background: _background, ...appliedWithoutBg } = prevAsset.appliedAssets
    const nextAppliedAssets: AppliedAssets = hasBgColor && bgColorChanged ? appliedWithoutBg : prevAsset.appliedAssets
    const assetNewValues = { appliedAssets: nextAppliedAssets }
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

    if (options?.recordHistory !== false) {
      const updateKeys = Object.keys(update) as (keyof QuickStartExtrasUpdate)[]
      const undoSlice = Object.fromEntries(updateKeys.map(k => [k, presetOldValues[k]])) as Partial<QuickStartExtrasUpdate>
      const redoSlice = Object.fromEntries(updateKeys.map(k => [k, presetNewValues[k]])) as Partial<QuickStartExtrasUpdate>

      historyActions.addUndoRedoAction({
        undo: () => {
          presetStore.setState(undoSlice)
          if (bgColorChanged) {
            assetStore.setState(assetOldValues)
          }
        },
        redo: () => {
          presetStore.setState(redoSlice)
          if (hasBgColor && bgColorChanged) {
            assetStore.setState(assetNewValues)
          }
        },
        scope: onlyBgColorChanged ? 'mode' : 'theme',
        coalesceKey: onlyBgColorChanged ? 'quickstart-bg-color-picker' : undefined,
      })
    }

    presetStore.setState(presetNewValues)
    if (hasBgColor && bgColorChanged) {
      assetStore.setState(assetNewValues)
    }
  },
}
