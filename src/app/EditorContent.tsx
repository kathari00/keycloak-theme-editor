import type { UploadedAsset } from '../features/assets/types'
import type { JarImportResult as ThemeImportData } from '../features/theme-export/types'
import { Bullseye, Flex, FlexItem, Stack, StackItem } from '@patternfly/react-core'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { PreviewProvider } from '../features/preview/components/PreviewProvider'
import { PreviewShell } from '../features/preview/components/PreviewShell'
import { connectLiveReload, ensureGeneratedPreviewPagesLoaded, getVariantPages, resolvePreviewVariantId } from '../features/preview/load-generated'
import { THEME_JAR_IMPORTED_EVENT } from '../features/theme-export/jar-import-service'
import { useResizableSidebar } from './hooks/useResizableSidebar'
import '@patternfly/react-core/dist/styles/base.css'

const loadingSpinner = (
  <Bullseye style={{ height: '100vh', backgroundColor: 'var(--pf-t--global--background--color--primary--default)' }}>
    <div className="pf-v6-c-spinner pf-m-xl" role="progressbar" aria-label="Loading...">
      <span className="pf-v6-c-spinner__clipper"></span>
      <span className="pf-v6-c-spinner__lead-ball"></span>
      <span className="pf-v6-c-spinner__tail-ball"></span>
    </div>
  </Bullseye>
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
  const pageMap = useMemo(
    () => (previewPagesReady ? getVariantPages(variantId) : {}),
    [previewPagesReady, variantId],
  )
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
        <div ref={layoutRef} style={{ height: '100%', overflow: 'hidden' }}>
          <Flex
            direction={{ default: isDesktopLayout ? 'row' : 'column' }}
            alignItems={{ default: 'alignItemsStretch' }}
            style={{ height: '100%', overflow: 'hidden' }}
          >
            <FlexItem flex={{ default: 'flex_1' }} style={{ minWidth: 0, minHeight: 0 }}>
              <Stack style={{ height: '100%', minHeight: 0 }}>
                <StackItem>
                  <ErrorBoundary fallbackTitle="Topbar Error">
                    <Topbar />
                  </ErrorBoundary>
                </StackItem>
                <StackItem>
                  <ErrorBoundary fallbackTitle="Context Bar Error">
                    <ContextBar />
                  </ErrorBoundary>
                </StackItem>
                <StackItem isFilled style={{ minHeight: 0 }}>
                  <ErrorBoundary fallbackTitle="Preview Error">
                    <PreviewShell />
                  </ErrorBoundary>
                </StackItem>
              </Stack>
            </FlexItem>
            {isDesktopLayout && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize right sidebar"
                tabIndex={-1}
                className="editor-resize-handle"
                onPointerDown={handleSidebarResizeStart}
              >
                <div className="editor-resize-handle__line" />
              </div>
            )}
            <FlexItem
              className="gjs-column-r"
              style={{
                width: isDesktopLayout ? `${rightSidebarWidth}px` : '100%',
                minWidth: 0,
                minHeight: '200px',
                height: isDesktopLayout ? '100%' : '40vh',
                flexShrink: 0,
              }}
            >
              <ErrorBoundary fallbackTitle="Sidebar Error">
                <RightSidebar />
              </ErrorBoundary>
            </FlexItem>
          </Flex>
        </div>
      </ErrorBoundary>
    </PreviewProvider>
  )
}
