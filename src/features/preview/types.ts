export type PreviewVariantId = string

export type PreviewPageStates = Record<string, string>

export interface PreviewPageHtmlMap {
  generatedAt: string
  keycloakTag: string
  variants: Record<string, Record<string, PreviewPageStates>>
}

export interface PreviewContextValue {
  activeVariantId: PreviewVariantId
  activePageId: string
  activeStateId: string
  selectedNodeId: string | null
  previewReady: boolean
  getDocument: () => Document | null
  setActivePage: (pageId: string) => void
  setActiveState: (stateId: string) => void
  selectNode: (nodeId: string | null) => void
}
