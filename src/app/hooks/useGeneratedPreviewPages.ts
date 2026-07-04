import { useEffect, useState } from 'react'
import {
  connectLiveReload,
  ensureGeneratedPreviewPagesLoaded,
  getVariantPages,
  resolvePreviewVariantId,
} from '../../features/preview/load-generated'

export interface GeneratedPreviewPagesState {
  pageIds: string[]
  previewPagesError: string | null
  previewPagesReady: boolean
  previewPagesRevision: number
  variantId: string
}

export function useGeneratedPreviewPages(resolvedThemeId: string): GeneratedPreviewPagesState {
  const [previewPagesReady, setPreviewPagesReady] = useState(false)
  const [previewPagesRevision, setPreviewPagesRevision] = useState(0)
  const [previewPagesError, setPreviewPagesError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ensureGeneratedPreviewPagesLoaded()
      .then(() => {
        if (!cancelled) {
          setPreviewPagesError(null)
          setPreviewPagesReady(true)
          setPreviewPagesRevision(1)
          connectLiveReload(() => {
            setPreviewPagesError(null)
            setPreviewPagesReady(true)
            setPreviewPagesRevision(revision => revision + 1)
          })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Failed to load preview pages.'
          setPreviewPagesError(message)
          setPreviewPagesReady(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const variantId = resolvePreviewVariantId({ selectedThemeId: resolvedThemeId })
  const pageMap = previewPagesReady ? getVariantPages(variantId) : {}
  const pageIds = Object.keys(pageMap)

  return {
    pageIds,
    previewPagesError,
    previewPagesReady,
    previewPagesRevision,
    variantId,
  }
}
