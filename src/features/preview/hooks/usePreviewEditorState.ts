import { editorActions } from '../../editor/actions'
import { useEditorStore, usePreviewState } from '../../editor/hooks/use-editor'

export function usePreviewRuntimeState() {
  return usePreviewState()
}

export function usePreviewPages() {
  return useEditorStore()
}

export const previewRuntimeActions = {
  setActivePage: editorActions.setActivePage,
  setActiveStory: editorActions.setActiveStoryId,
  selectNode: editorActions.setSelectedNodeId,
  setPreviewReady: editorActions.setPreviewReady,
}
