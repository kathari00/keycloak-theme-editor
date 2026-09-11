import type { EditorTheme, ThemeConfig, ThemeId } from '../presets/types'
import type { ThemeDocument } from './types'
import { useMemo } from 'react'
import {
  useCssFilesState,
  useFrameworkIdByThemeState,
  useLayoutIdByThemeState,
  useLocalizationState,
  usePresetState,
  useQuickSettingsStylesByThemeModeState,
  useQuickStartColorsState,
  useQuickStartContentState,
  useStylesCssState,
  useUploadedAssetsState,
} from '../editor/hooks/use-editor'
import { DEFAULT_BOOTSTRAP_VARIANT_ID, DEFAULT_FRAMEWORK_ID } from '../editor/lib/framework-bindings/types'
import { DEFAULT_LAYOUT_ID } from '../editor/lib/layouts/types'
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
  const { bootstrapVariantIdByTheme, frameworkIdByTheme } = useFrameworkIdByThemeState()
  const { layoutIdByTheme } = useLayoutIdByThemeState()
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
  // Framework binding only applies when the theme's markup is fully property-driven — force
  // 'native' otherwise, so downstream consumers (preview, export) never need to re-check the flag.
  const frameworkId = resolvedTheme?.supportsFrameworkBinding
    ? (frameworkIdByTheme[resolvedThemeId] ?? DEFAULT_FRAMEWORK_ID)
    : DEFAULT_FRAMEWORK_ID
  const bootstrapVariantId = bootstrapVariantIdByTheme[resolvedThemeId] ?? DEFAULT_BOOTSTRAP_VARIANT_ID
  // Layout selection only applies when the theme's markup exposes the shared split hooks — force
  // 'card' otherwise, so downstream consumers (preview, export) never need to re-check the flag.
  const layoutId = resolvedTheme?.supportsLayoutSelection
    ? (layoutIdByTheme[resolvedThemeId] ?? DEFAULT_LAYOUT_ID)
    : DEFAULT_LAYOUT_ID
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
    frameworkId,
    bootstrapVariantId,
    layoutId,
    uploadedAssets,
    appliedAssets,
  }), [
    appliedAssets,
    bootstrapVariantId,
    enabledLocales,
    frameworkId,
    isPresetTheme,
    layoutId,
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
