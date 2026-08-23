import type { EditorTheme, ThemeConfig, ThemeId } from '../presets/types'
import type { ThemeDocument } from './types'
import { useMemo } from 'react'
import {
  useCssFilesState,
  useLocalizationState,
  usePresetState,
  useQuickSettingsStylesByThemeModeState,
  useQuickStartColorsState,
  useQuickStartContentState,
  useStylesCssState,
  useUploadedAssetsState,
} from '../editor/hooks/use-editor'
import { resolveThemeIdFromConfig, useThemeConfig } from '../presets/queries'
import { createQuickSettings, createThemeDocument } from './theme-document'

export interface ThemeDocumentContext {
  themeDocument: ThemeDocument
  themeConfig: ThemeConfig
  selectedThemeId: ThemeId
  resolvedThemeId: ThemeId
  resolvedTheme: EditorTheme | undefined
  isPresetTheme: boolean
}

export function useThemeDocument(): ThemeDocumentContext {
  const { uploadedAssets, appliedAssets } = useUploadedAssetsState()
  const { selectedThemeId } = usePresetState()
  const { stylesCss, themeQuickStartDefaults } = useStylesCssState()
  const { stylesCssFiles } = useCssFilesState()
  const { quickSettingsStylesByThemeMode } = useQuickSettingsStylesByThemeModeState()
  const colors = useQuickStartColorsState()
  const content = useQuickStartContentState()
  const { enabledLocales, quickStartContentByLocale } = useLocalizationState()
  const themeConfig = useThemeConfig()
  const resolvedThemeId = resolveThemeIdFromConfig(themeConfig, selectedThemeId)
  const resolvedTheme = themeConfig.themes.find(theme => theme.id === resolvedThemeId)
  const isPresetTheme = resolvedTheme?.type !== 'imported'
  const quickSettingsStylesForTheme = useMemo(
    () => quickSettingsStylesByThemeMode[resolvedThemeId] ?? {},
    [quickSettingsStylesByThemeMode, resolvedThemeId],
  )
  const quickSettings = useMemo(() => createQuickSettings(colors, content), [colors, content])
  const themeDocument = useMemo(() => createThemeDocument({
    themeId: resolvedThemeId,
    isPresetTheme,
    stylesCss,
    stylesCssFiles,
    quickStartCss: themeQuickStartDefaults,
    quickSettings,
    quickSettingsStylesByMode: quickSettingsStylesForTheme,
    enabledLocales,
    quickStartContentByLocale,
    uploadedAssets,
    appliedAssets,
  }), [
    appliedAssets,
    enabledLocales,
    isPresetTheme,
    quickSettings,
    quickSettingsStylesForTheme,
    quickStartContentByLocale,
    resolvedThemeId,
    stylesCss,
    stylesCssFiles,
    themeQuickStartDefaults,
    uploadedAssets,
  ])

  return useMemo(() => ({
    themeDocument,
    themeConfig,
    selectedThemeId,
    resolvedThemeId,
    resolvedTheme,
    isPresetTheme,
  }), [
    isPresetTheme,
    resolvedTheme,
    resolvedThemeId,
    selectedThemeId,
    themeConfig,
    themeDocument,
  ])
}
