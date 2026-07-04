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
