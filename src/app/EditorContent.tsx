import type { UploadedAsset } from '../features/assets/types'
import type { JarImportResult as ThemeImportData } from '../features/theme-export/types'
import {
  Alert,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelBody,
  DrawerPanelContent,
  Stack,
  StackItem,
} from '@patternfly/react-core'
import { useEffect, useRef, useState } from 'react'
import ContextBar from '../components/ContextBar'
import ErrorBoundary from '../components/ErrorBoundary'
import RightSidebar from '../components/RightSidebar'
import Topbar from '../components/Topbar'
import { editorActions } from '../features/editor/actions'
import { useDarkModeState, usePresetState, usePreviewState } from '../features/editor/hooks/use-editor'
import { singleFileMap } from '../features/editor/lib/css-files'
import { sanitizeThemeCssSourceForEditor } from '../features/editor/lib/css-source-sanitizer'
import { assetStore } from '../features/editor/stores/asset-store'
import { coreStore } from '../features/editor/stores/core-store'
import { getThemeCssStructuredCached, resolveThemeIdFromConfig, useThemeConfig } from '../features/presets/queries'
import { themeResourcePath } from '../features/presets/types'
import { PreviewProvider } from '../features/preview/components/PreviewProvider'
import { PreviewShell } from '../features/preview/components/PreviewShell'
import { connectLiveReload, ensureGeneratedPreviewPagesLoaded, getVariantPages, getVariantStateOptions, resolvePreviewVariantId } from '../features/preview/load-generated'
import { THEME_JAR_IMPORTED_EVENT } from '../features/theme-export/jar-import-service'
import LoadingScreen, { useLoadingIndicatorVisibility } from './LoadingScreen'

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
  const { activePageId, activeStateId } = usePreviewState()
  const themeConfig = useThemeConfig()
  const [previewPagesReady, setPreviewPagesReady] = useState(false)
  const [previewPagesRevision, setPreviewPagesRevision] = useState(0)
  const [previewPagesError, setPreviewPagesError] = useState<string | null>(null)
  const [initialBootstrapReady, setInitialBootstrapReady] = useState(false)
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const bootstrapRequestIdRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    ensureGeneratedPreviewPagesLoaded()
      .then(() => {
        if (!cancelled) {
          setPreviewPagesError(null)
          setPreviewPagesReady(true)
          setPreviewPagesRevision(1)
          connectLiveReload(() => {
            setPreviewPagesError(null)
            setPreviewPagesReady(true)
            setPreviewPagesRevision(revision => revision + 1)
          })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Failed to load preview pages.'
          setPreviewPagesError(message)
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
  const isLoading = !previewPagesError && (!previewPagesReady || !pageIds.length || !initialBootstrapReady)
  const showLoadingIndicator = useLoadingIndicatorVisibility(isLoading)

  useEffect(() => {
    if (!previewPagesReady) {
      return
    }

    const currentPageMap = getVariantPages(variantId)
    const currentPageIds = Object.keys(currentPageMap)
    const pageId = (() => {
      if (activePageId && currentPageMap[activePageId]) {
        return activePageId
      }

      if (currentPageMap['login.html']) {
        return 'login.html'
      }

      const firstRegularHtmlPage = currentPageIds.find(pageId => pageId.endsWith('.html') && pageId !== 'cli_splash.html')
      return firstRegularHtmlPage || currentPageIds[0] || 'login.html'
    })()
    const currentStates = getVariantStateOptions({ variantId, pageId })
    const stateId = pageId === activePageId && currentStates.some(state => state.id === activeStateId)
      ? activeStateId
      : currentStates.find(state => state.id === 'default')?.id
        ?? currentStates[0]?.id
        ?? 'default'

    const pages = Object.entries(currentPageMap).map(([id, component]) => ({
      id,
      name: id.replace('.html', '.ftl'),
      component,
    }))
    pages.sort((left, right) => (left.id === 'login.html' ? -1 : right.id === 'login.html' ? 1 : 0))

    editorActions.setPages(pages)
    editorActions.setActivePage(pageId)
    editorActions.setActiveStateId(stateId)
    editorActions.setSelectedNodeId(null)
  }, [activePageId, activeStateId, previewPagesReady, previewPagesRevision, variantId])

  useEffect(() => {
    let cancelled = false
    const requestId = bootstrapRequestIdRef.current + 1
    bootstrapRequestIdRef.current = requestId

    const isCurrentRequest = () => !cancelled && bootstrapRequestIdRef.current === requestId

    const initializeThemeData = async () => {
      try {
        const { quickStartDefaults, stylesCss, stylesCssFiles } = await getThemeCssStructuredCached(resolvedThemeId)
        if (!isCurrentRequest()) {
          return
        }

        editorActions.setThemeQuickStartDefaults(quickStartDefaults)
        editorActions.setBaseCss(stylesCss)
        editorActions.setThemeData(resolvedThemeId, stylesCss, stylesCssFiles)
        editorActions.applyThemeModeDefaults(coreStore.getState().isDarkMode ? 'dark' : 'light')
      }
      catch {
        if (!isCurrentRequest()) {
          return
        }

        editorActions.setThemeQuickStartDefaults('')
        editorActions.setBaseCss('')
        editorActions.setThemeData(resolvedThemeId, '')
      }

      if (!isCurrentRequest()) {
        return
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
          if (!isCurrentRequest()) {
            return
          }

          editorActions.setUploadedAssets(preservedAssets)
        }
        else {
          const hasExistingDefaultAsset = (category: UploadedAsset['category'], name: string) =>
            preservedAssets.some(asset =>
              asset.category === category && asset.name.toLowerCase() === name.toLowerCase(),
            )
          const rebuiltDefaultAssets: UploadedAsset[] = []
          const now = Date.now()

          for (const item of defaults) {
            if (!isCurrentRequest()) {
              return
            }

            if (hasExistingDefaultAsset(item.category, item.name)) {
              continue
            }

            const res = await fetch(themeResourcePath(resolvedThemeId, `resources/${item.path}`))
            if (!isCurrentRequest()) {
              return
            }
            if (!res.ok) {
              continue
            }

            const blob = await res.blob()
            if (!isCurrentRequest()) {
              return
            }

            const base64Data = await blobToBase64(blob)
            if (!isCurrentRequest()) {
              return
            }

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

          if (!isCurrentRequest()) {
            return
          }

          editorActions.setUploadedAssets([
            ...preservedAssets,
            ...rebuiltDefaultAssets,
          ])
        }
      }
      catch {
        if (!isCurrentRequest()) {
          return
        }
        // Optional enhancement; ignore failures.
      }

      if (!isCurrentRequest()) {
        return
      }

      await editorActions.syncBackgroundForCurrentTheme().catch(() => {})
      if (!isCurrentRequest()) {
        return
      }

      setInitialBootstrapReady(true)
    }

    void initializeThemeData()

    return () => {
      cancelled = true
    }
  }, [resolvedThemeId, themeConfig.themes])

  useEffect(() => {
    const method = isDarkMode ? 'add' : 'remove'
    document.documentElement.classList[method]('pf-v6-theme-dark')
    document.body.classList[method]('pf-v6-theme-dark')
  }, [isDarkMode])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleLayoutModeChange = (event: MediaQueryListEvent) => {
      setIsDesktopLayout(event.matches)
    }
    mediaQuery.addEventListener('change', handleLayoutModeChange)
    return () => {
      mediaQuery.removeEventListener('change', handleLayoutModeChange)
    }
  }, [])

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
          ? { 'css/quick-start.css': importedQuickStartCss, ...detail.stylesCssFiles }
          : { 'css/quick-start.css': importedQuickStartCss, ...singleFileMap(importedCss) }
        editorActions.setThemeQuickStartDefaults(importedQuickStartCss)
        editorActions.setThemeData(targetThemeId, importedCss, importedCssFiles)
        editorActions.applyThemeModeDefaults(isDarkMode ? 'dark' : 'light', importedQuickStartCss)
        editorActions.applyImportedQuickSettingsForPreset(detail.quickSettingsByMode)
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

  if (isLoading && !showLoadingIndicator) {
    return null
  }

  if (showLoadingIndicator) {
    return <LoadingScreen />
  }

  if (previewPagesError) {
    return (
      <div style={{ padding: 'var(--pf-t--global--spacer--md)' }}>
        <Alert
          isInline
          variant="danger"
          title="Preview pages unavailable"
        >
          {previewPagesError}
        </Alert>
      </div>
    )
  }

  return (
    <PreviewProvider
      key={variantId}
      initialVariantId={variantId}
    >
      <ErrorBoundary fallbackTitle="Preview Error">
        <Drawer
          isExpanded
          isInline
          isStatic={isDesktopLayout}
          position={isDesktopLayout ? 'end' : 'bottom'}
          style={{ height: '100%' }}
        >
          <DrawerContent
            panelContent={(
              <DrawerPanelContent
                colorVariant="secondary"
                defaultSize={isDesktopLayout ? '420px' : '33%'}
                minSize={isDesktopLayout ? '320px' : '200px'}
                maxSize={isDesktopLayout ? '640px' : '45%'}
                isResizable={isDesktopLayout}
                resizeAriaLabel="Resize editor tools panel"
                style={isDesktopLayout
                  ? undefined
                  : {
                      flexBasis: '18rem',
                      minHeight: '12rem',
                      maxHeight: '40vh',
                    }}
              >
                <DrawerPanelBody hasNoPadding style={{ minWidth: 0, minHeight: 0, height: '100%' }}>
                  <ErrorBoundary fallbackTitle="Sidebar Error">
                    <RightSidebar />
                  </ErrorBoundary>
                </DrawerPanelBody>
              </DrawerPanelContent>
            )}
          >
            <DrawerContentBody style={{ minWidth: 0, minHeight: 0, height: '100%', paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
              <Stack style={{ height: '100%', minWidth: 0, minHeight: 0 }}>
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
                <StackItem isFilled style={{ minWidth: 0, minHeight: 0 }}>
                  <ErrorBoundary fallbackTitle="Preview Error">
                    <PreviewShell />
                  </ErrorBoundary>
                </StackItem>
              </Stack>
            </DrawerContentBody>
          </DrawerContent>
        </Drawer>
      </ErrorBoundary>
    </PreviewProvider>
  )
}
