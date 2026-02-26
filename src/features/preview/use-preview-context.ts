import type { PreviewRuntimeValue } from './preview-context'
import type { PreviewContextValue } from './types'
import { use } from 'react'
import { PreviewContext } from './preview-context'

export function usePreviewContext(): PreviewContextValue {
  const value = use(PreviewContext)
  if (!value) {
    throw new Error('usePreviewContext must be used within PreviewProvider')
  }
  return value
}

export function usePreviewRuntime(): PreviewRuntimeValue {
  const value = use(PreviewContext)
  if (!value) {
    throw new Error('usePreviewRuntime must be used within PreviewProvider')
  }
  return value
}
