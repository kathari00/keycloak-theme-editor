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
import { useCallback, useRef, useState } from 'react'
import ContextBar from '../components/ContextBar'
import ErrorBoundary from '../components/ErrorBoundary'
import RightSidebar from '../components/RightSidebar'
import Topbar from '../components/Topbar'
import { useDarkModeState, usePresetState } from '../features/editor/hooks/use-editor'
import { resolveThemeIdFromConfig, useThemeConfig } from '../features/presets/queries'
import { PreviewProvider } from '../features/preview/components/PreviewProvider'
import { PreviewShell } from '../features/preview/components/PreviewShell'
import { useDesktopLayout } from './hooks/useDesktopLayout'
import { useDocumentDarkModeClass } from './hooks/useDocumentDarkModeClass'
import { useGeneratedPreviewPages } from './hooks/useGeneratedPreviewPages'
import { useInitialThemeBootstrap } from './hooks/useInitialThemeBootstrap'
import { usePreviewPageSelection } from './hooks/usePreviewPageSelection'
import { useThemeJarImportHandler } from './hooks/useThemeJarImportHandler'
import LoadingScreen, { useLoadingIndicatorVisibility } from './LoadingScreen'

function EditorHeader() {
  return (
    <>
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
    </>
  )
}

function EditorTools() {
  return (
    <ErrorBoundary fallbackTitle="Sidebar Error">
      <RightSidebar />
    </ErrorBoundary>
  )
}

function PreviewPane({ onHorizontalSwipe }: { onHorizontalSwipe?: () => void }) {
  return (
    <ErrorBoundary fallbackTitle="Preview Error">
      <PreviewShell onHorizontalSwipe={onHorizontalSwipe} />
    </ErrorBoundary>
  )
}

function MobileEditorLayout() {
  const mobilePagerRef = useRef<HTMLDivElement | null>(null)
  const [mobilePane, setMobilePane] = useState<'preview' | 'tools'>('preview')
  const showMobileTools = useCallback(() => {
    const pager = mobilePagerRef.current
    if (!pager)
      return
    setMobilePane('tools')
    pager.scrollTo({ left: pager.clientWidth })
  }, [])
  const showMobilePreview = useCallback(() => {
    const pager = mobilePagerRef.current
    if (!pager)
      return
    setMobilePane('preview')
    pager.scrollTo({ left: 0 })
  }, [])
  const toggleMobilePane = useCallback(() => {
    if (mobilePane === 'preview')
      showMobileTools()
    else
      showMobilePreview()
  }, [mobilePane, showMobilePreview, showMobileTools])
  const handleMobilePagerScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const pager = event.currentTarget
    setMobilePane(pager.scrollLeft >= pager.clientWidth / 2 ? 'tools' : 'preview')
  }, [])

  return (
    <Stack className="mobile-editor-layout">
      <StackItem>
        <ErrorBoundary fallbackTitle="Topbar Error">
          <Topbar
            mobilePane={mobilePane}
            onToggleMobilePane={toggleMobilePane}
          />
        </ErrorBoundary>
      </StackItem>
      <StackItem>
        <ErrorBoundary fallbackTitle="Context Bar Error">
          <ContextBar />
        </ErrorBoundary>
      </StackItem>
      <StackItem isFilled style={{ minWidth: 0, minHeight: 0 }}>
        <div
          id="mobile-editor-pager"
          ref={mobilePagerRef}
          className="mobile-editor-pager"
          data-testid="mobile-editor-pager"
          onScroll={handleMobilePagerScroll}
        >
          <section
            id="mobile-preview-pane"
            className="mobile-editor-page"
            aria-label="Theme preview"
            aria-hidden={mobilePane !== 'preview'}
            inert={mobilePane !== 'preview' ? true : undefined}
          >
            <PreviewPane onHorizontalSwipe={showMobileTools} />
          </section>
          <section
            id="mobile-tools-pane"
            className="mobile-editor-page mobile-editor-page--tools"
            aria-label="Editor tools"
            aria-hidden={mobilePane !== 'tools'}
            inert={mobilePane !== 'tools' ? true : undefined}
          >
            <EditorTools />
          </section>
        </div>
      </StackItem>
    </Stack>
  )
}

export default function EditorContent() {
  const { selectedThemeId } = usePresetState()
  const { isDarkMode } = useDarkModeState()
  const themeConfig = useThemeConfig()
  const resolvedThemeId = resolveThemeIdFromConfig(themeConfig, selectedThemeId)
  const {
    pageIds,
    previewPagesError,
    previewPagesReady,
    previewPagesRevision,
    variantId,
  } = useGeneratedPreviewPages(resolvedThemeId)
  const initialBootstrapReady = useInitialThemeBootstrap({ resolvedThemeId, themeConfig })
  const isDesktopLayout = useDesktopLayout()
  usePreviewPageSelection({ previewPagesReady, previewPagesRevision, variantId })
  useDocumentDarkModeClass(isDarkMode)
  useThemeJarImportHandler({ isDarkMode, selectedThemeId, themeConfig })
  const isLoading = !previewPagesError && (!previewPagesReady || !pageIds.length || !initialBootstrapReady)
  const showLoadingIndicator = useLoadingIndicatorVisibility(isLoading)

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
        {isDesktopLayout
          ? (
              <Drawer
                isExpanded
                isInline
                isStatic
                position="end"
                style={{ height: '100%' }}
              >
                <DrawerContent
                  panelContent={(
                    <DrawerPanelContent
                      colorVariant="secondary"
                      defaultSize="420px"
                      minSize="320px"
                      maxSize="640px"
                      isResizable
                      resizeAriaLabel="Resize editor tools panel"
                    >
                      <DrawerPanelBody hasNoPadding style={{ minWidth: 0, minHeight: 0, height: '100%' }}>
                        <EditorTools />
                      </DrawerPanelBody>
                    </DrawerPanelContent>
                  )}
                >
                  <DrawerContentBody style={{ minWidth: 0, minHeight: 0, height: '100%', paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
                    <Stack style={{ height: '100%', minWidth: 0, minHeight: 0 }}>
                      <EditorHeader />
                      <StackItem isFilled style={{ minWidth: 0, minHeight: 0 }}>
                        <PreviewPane />
                      </StackItem>
                    </Stack>
                  </DrawerContentBody>
                </DrawerContent>
              </Drawer>
            )
          : (
              <MobileEditorLayout />
            )}
      </ErrorBoundary>
    </PreviewProvider>
  )
}
