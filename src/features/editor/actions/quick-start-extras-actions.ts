import type { AppliedAssets } from '../../assets/types'
import type { QuickSettingsMode } from '../lib/quick-settings'
import type { QuickSettingsStyle } from '../stores/types'
import type { QuickStartExtrasUpdate } from './css-variable-reader'
import { COLOR_REGEX, CUSTOM_PRESET_ID } from '../lib/quick-start-css'
import { assetStore } from '../stores/asset-store'
import { presetStore } from '../stores/preset-store'
import { getQuickStartExtrasState, withoutUndefinedValues } from './css-variable-reader'
import { historyActions } from './history-actions'
import {
  applyQuickSettingsStyleMode,
  applyQuickSettingsStyleUpdate,
  replaceQuickSettingsStylesForThemeFromCss,
  SHARED_QUICK_SETTINGS_STYLE_KEYS,
  SHARED_QUICK_START_EXTRAS_STYLE_KEYS,
} from './quick-settings-style-state'

interface SetQuickStartStyleOptions {
  headingFontFamily?: string
  recordHistory?: boolean
}

function pickQuickStartExtrasStyleUpdate(update: QuickStartExtrasUpdate): Partial<QuickSettingsStyle> {
  return withoutUndefinedValues({
    colorPresetBgColor: update.colorPresetBgColor,
    colorPresetBorderRadius: update.colorPresetBorderRadius,
    colorPresetCardShadow: update.colorPresetCardShadow,
    colorPresetHeadingFontFamily: update.colorPresetHeadingFontFamily,
  })
}

function pickQuickStartExtrasContentUpdate(update: QuickStartExtrasUpdate): Partial<QuickStartExtrasUpdate> {
  return withoutUndefinedValues({
    showClientName: update.showClientName,
    showRealmName: update.showRealmName,
    infoMessage: update.infoMessage,
    imprintUrl: update.imprintUrl,
    dataProtectionUrl: update.dataProtectionUrl,
  })
}

function applyQuickStartExtrasPatch(update: QuickStartExtrasUpdate): void {
  const styleUpdate = pickQuickStartExtrasStyleUpdate(update)
  if (Object.keys(styleUpdate).length > 0) {
    applyQuickSettingsStyleUpdate(styleUpdate, {
      sharedKeys: SHARED_QUICK_START_EXTRAS_STYLE_KEYS,
    })
  }

  const contentUpdate = pickQuickStartExtrasContentUpdate(update)
  if (Object.keys(contentUpdate).length > 0) {
    presetStore.setState(contentUpdate)
  }
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

    applyQuickSettingsStyleUpdate(newValues, {
      sharedKeys: SHARED_QUICK_SETTINGS_STYLE_KEYS,
    })

    if (options?.recordHistory !== false) {
      historyActions.addUndoRedoAction({
        undo: () => {
          applyQuickSettingsStyleUpdate(oldValues, {
            sharedKeys: SHARED_QUICK_SETTINGS_STYLE_KEYS,
          })
        },
        redo: () => {
          applyQuickSettingsStyleUpdate(newValues, {
            sharedKeys: SHARED_QUICK_SETTINGS_STYLE_KEYS,
          })
        },
        scope: onlyColorChanged ? 'mode' : 'theme',
        coalesceKey: onlyColorChanged ? 'quickstart-color-picker' : undefined,
      })
    }
  },

  applyThemeModeDefaults: (
    mode: QuickSettingsMode,
    themeCssOverride?: string,
    options: { themeId?: string, replaceStyles?: boolean } = {},
  ) => {
    if (options.replaceStyles && themeCssOverride !== undefined) {
      replaceQuickSettingsStylesForThemeFromCss({
        themeId: options.themeId,
        css: themeCssOverride,
        activeMode: mode,
      })
      return
    }

    applyQuickSettingsStyleMode({
      themeId: options.themeId,
      mode,
      sourceCss: themeCssOverride,
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
          applyQuickStartExtrasPatch(undoSlice)
          if (bgColorChanged) {
            assetStore.setState(assetOldValues)
          }
        },
        redo: () => {
          applyQuickStartExtrasPatch(redoSlice)
          if (hasBgColor && bgColorChanged) {
            assetStore.setState(assetNewValues)
          }
        },
        scope: onlyBgColorChanged ? 'mode' : 'theme',
        coalesceKey: onlyBgColorChanged ? 'quickstart-bg-color-picker' : undefined,
      })
    }

    applyQuickStartExtrasPatch(presetNewValues)
    if (hasBgColor && bgColorChanged) {
      assetStore.setState(assetNewValues)
    }
  },
}
