import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { assetStore } from './stores/asset-store'
import { coreStore } from './stores/core-store'
import { historyStore } from './stores/history-store'
import { presetStore } from './stores/preset-store'
import { themeStore } from './stores/theme-store'

export function useUndoRedoState() {
  return useStore(historyStore, useShallow(state => ({
    canUndo: state.canUndo,
    canRedo: state.canRedo,
  })))
}

export function useDarkModeState() {
  return useStore(coreStore, useShallow(state => ({
    isDarkMode: state.isDarkMode,
  })))
}

export function usePreviewState() {
  return useStore(coreStore, useShallow(state => ({
    activePageId: state.activePageId,
    activeStoryId: state.activeStoryId,
    selectedNodeId: state.selectedNodeId,
    previewReady: state.previewReady,
    deviceId: state.deviceId,
  })))
}

export function useEditorStore() {
  return useStore(themeStore, useShallow(state => ({
    pages: state.pages,
  })))
}

export function useStylesCssState() {
  return useStore(themeStore, useShallow(state => ({
    stylesCss: state.stylesCss,
  })))
}

export function usePresetState() {
  return useStore(presetStore, useShallow(state => ({
    selectedThemeId: state.selectedThemeId,
    presetCss: state.presetCss,
  })))
}

export function useQuickStartColorsState() {
  return useStore(presetStore, useShallow(state => ({
    colorPresetId: state.colorPresetId,
    colorPresetPrimaryColor: state.colorPresetPrimaryColor,
    colorPresetSecondaryColor: state.colorPresetSecondaryColor,
    colorPresetFontFamily: state.colorPresetFontFamily,
    colorPresetBgColor: state.colorPresetBgColor,
    colorPresetBorderRadius: state.colorPresetBorderRadius,
    colorPresetCardShadow: state.colorPresetCardShadow,
    colorPresetHeadingFontFamily: state.colorPresetHeadingFontFamily,
  })))
}

export function useQuickStartContentState() {
  return useStore(presetStore, useShallow(state => ({
    showClientName: state.showClientName,
    showRealmName: state.showRealmName,
    infoMessage: state.infoMessage,
    imprintUrl: state.imprintUrl,
    dataProtectionUrl: state.dataProtectionUrl,
  })))
}

export function useUploadedAssetsState() {
  return useStore(assetStore, useShallow(state => ({
    uploadedAssets: state.uploadedAssets,
    appliedAssets: state.appliedAssets,
  })))
}
