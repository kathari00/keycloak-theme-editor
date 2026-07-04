import { useEffect } from 'react'
import { editorActions } from '../../features/editor/actions'
import { usePreviewState } from '../../features/editor/hooks/use-editor'
import { getVariantPages, getVariantStateOptions } from '../../features/preview/load-generated'

export function usePreviewPageSelection(params: {
  previewPagesReady: boolean
  previewPagesRevision: number
  variantId: string
}) {
  const { previewPagesReady, previewPagesRevision, variantId } = params
  const { activePageId, activeStateId } = usePreviewState()

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
}
