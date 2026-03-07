import type { UploadedAsset } from '../features/assets/types'
import type { JarImportResult as ThemeImportData } from '../features/theme-export/types'
import { useEffect, useRef, useState } from 'react'
import ContextBar from '../components/ContextBar'
import ErrorBoundary from '../components/ErrorBoundary'
import RightSidebar from '../components/RightSidebar'
import Topbar from '../components/Topbar'
import { editorActions } from '../features/editor/actions'
import { useDarkModeState, usePresetState, usePreviewState } from '../features/editor/hooks/use-editor'
import { sanitizeThemeCssSourceForEditor } from '../features/editor/lib/css-source-sanitizer'
import { assetStore } from '../features/editor/stores/asset-store'
import { getThemeCssStructuredCached, resolveThemeIdFromConfig, useThemeConfig } from '../features/presets/queries'
import { themeResourcePath } from '../features/presets/types'
import { connectLiveReload, ensureGeneratedPreviewPagesLoaded, getVariantPages, resolvePreviewVariantId } from '../features/preview/load-generated'
import { PreviewProvider } from '../features/preview/components/PreviewProvider'
import { PreviewShell } from '../features/preview/components/PreviewShell'
import { THEME_JAR_IMPORTED_EVENT } from '../features/theme-export/jar-import-service'
import { useResizableSidebar } from './hooks/useResizableSidebar'
import '@patternfly/react-core/dist/styles/base.css'

const loadingSpinner = (
  <div
    className="flex items-center justify-center h-screen flex-col"
    style={{ backgroundColor: 'var(--pf-t--global--background--color--primary--default)' }}
  >
    <div className="pf-v6-c-spinner pf-m-xl" role="progressbar" aria-label="Loading...">
      <span className="pf-v6-c-spinner__clipper"></span>
      <span className="pf-v6-c-spinner__lead-ball"></span>
      <span className="pf-v6-c-spinner__tail-ball"></span>
    </div>
  </div>
)

async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.readAsDataURL(blob)
  })
}

