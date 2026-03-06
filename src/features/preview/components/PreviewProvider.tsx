import type { PropsWithChildren } from 'react'
import type { PreviewRuntimeValue } from '../hooks/preview-context'
import type { PreviewVariantId } from '../types'
import { useRef } from 'react'
import { PreviewContext } from '../hooks/preview-context'
import { previewRuntimeActions, usePreviewRuntimeState } from '../hooks/usePreviewEditorState'

interface PreviewProviderProps {
  initialVariantId: PreviewVariantId
}

export function PreviewProvider({
  children,
  initialVariantId,
}: PropsWithChildren<PreviewProviderProps>) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const {
    activePageId,
    activeStoryId,
    selectedNodeId,
    previewReady,
  } = usePreviewRuntimeState()
  const activeVariantId: PreviewVariantId = initialVariantId

  const getDocument = () => iframeRef.current?.contentDocument ?? null

  const setActivePage = (pageId: string) => {
    previewRuntimeActions.setActivePage(pageId)
    previewRuntimeActions.setActiveStory('default')
    previewRuntimeActions.selectNode(null)
    previewRuntimeActions.setPreviewReady(false)
  }

  const setActiveStory = (storyId: string) => {
    previewRuntimeActions.setActiveStory(storyId)
    previewRuntimeActions.selectNode(null)
    previewRuntimeActions.setPreviewReady(false)
  }

  const selectNode = (nodeId: string | null) => {
    previewRuntimeActions.selectNode(nodeId)
  }

  const setPreviewReady = (ready: boolean) => {
    previewRuntimeActions.setPreviewReady(ready)
  }

  const value: PreviewRuntimeValue = {
    activeVariantId,
    activePageId,
    activeStoryId,
    selectedNodeId,
    previewReady,
    getDocument,
    setActivePage,
    setActiveStory,
    selectNode,
    iframeRef,
    setPreviewReady,
  }

  return (
    <PreviewContext value={value}>
      {children}
    </PreviewContext>
  )
}
