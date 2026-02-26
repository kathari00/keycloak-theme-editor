import type { ThemeId } from '../features/presets/types'
import type { JarImportResult as ThemeImportData } from '../features/theme-export/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import ContextBar from '../components/ContextBar'
import ErrorBoundary from '../components/ErrorBoundary'
import RightSidebar from '../components/RightSidebar'
import Topbar from '../components/Topbar'
import { editorActions } from '../features/editor/actions'
import { sanitizeThemeCssSourceForEditor, stripQuickStartImportLine } from '../features/editor/css-source-sanitizer'
import { assetStore } from '../features/editor/stores/asset-store'
import { useDarkModeState, usePresetState, usePreviewState } from '../features/editor/use-editor'
import { getThemeCssStructuredCached, resolveThemeBaseIdFromConfig, resolveThemeIdFromConfig, useThemeConfig } from '../features/presets/queries'
import { ensureGeneratedPreviewPagesLoaded, getVariantPages, resolvePreviewVariantId } from '../features/preview/load-generated'
import { PreviewProvider } from '../features/preview/PreviewProvider'
import { PreviewShell } from '../features/preview/PreviewShell'
import '@patternfly/react-core/dist/styles/base.css'

function resolveThemeIdFromThemeProperties(propertiesText: string | undefined): ThemeId {
  if (!propertiesText) {
    return 'v2'
  }
  const parentMatch = propertiesText.match(/^\s*parent\s*=\s*([^\r\n#]+)/im)
  const parent = parentMatch?.[1]?.trim().toLowerCase() || ''
  if (!parent) {
    return 'v2'
  }
  return parent.includes('v2') ? 'v2' : 'base'
}

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

const RIGHT_SIDEBAR_DEFAULT_WIDTH = 450
const RIGHT_SIDEBAR_MIN_WIDTH = 320
const EDITOR_MAIN_MIN_WIDTH = 420

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

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
  const [isDesktopLayout, setIsDesktopLayout] = useState(false)
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const rightSidebarRef = useRef<HTMLDivElement | null>(null)
  const rightSidebarWidthRef = useRef(RIGHT_SIDEBAR_DEFAULT_WIDTH)
  const sidebarResizeRef = useRef<{ startX: number, startWidth: number, maxWidth: number } | null>(null)
  const sidebarResizeControllerRef = useRef<AbortController | null>(null)
  const resizeRafRef = useRef<number | null>(null)
  const pendingPointerXRef = useRef<number | null>(null)

  const getMaxRightSidebarWidth = useCallback(() => {
    const layoutWidth = layoutRef.current?.getBoundingClientRect().width ?? window.innerWidth
    return Math.max(RIGHT_SIDEBAR_MIN_WIDTH, layoutWidth - EDITOR_MAIN_MIN_WIDTH)
  }, [])

  const removeSidebarResizeListeners = useCallback(() => {
    sidebarResizeControllerRef.current?.abort()
    sidebarResizeControllerRef.current = null
  }, [])

  const applyRightSidebarWidth = useCallback((nextWidth: number) => {
    rightSidebarWidthRef.current = nextWidth
    if (rightSidebarRef.current) {
      rightSidebarRef.current.style.width = `${nextWidth}px`
    }
  }, [])

  const stopSidebarResize = useCallback(() => {
    removeSidebarResizeListeners()
    if (resizeRafRef.current !== null) {
      cancelAnimationFrame(resizeRafRef.current)
      resizeRafRef.current = null
    }
    pendingPointerXRef.current = null
    sidebarResizeRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [removeSidebarResizeListeners])

  const applySidebarWidthFromPointerX = useCallback((clientX: number) => {
    const resizeState = sidebarResizeRef.current
    if (!resizeState) {
      return
    }

    const deltaX = resizeState.startX - clientX
    const nextWidth = clamp(
      resizeState.startWidth + deltaX,
      RIGHT_SIDEBAR_MIN_WIDTH,
      resizeState.maxWidth,
    )
    applyRightSidebarWidth(nextWidth)
  }, [applyRightSidebarWidth])

  const handleSidebarResizeMove = useCallback((event: PointerEvent) => {
    if (!sidebarResizeRef.current) {
      return
    }

    pendingPointerXRef.current = event.clientX
    if (resizeRafRef.current !== null) {
      return
    }

    resizeRafRef.current = requestAnimationFrame(() => {
      resizeRafRef.current = null
      const pointerX = pendingPointerXRef.current
      if (pointerX !== null) {
        applySidebarWidthFromPointerX(pointerX)
      }
    })
  }, [applySidebarWidthFromPointerX])

  const handleSidebarResizeEnd = useCallback(() => {
    const pointerX = pendingPointerXRef.current
    if (pointerX !== null) {
      applySidebarWidthFromPointerX(pointerX)
    }
    stopSidebarResize()
    applyRightSidebarWidth(rightSidebarWidthRef.current)
  }, [applyRightSidebarWidth, applySidebarWidthFromPointerX, stopSidebarResize])

  const handleSidebarResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDesktopLayout || event.button !== 0) {
      return
    }

    event.preventDefault()
    removeSidebarResizeListeners()
    const maxWidth = getMaxRightSidebarWidth()
    sidebarResizeRef.current = {
      startX: event.clientX,
      startWidth: rightSidebarWidthRef.current,
      maxWidth,
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const resizeController = new AbortController()
    sidebarResizeControllerRef.current = resizeController
    window.addEventListener('pointermove', handleSidebarResizeMove, { signal: resizeController.signal })
    window.addEventListener('pointerup', handleSidebarResizeEnd, { signal: resizeController.signal })
    window.addEventListener('pointercancel', handleSidebarResizeEnd, { signal: resizeController.signal })
  }, [getMaxRightSidebarWidth, handleSidebarResizeEnd, handleSidebarResizeMove, isDesktopLayout, removeSidebarResizeListeners])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const applyLayoutMode = () => setIsDesktopLayout(mediaQuery.matches)
    applyLayoutMode()
    mediaQuery.addEventListener('change', applyLayoutMode)
    return () => {
      mediaQuery.removeEventListener('change', applyLayoutMode)
    }
  }, [])

  useEffect(() => {
    if (!isDesktopLayout) {
      stopSidebarResize()
      if (rightSidebarRef.current) {
        rightSidebarRef.current.style.width = ''
      }
      return
    }

    const clampSidebarWidth = () => {
      const maxWidth = getMaxRightSidebarWidth()
      applyRightSidebarWidth(clamp(rightSidebarWidthRef.current, RIGHT_SIDEBAR_MIN_WIDTH, maxWidth))
    }

    clampSidebarWidth()
    window.addEventListener('resize', clampSidebarWidth)
    return () => {
      window.removeEventListener('resize', clampSidebarWidth)
    }
  }, [applyRightSidebarWidth, getMaxRightSidebarWidth, isDesktopLayout, stopSidebarResize])

  useEffect(() => {
    return () => {
      stopSidebarResize()
    }
  }, [stopSidebarResize])

  useEffect(() => {
    let cancelled = false

    ensureGeneratedPreviewPagesLoaded()
      .then(() => {
        if (!cancelled) {
          setPreviewPagesReady(true)
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
  const baseId = resolveThemeBaseIdFromConfig(themeConfig, selectedThemeId)

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
        const basePath = '/keycloak-dev-resources/themes/v2/login/resources'
        const defaults = [
          {
            id: '__default__:background',
            url: `${basePath}/img/keycloak-bg-darken.svg`,
            name: 'keycloak-bg-darken.svg',
            category: 'background' as const,
          },
          {
            id: '__default__:logo',
            url: `${basePath}/img/keycloak-logo-text.svg`,
            name: 'keycloak-logo-text.svg',
            category: 'logo' as const,
          },
        ]

        const managedDefaultPrefix = '__default__:'
        const preservedAssets = assetStore.getState().uploadedAssets.filter(
          asset => !asset.id.startsWith(managedDefaultPrefix),
        )
        if (baseId !== 'v2') {
          editorActions.setUploadedAssets(preservedAssets)
          return
        }

        const hasExistingDefaultAsset = (category: 'background' | 'logo', name: string) =>
          preservedAssets.some(asset =>
            asset.category === category && asset.name.toLowerCase() === name.toLowerCase(),
          )
        const rebuiltDefaultAssets: typeof preservedAssets = []
        const now = Date.now()

        for (const item of defaults) {
          if (hasExistingDefaultAsset(item.category, item.name)) {
            continue
          }

          const res = await fetch(item.url)
          if (!res.ok) {
            continue
          }

          const blob = await res.blob()
          const base64Data = await blobToBase64(blob)

          rebuiltDefaultAssets.push({
            id: item.id,
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
  }, [baseId, initialPageId, pageMap, previewPagesReady, resolvedThemeId])

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

        const fallbackThemeId = resolveThemeIdFromThemeProperties(detail.properties)
        const targetThemeId = resolveThemeIdFromConfig(themeConfig, detail.themeId || fallbackThemeId)
        const targetThemeStorageKey = targetThemeId
        const themeCssStructured = await getThemeCssStructuredCached(targetThemeId).catch(() => ({ quickStartDefaults: '', stylesCss: '' }))
        editorActions.setThemeQuickStartDefaults(themeCssStructured.quickStartDefaults)
        editorActions.setThemeData(targetThemeId, themeCssStructured.stylesCss)
        editorActions.applyImportedQuickSettingsForPreset(targetThemeStorageKey, detail.quickSettingsByMode)
        editorActions.setUploadedAssets(detail.uploadedAssets || [])
        editorActions.setAppliedAssets(detail.appliedAssets || {})
        // Import CSS: strip quick-start import lines and sanitize visibility rules
        const importedCss = stripQuickStartImportLine(
          sanitizeThemeCssSourceForEditor((detail.css || '').trim()),
        )
        editorActions.setStylesCss(importedCss)
      })()
    }

    window.addEventListener('themeJarImported', handleThemeJarImported as EventListener)
    return () => {
      window.removeEventListener('themeJarImported', handleThemeJarImported as EventListener)
    }
  }, [themeConfig])

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
            className="relative hidden w-2 flex-shrink-0 cursor-col-resize touch-none lg:block"
            onPointerDown={handleSidebarResizeStart}
          >
            <div
              className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
              style={{ backgroundColor: 'var(--pf-t--global--border--color--default)' }}
            />
          </div>
          <ErrorBoundary fallbackTitle="Sidebar Error">
            <div
              ref={rightSidebarRef}
              className="gjs-column-r h-[40vh] min-h-[200px] w-full min-w-0 lg:h-full lg:w-auto lg:flex-shrink-0"
            >
              <RightSidebar className="h-full w-full min-w-0" />
            </div>
          </ErrorBoundary>
        </div>
      </ErrorBoundary>
    </PreviewProvider>
  )
}
