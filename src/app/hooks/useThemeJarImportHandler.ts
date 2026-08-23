import type { ThemeConfig } from '../../features/presets/types'
import type { JarImportResult as ThemeImportData } from '../../features/theme-export/types'
import { useEffect } from 'react'
import { editorActions } from '../../features/editor/actions'
import { QUICK_START_CSS_PATH, singleFileMap } from '../../features/editor/lib/css-files'
import { sanitizeThemeCssSourceForEditor } from '../../features/editor/lib/css-source-sanitizer'
import { assetStore } from '../../features/editor/stores/asset-store'
import { getThemeCssStructuredCached, resolveThemeIdFromConfig } from '../../features/presets/queries'
import { THEME_JAR_IMPORTED_EVENT } from '../../features/theme-export/jar-import-service'

export function useThemeJarImportHandler(params: {
  isDarkMode: boolean
  selectedThemeId: string
  themeConfig: ThemeConfig
}): void {
  const { isDarkMode, selectedThemeId, themeConfig } = params

  useEffect(() => {
    const handleThemeJarImported = (event: Event) => {
      void (async () => {
        const detail = (event as CustomEvent<ThemeImportData | undefined>).detail
        if (!detail) {
          return
        }

        const targetThemeId = resolveThemeIdFromConfig(themeConfig, detail.sourceThemeId || detail.themeName || selectedThemeId)
        const themeCssStructured = await getThemeCssStructuredCached(targetThemeId).catch(() => ({ quickStartDefaults: '', stylesCss: '' }))
        const importedCss = sanitizeThemeCssSourceForEditor((detail.css || '').trim())
        const importedQuickStartCss = (detail.quickStartCss || '').trim() || themeCssStructured.quickStartDefaults
        const importedCssFiles = detail.stylesCssFiles && Object.keys(detail.stylesCssFiles).length > 0
          ? { [QUICK_START_CSS_PATH]: importedQuickStartCss, ...detail.stylesCssFiles }
          : { [QUICK_START_CSS_PATH]: importedQuickStartCss, ...singleFileMap(importedCss) }
        editorActions.applyThemeCssData({
          themeId: targetThemeId,
          stylesCss: importedCss,
          stylesCssFiles: importedCssFiles,
          quickStartDefaults: importedQuickStartCss,
          quickSettingsMode: isDarkMode ? 'dark' : 'light',
          replaceQuickSettingsStyles: true,
        })
        editorActions.applyThemeContentDefaults(themeConfig, targetThemeId)
        editorActions.applyImportedQuickSettingsForPreset(detail.quickSettingsByMode)
        editorActions.applyImportedLocalization(detail.enabledLocales, detail.quickStartContentByLocale)
        const importedAssets = detail.uploadedAssets || []
        const importedCategories = new Set(importedAssets.map(a => `${a.category}:${a.name}`))
        const preservedDefaults = assetStore.getState().uploadedAssets.filter(
          a => a.isDefault && !importedCategories.has(`${a.category}:${a.name}`),
        )
        editorActions.setUploadedAssets([...preservedDefaults, ...importedAssets])
        editorActions.setAppliedAssets(detail.appliedAssets || {})
      })()
    }

    window.addEventListener(THEME_JAR_IMPORTED_EVENT, handleThemeJarImported as EventListener)
    return () => {
      window.removeEventListener(THEME_JAR_IMPORTED_EVENT, handleThemeJarImported as EventListener)
    }
  }, [isDarkMode, selectedThemeId, themeConfig])
}
