import type { PropsWithChildren, RefObject } from 'react'
import type { PreviewContextValue, PreviewVariantId } from './types'
import { createContext, useContext, useRef } from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { editorActions } from '../editor/actions'
import { coreStore } from '../editor/stores/core-store'

interface PreviewRuntimeValue extends PreviewContextValue {
  iframeRef: RefObject<HTMLIFrameElement | null>
  setPreviewReady: (ready: boolean) => void
}

const PreviewContext = createContext<PreviewRuntimeValue | null>(null)

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
  } = useStore(coreStore, useShallow(state => ({
    activePageId: state.activePageId,
    activeStoryId: state.activeStoryId,
    selectedNodeId: state.selectedNodeId,
    previewReady: state.previewReady,
  })))
  const activeVariantId: PreviewVariantId = initialVariantId

  const getDocument = () => iframeRef.current?.contentDocument ?? null

  const setActivePage = (pageId: string) => {
    editorActions.setActivePage(pageId)
    editorActions.setActiveStoryId('default')
    editorActions.setSelectedNodeId(null)
    editorActions.setPreviewReady(false)
  }

  const setActiveStory = (storyId: string) => {
    editorActions.setActiveStoryId(storyId)
    editorActions.setSelectedNodeId(null)
    editorActions.setPreviewReady(false)
  }

  const selectNode = (nodeId: string | null) => {
    editorActions.setSelectedNodeId(nodeId)
  }

  const setPreviewReady = (ready: boolean) => {
    editorActions.setPreviewReady(ready)
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
    <PreviewContext.Provider value={value}>
      {children}
    </PreviewContext.Provider>
  )
}

export function usePreviewContext(): PreviewContextValue {
  const value = useContext(PreviewContext)
  if (!value) {
    throw new Error('usePreviewContext must be used within PreviewProvider')
  }
  return value
}

export function usePreviewRuntime(): PreviewRuntimeValue {
  const value = useContext(PreviewContext)
  if (!value) {
    throw new Error('usePreviewRuntime must be used within PreviewProvider')
  }
  return value
}
