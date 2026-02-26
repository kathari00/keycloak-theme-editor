import { useMemo } from 'react'
import { useStore } from 'zustand'
import type { EditorStore } from './stores/create-editor-store'
import { useShallow } from 'zustand/react/shallow'
import { buildQuickSettingsStorageKey, resolveQuickSettingsMode } from './quick-settings'
import { assetStore } from './stores/asset-store'
import { coreStore } from './stores/core-store'
import { historyStore } from './stores/history-store'
import { DEFAULT_QUICK_SETTINGS_STYLE, presetStore } from './stores/preset-store'
import { themeStore } from './stores/theme-store'

function createShallowStoreHook<TState extends object>(store: EditorStore<TState>) {
  return function useShallowStoreSlice<TSlice extends object>(selector: (state: TState) => TSlice): TSlice {
    return useStore(store, useShallow(selector))
  }
}

const useHistoryStoreSlice = createShallowStoreHook(historyStore)
const useCoreStoreSlice = createShallowStoreHook(coreStore)
const useThemeStoreSlice = createShallowStoreHook(themeStore)
const usePresetStoreSlice = createShallowStoreHook(presetStore)
const useAssetStoreSlice = createShallowStoreHook(assetStore)

export function useUndoRedoState() {
  return useHistoryStoreSlice(state => ({
    canUndo: state.canUndo,
    canRedo: state.canRedo,
  }))
}

export function useDarkModeState() {
  return useCoreStoreSlice(state => ({
    isDarkMode: state.isDarkMode,
  }))
}

export function usePreviewState() {
  return useCoreStoreSlice(state => ({
    activePageId: state.activePageId,
    activeStoryId: state.activeStoryId,
    selectedNodeId: state.selectedNodeId,
    previewReady: state.previewReady,
    deviceId: state.deviceId,
  }))
}

export function useEditorStore() {
  return useThemeStoreSlice(state => ({
    pages: state.pages,
  }))
}

export function useStylesCssState() {
  return useThemeStoreSlice(state => ({
    stylesCss: state.stylesCss,
  }))
}

export function usePresetState() {
  return usePresetStoreSlice(state => ({
    selectedThemeId: state.selectedThemeId,
    presetCss: state.presetCss,
  }))
}

export function useQuickStartColorsState() {
  const { selectedThemeId, quickSettingsByThemeMode } = usePresetStoreSlice(state => ({
    selectedThemeId: state.selectedThemeId,
    quickSettingsByThemeMode: state.quickSettingsByThemeMode,
  }))
  const { isDarkMode } = useCoreStoreSlice(state => ({
    isDarkMode: state.isDarkMode,
  }))

  return useMemo(() => {
    const modeKey = buildQuickSettingsStorageKey(selectedThemeId, resolveQuickSettingsMode(isDarkMode))
    return quickSettingsByThemeMode[modeKey] ?? DEFAULT_QUICK_SETTINGS_STYLE
  }, [isDarkMode, quickSettingsByThemeMode, selectedThemeId])
}

export function useQuickStartContentState() {
  return usePresetStoreSlice(state => ({
    showClientName: state.showClientName,
    showRealmName: state.showRealmName,
    infoMessage: state.infoMessage,
    imprintUrl: state.imprintUrl,
    dataProtectionUrl: state.dataProtectionUrl,
  }))
}

export function useQuickSettingsByThemeModeState() {
  return usePresetStoreSlice(state => ({
    quickSettingsByThemeMode: state.quickSettingsByThemeMode,
  }))
}

export function useUploadedAssetsState() {
  return useAssetStoreSlice(state => ({
    uploadedAssets: state.uploadedAssets,
    appliedAssets: state.appliedAssets,
  }))
}
