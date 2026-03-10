import type { EditorStore } from '../stores/create-editor-store'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

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

export function useHistoryRevisionState() {
  return useHistoryStoreSlice(state => ({
    revision: state.revision,
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
    themeQuickStartDefaults: state.themeQuickStartDefaults,
  }))
}

export function useCssFilesState() {
  return useThemeStoreSlice(state => ({
    stylesCssFiles: state.stylesCssFiles,
    activeCssFilePath: state.activeCssFilePath,
  }))
}

export function usePresetState() {
  return usePresetStoreSlice(state => ({
    selectedThemeId: state.selectedThemeId,
    presetCss: state.presetCss,
  }))
}

export function useQuickStartColorsState() {
  return usePresetStoreSlice(state => ({
    colorPresetId: state.colorPresetId,
    colorPresetPrimaryColor: state.colorPresetPrimaryColor,
    colorPresetSecondaryColor: state.colorPresetSecondaryColor,
    colorPresetFontFamily: state.colorPresetFontFamily,
    colorPresetBgColor: state.colorPresetBgColor,
    colorPresetBorderRadius: state.colorPresetBorderRadius,
    colorPresetCardShadow: state.colorPresetCardShadow,
    colorPresetHeadingFontFamily: state.colorPresetHeadingFontFamily,
  }))
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

export function useUploadedAssetsState() {
  return useAssetStoreSlice(state => ({
    uploadedAssets: state.uploadedAssets,
    appliedAssets: state.appliedAssets,
  }))
}
