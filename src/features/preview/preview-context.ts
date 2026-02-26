import type { RefObject } from 'react'
import type { PreviewContextValue } from './types'
import { createContext } from 'react'

export interface PreviewRuntimeValue extends PreviewContextValue {
  iframeRef: RefObject<HTMLIFrameElement | null>
  setPreviewReady: (ready: boolean) => void
}

export const PreviewContext = createContext<PreviewRuntimeValue | null>(null)
