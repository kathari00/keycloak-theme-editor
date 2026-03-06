/**
 * Shared preset-state utilities used by all preset action modules.
 * Depends on stores (not pure) but has no side effects.
 */
import type { QuickSettingsMode } from '../lib/quick-settings'
import type { PresetState, QuickSettings } from '../stores/types'
import { buildQuickSettingsStorageKey, getThemeStorageKey } from '../lib/quick-settings'
import { coreStore } from '../stores/core-store'
import { themeStore } from '../stores/theme-store'
import { buildQuickSettingsSnapshot, buildThemeQuickStartDefaults } from './css-variable-reader'

export type { QuickSettingsMode }

export interface HistoryOptions {
  recordHistory?: boolean
}

export function normalizeQuickSettingsMode(mode: QuickSettingsMode | undefined): QuickSettingsMode {
  return mode === 'dark' ? 'dark' : 'light'
}

export function getCurrentQuickSettingsMode(): QuickSettingsMode {
  return coreStore.getState().isDarkMode ? 'dark' : 'light'
}

export function getOppositeQuickSettingsMode(mode: QuickSettingsMode): QuickSettingsMode {
  return mode === 'dark' ? 'light' : 'dark'
}

export function buildQuickSettingsKey(themeId: string, mode: QuickSettingsMode): string {
  return buildQuickSettingsStorageKey(getThemeStorageKey(themeId), mode)
}

/**
 * Builds a QuickSettings snapshot using the theme's quick-start CSS as defaults.
 * Reads themeStore for the quick-start defaults (falls back to presetCss if unset).
 */
export function buildModeDefaultsSnapshot(state: PresetState, mode: QuickSettingsMode): QuickSettings {
  const currentSnapshot = buildQuickSettingsSnapshot(state)
  const defaultsCss = (themeStore.getState().themeQuickStartDefaults || '').trim() || state.presetCss
  const modeDefaults = buildThemeQuickStartDefaults(defaultsCss, mode)
  return {
    ...currentSnapshot,
    colorPresetId: modeDefaults.colorPresetId,
    colorPresetPrimaryColor: modeDefaults.primaryColor || currentSnapshot.colorPresetPrimaryColor,
    colorPresetSecondaryColor: modeDefaults.secondaryColor || currentSnapshot.colorPresetSecondaryColor,
    colorPresetBgColor: modeDefaults.extras.colorPresetBgColor ?? currentSnapshot.colorPresetBgColor,
  }
}

export function seedOppositeModeSnapshotIfMissing(
  state: PresetState,
  enabled: boolean,
): Record<string, QuickSettings> {
  if (!enabled) {
    return state.presetQuickSettings
  }
  const themeStorageKey = getThemeStorageKey(state.selectedThemeId)
  const currentMode = getCurrentQuickSettingsMode()
  const oppositeMode = getOppositeQuickSettingsMode(currentMode)
  const oppositeModeKey = buildQuickSettingsKey(themeStorageKey, oppositeMode)
  if (state.presetQuickSettings[oppositeModeKey]) {
    return state.presetQuickSettings
  }
  return {
    ...state.presetQuickSettings,
    [oppositeModeKey]: buildModeDefaultsSnapshot(state, oppositeMode),
  }
}

export function buildModeScopedQuickSettingsMap(params: {
  state: PresetState
  nextSnapshot: QuickSettings
  baseQuickSettingsMap?: Record<string, QuickSettings>
}): Record<string, QuickSettings> {
  const { state, nextSnapshot, baseQuickSettingsMap } = params
  const themeStorageKey = getThemeStorageKey(state.selectedThemeId)
  const currentMode = getCurrentQuickSettingsMode()
  const currentModeKey = buildQuickSettingsKey(themeStorageKey, currentMode)
  const sharedFields = {
    colorPresetFontFamily: nextSnapshot.colorPresetFontFamily,
    colorPresetBorderRadius: nextSnapshot.colorPresetBorderRadius,
    colorPresetCardShadow: nextSnapshot.colorPresetCardShadow,
    colorPresetHeadingFontFamily: nextSnapshot.colorPresetHeadingFontFamily,
    showClientName: nextSnapshot.showClientName,
    showRealmName: nextSnapshot.showRealmName,
    infoMessage: nextSnapshot.infoMessage,
    imprintUrl: nextSnapshot.imprintUrl,
    dataProtectionUrl: nextSnapshot.dataProtectionUrl,
  }
  const nextQuickSettingsMap = { ...(baseQuickSettingsMap ?? state.presetQuickSettings) }

  for (const [key, value] of Object.entries(nextQuickSettingsMap)) {
    if (!key.startsWith(`${themeStorageKey}::`)) {
      continue
    }
    nextQuickSettingsMap[key] = {
      ...value,
      ...sharedFields,
    }
  }

  return {
    ...nextQuickSettingsMap,
    [currentModeKey]: nextSnapshot,
  }
}