export default function EditorContent() {
  const { selectedThemeId } = usePresetState()
  const { isDarkMode } = useDarkModeState()
  const { activePageId } = usePreviewState()
  const themeConfig = useThemeConfig()
  const [previewPagesReady, setPreviewPagesReady] = useState(false)
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const { isDesktopLayout, sidebarWidth: rightSidebarWidth, handleResizeStart: handleSidebarResizeStart } = useResizableSidebar({ layoutRef })

  useEffect(() => {
    let cancelled = false

    ensureGeneratedPreviewPagesLoaded()
      .then(() => {
        if (!cancelled) {
          setPreviewPagesReady(true)
          connectLiveReload(() => setPreviewPagesReady(true))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewPagesReady(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const resolvedThemeId = resolveThemeIdFromConfig(themeConfig, selectedThemeId)
  const variantId = resolvePreviewVariantId({ selectedThemeId: resolvedThemeId })
  const pageMap = previewPagesReady ? getVariantPages(variantId) : {}
  const pageIds = Object.keys(pageMap)
  const initialPageId = (() => {
    if (activePageId && pageMap[activePageId]) {
      return activePageId
    }

    if (pageMap['login.html']) {
      return 'login.html'
    }

    const firstRegularHtmlPage = pageIds.find(pageId => pageId.endsWith('.html') && pageId !== 'cli_splash.html')
    return firstRegularHtmlPage || pageIds[0] || 'login.html'
  })()
  useEffect(() => {
    if (!previewPagesReady) {
      return
    }

    const initialize = async () => {
      const pages = Object.entries(pageMap).map(([id, component]) => ({
        id,
        name: id.replace('.html', '.ftl'),
        component,
      }))
      pages.sort((left, right) => (left.id === 'login.html' ? -1 : right.id === 'login.html' ? 1 : 0))

      editorActions.setPages(pages)

      // Reset preview state for the new page map
      editorActions.setActivePage(initialPageId)
      editorActions.setActiveStoryId('default')
      editorActions.setSelectedNodeId(null)
      editorActions.setPreviewReady(false)

      try {
        const { quickStartDefaults, stylesCss } = await getThemeCssStructuredCached(resolvedThemeId)
        editorActions.setThemeQuickStartDefaults(quickStartDefaults)
        editorActions.setBaseCss(stylesCss)
        editorActions.setThemeData(resolvedThemeId, stylesCss)
      }
      catch {
        editorActions.setThemeQuickStartDefaults('')
        editorActions.setBaseCss('')
        editorActions.setThemeData(resolvedThemeId, '')
      }

      // Ensure built-in background/logo show up in the asset picker (and can be applied) even without uploads.
      try {
        const selectedTheme = themeConfig.themes.find(theme => theme.id === resolvedThemeId)
        const defaults = selectedTheme?.defaultAssets || []

        const managedDefaultPrefix = '__default__:'
        const preservedAssets = assetStore.getState().uploadedAssets.filter(
          asset => !asset.id.startsWith(managedDefaultPrefix),
        )
        if (defaults.length === 0) {
          editorActions.setUploadedAssets(preservedAssets)
          return
        }

        const hasExistingDefaultAsset = (category: UploadedAsset['category'], name: string) =>
          preservedAssets.some(asset =>
            asset.category === category && asset.name.toLowerCase() === name.toLowerCase(),
          )
        const rebuiltDefaultAssets: UploadedAsset[] = []
        const now = Date.now()

        for (const item of defaults) {
          if (hasExistingDefaultAsset(item.category, item.name)) {
            continue
          }

          const res = await fetch(themeResourcePath(resolvedThemeId, `resources/${item.path}`))
          if (!res.ok) {
            continue
          }

          const blob = await res.blob()
          const base64Data = await blobToBase64(blob)

          rebuiltDefaultAssets.push({
            id: `${managedDefaultPrefix}${resolvedThemeId}:${item.category}:${item.name}`,
            name: item.name,
            category: item.category,
            mimeType: blob.type || 'image/svg+xml',
            base64Data,
            size: blob.size,
            createdAt: now,
            isDefault: true,
          })
        }

        editorActions.setUploadedAssets([
          ...preservedAssets,
          ...rebuiltDefaultAssets,
        ])
      }
      catch {
        // Optional enhancement; ignore failures.
      }

      void editorActions.syncBackgroundForCurrentTheme()
    }

    void initialize()
  }, [initialPageId, pageMap, previewPagesReady, resolvedThemeId, themeConfig.themes])

  useEffect(() => {
    const method = isDarkMode ? 'add' : 'remove'
    document.documentElement.classList[method]('pf-v6-theme-dark')
    document.body.classList[method]('pf-v6-theme-dark')
  }, [isDarkMode])

  useEffect(() => {
    const handleThemeJarImported = (event: Event) => {
      void (async () => {
        const detail = (event as CustomEvent<ThemeImportData | undefined>).detail
        if (!detail) {
          return
        }

        const targetThemeId = resolveThemeIdFromConfig(themeConfig, detail.sourceThemeId || detail.themeName || selectedThemeId)
        const targetThemeStorageKey = targetThemeId
        const themeCssStructured = await getThemeCssStructuredCached(targetThemeId).catch(() => ({ quickStartDefaults: '', stylesCss: '' }))
        editorActions.setThemeQuickStartDefaults(themeCssStructured.quickStartDefaults)
        editorActions.setThemeData(targetThemeId, themeCssStructured.stylesCss)
        editorActions.applyImportedQuickSettingsForPreset(targetThemeStorageKey, detail.quickSettingsByMode)
        editorActions.setUploadedAssets(detail.uploadedAssets || [])
        editorActions.setAppliedAssets(detail.appliedAssets || {})
        const importedCss = sanitizeThemeCssSourceForEditor((detail.css || '').trim())
        editorActions.setStylesCss(importedCss)
      })()
    }

    window.addEventListener(THEME_JAR_IMPORTED_EVENT, handleThemeJarImported as EventListener)
    return () => {
      window.removeEventListener(THEME_JAR_IMPORTED_EVENT, handleThemeJarImported as EventListener)
    }
  }, [selectedThemeId, themeConfig])

  if (!previewPagesReady || !pageIds.length) {
    return loadingSpinner
  }

  return (
    <PreviewProvider
      key={variantId}
      initialVariantId={variantId}
    >
      <ErrorBoundary fallbackTitle="Preview Error">
        <div ref={layoutRef} className="flex h-full flex-col overflow-hidden lg:flex-row">
          <div className="gjs-column-m flex min-h-0 flex-1 flex-col">
            <ErrorBoundary fallbackTitle="Topbar Error">
              <Topbar className="min-h-[48px] flex-shrink-0" />
            </ErrorBoundary>
            <ErrorBoundary fallbackTitle="Context Bar Error">
              <ContextBar className="flex-shrink-0" />
            </ErrorBoundary>
            <ErrorBoundary fallbackTitle="Preview Error">
              <PreviewShell />
            </ErrorBoundary>
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize right sidebar"
            tabIndex={-1}
            className="group relative hidden w-2 flex-shrink-0 cursor-col-resize touch-none select-none lg:block"
            onPointerDown={handleSidebarResizeStart}
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--pf-t--global--border--color--default)] transition-colors group-hover:bg-[var(--pf-t--global--color--brand--default)]" />
          </div>
          <ErrorBoundary fallbackTitle="Sidebar Error">
            <div
              className="gjs-column-r h-[40vh] min-h-[200px] w-full min-w-0 lg:h-full lg:w-auto lg:flex-shrink-0"
              style={isDesktopLayout ? { width: `${rightSidebarWidth}px` } : undefined}
            >
              <RightSidebar className="h-full w-full min-w-0" />
            </div>
          </ErrorBoundary>
        </div>
      </ErrorBoundary>
    </PreviewProvider>
  )
}
