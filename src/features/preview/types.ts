export type PreviewVariantId = string

export type PreviewPageStories = Record<string, string>

export interface PreviewPageHtmlMap {
  generatedAt: string
  keycloakTag: string
  variants: Record<string, Record<string, PreviewPageStories>>
}

export interface PreviewContextValue {
  activeVariantId: PreviewVariantId
  activePageId: string
  activeStoryId: string
  selectedNodeId: string | null
  previewReady: boolean
  getDocument: () => Document | null
  setActivePage: (pageId: string) => void
  setActiveStory: (storyId: string) => void
  selectNode: (nodeId: string | null) => void
}
