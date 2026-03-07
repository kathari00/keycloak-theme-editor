import type { AppliedAssets } from '../../assets/types'
import type { QuickSettingsMode } from '../lib/quick-settings'
import type { QuickSettings } from '../stores/types'
import type { QuickStartExtrasUpdate } from './css-variable-reader'
import { COLOR_REGEX, CUSTOM_PRESET_ID } from '../lib/quick-start-css'
import { assetStore } from '../stores/asset-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import {
  buildQuickSettingsSnapshot,
  buildThemeQuickStartDefaults,
  DEFAULT_QUICK_START_EXTRAS,
  getQuickStartExtrasState,
} from './css-variable-reader'
import { historyActions } from './history-actions'
import {
  buildModeDefaultsSnapshot,
  buildModeScopedQuickSettingsMap,
  buildQuickSettingsKey,
  getCurrentQuickSettingsMode,
  normalizeQuickSettingsMode,
  seedOppositeModeSnapshotIfMissing,
} from './preset-state'

interface SetQuickStartStyleOptions {
  headingFontFamily?: string
  recordHistory?: boolean
}

interface RestoreQuickSettingsOptions {
  restoreSharedValues?: boolean
}

export const quickStartExtrasActions = {
  setQuickStartStyle: (
    primaryColor: string,
    secondaryColor: string,
    fontFamily: string,
    options?: SetQuickStartStyleOptions,
  ) => {
    const prevPreset = presetStore.getState()
    const shouldSeedOppositeMode = options?.recordHistory !== false
    const seededQuickSettingsMap = seedOppositeModeSnapshotIfMissing(prevPreset, shouldSeedOppositeMode)
    const previousQuickSettingsMap = seededQuickSettingsMap
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

    const nextQuickSettingsSnapshot: QuickSettings = {
      ...buildQuickSettingsSnapshot(prevPreset),
      ...newValues,
    }
    const nextPresetQuickSettings = buildModeScopedQuickSettingsMap({
      state: prevPreset,
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
        scope: onlyColorChanged ? 'mode' : 'theme',
        coalesceKey: onlyColorChanged ? 'quickstart-color-picker' : undefined,
      })
    }
  },

  applyThemeModeDefaults: (
    mode: QuickSettingsMode,
    themeCssOverride?: string,
    options?: { preserveSharedValues?: boolean },
  ) => {
    const state = presetStore.getState()
    const defaultsCss
      = (themeCssOverride || '').trim()
        || (themeStore.getState().themeQuickStartDefaults || '').trim()
        || state.presetCss
    const defaults = buildThemeQuickStartDefaults(defaultsCss, mode)
    const nextState = options?.preserveSharedValues
      ? {
          colorPresetId: defaults.colorPresetId,
          colorPresetPrimaryColor: defaults.primaryColor,
          colorPresetSecondaryColor: defaults.secondaryColor,
          colorPresetBgColor: defaults.extras.colorPresetBgColor ?? state.colorPresetBgColor,
        }
      : {
          colorPresetId: defaults.colorPresetId,
          colorPresetPrimaryColor: defaults.primaryColor,
          colorPresetSecondaryColor: defaults.secondaryColor,
          colorPresetFontFamily: defaults.fontFamily,
          ...defaults.extras,
        }
    presetStore.setState({
      ...nextState,
    })
  },

  setQuickStartExtras: (update: QuickStartExtrasUpdate, options?: { recordHistory?: boolean }) => {
    const prevPreset = presetStore.getState()
    const prevAsset = assetStore.getState()
    const shouldSeedOppositeMode = options?.recordHistory !== false
    const seededQuickSettingsMap = seedOppositeModeSnapshotIfMissing(prevPreset, shouldSeedOppositeMode)
    const previousQuickSettingsMap = seededQuickSettingsMap

    const presetOldValues = getQuickStartExtrasState(prevPreset)
    const presetNewValues: Required<QuickStartExtrasUpdate>
      = { ...presetOldValues, ...update } as Required<QuickStartExtrasUpdate>

    const hasBgColor = Boolean(
      presetNewValues.colorPresetBgColor
      && COLOR_REGEX.test(presetNewValues.colorPresetBgColor),
    )
    const assetOldValues = { appliedAssets: prevAsset.appliedAssets }
    const { background: _, ...appliedWithoutBg } = prevAsset.appliedAssets
    const nextAppliedAssets: AppliedAssets = hasBgColor ? appliedWithoutBg : prevAsset.appliedAssets
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
        scope: onlyBgColorChanged ? 'mode' : 'theme',
        coalesceKey: onlyBgColorChanged ? 'quickstart-bg-color-picker' : undefined,
      })
    }

    presetStore.setState({ ...presetNewValues, presetQuickSettings: nextPresetQuickSettings })
    if (hasBgColor) {
      assetStore.setState(assetNewValues)
    }
  },

  saveQuickSettingsForPreset: (themeId: string, mode: QuickSettingsMode = getCurrentQuickSettingsMode()) => {
    const s = presetStore.getState()
    const storageKey = buildQuickSettingsKey(themeId, normalizeQuickSettingsMode(mode))
    const settings = buildQuickSettingsSnapshot(s)
    presetStore.setState(state => ({
      presetQuickSettings: { ...state.presetQuickSettings, [storageKey]: settings },
    }))
  },

  restoreQuickSettingsForPreset: (
    themeId: string,
    mode: QuickSettingsMode = getCurrentQuickSettingsMode(),
    options?: RestoreQuickSettingsOptions,
  ): boolean => {
    const storageKey = buildQuickSettingsKey(themeId, normalizeQuickSettingsMode(mode))
    const state = presetStore.getState()
    const saved = state.presetQuickSettings[storageKey]
    if (!saved) {
      return false
    }
    presetStore.setState(currentState => ({
      ...(options?.restoreSharedValues
        ? saved
        : {
            colorPresetId: saved.colorPresetId,
            colorPresetPrimaryColor: saved.colorPresetPrimaryColor,
            colorPresetSecondaryColor: saved.colorPresetSecondaryColor,
            colorPresetBgColor: saved.colorPresetBgColor,
          }),
      presetQuickSettings: currentState.presetQuickSettings,
    }))
    return true
  },
}

export { buildModeDefaultsSnapshot }
export { DEFAULT_QUICK_START_EXTRAS }
