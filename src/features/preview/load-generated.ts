import type {
  PreviewPageHtmlMap,
  PreviewVariantId,
} from './types'
import generatedPagesUrl from './generated/pages.json?url'

interface PreviewStateOption {
  id: string
  name: string
}

type PreviewVariantMap = PreviewPageHtmlMap['variants']

const EMPTY_PAGE_MAP: Record<string, string> = {}
const EMPTY_STATE_MAP: Record<string, string> = {}
let previewVariants: PreviewVariantMap = {}
let variantPagesCache: Record<string, Record<string, string>> = {}
let previewPagesLoadPromise: Promise<void> | null = null

async function fetchPreviewPages(url: string): Promise<PreviewPageHtmlMap> {
  const res = await fetch(url)
  if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`Failed to load pages.json: ${res.status}`)
  }
  return await res.json() as PreviewPageHtmlMap
}

function buildVariantPagesCache(variants: PreviewVariantMap): Record<string, Record<string, string>> {
  return Object.fromEntries(Object.entries(variants).map(([variantId, variantPages]) => {
    const pages: Record<string, string> = {}
    for (const [pageId, states] of Object.entries(variantPages)) {
      pages[pageId] = states.default
    }
    return [variantId, pages]
  }))
}

function applyPreviewPages(previewPages: PreviewPageHtmlMap) {
  previewVariants = previewPages.variants || {}
  variantPagesCache = buildVariantPagesCache(previewVariants)
}

export async function ensureGeneratedPreviewPagesLoaded(): Promise<void> {
  if (Object.keys(previewVariants).length > 0) {
    return
  }
  if (previewPagesLoadPromise) {
    return previewPagesLoadPromise
  }

  previewPagesLoadPromise = fetchPreviewPages(generatedPagesUrl)
    .then((previewPages) => {
      applyPreviewPages(previewPages)
    })
    .finally(() => {
      previewPagesLoadPromise = null
    })

  return previewPagesLoadPromise
}

export async function reloadPreviewPages(): Promise<void> {
  const res = await fetch('/api/pages.json')
  if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
    return
  }
  const previewPages = await res.json() as PreviewPageHtmlMap
  applyPreviewPages(previewPages)
}

let sseConnected = false

export function connectLiveReload(onPagesUpdated: () => void): void {
  if (sseConnected) {
    return
  }
  sseConnected = true

  const source = new EventSource('/api/events')
  source.onopen = () => {
    reloadPreviewPages().then(onPagesUpdated).catch(() => {})
  }
  source.addEventListener('pages-updated', () => {
    reloadPreviewPages().then(onPagesUpdated).catch(() => {})
  })
  source.onerror = () => {
    source.close()
    sseConnected = false
  }
}

export function resolvePreviewVariantId(params: {
  selectedThemeId?: string | null
}): PreviewVariantId {
  const { selectedThemeId } = params
  const normalizedThemeId = (selectedThemeId || '').trim()
  if (normalizedThemeId && previewVariants[normalizedThemeId]) {
    return normalizedThemeId as PreviewVariantId
  }
  const availableVariants = Object.keys(previewVariants)
  return (availableVariants[0] ?? 'v2') as PreviewVariantId
}

export function getVariantPages(variantId: PreviewVariantId): Record<string, string> {
  return variantPagesCache[variantId] ?? EMPTY_PAGE_MAP
}

function getVariantPageStates(params: {
  variantId: PreviewVariantId
  pageId: string
}): Record<string, string> {
  const { variantId, pageId } = params
  return previewVariants[variantId]?.[pageId] ?? EMPTY_STATE_MAP
}

function formatStateName(stateId: string): string {
  if (stateId === 'default') {
    return 'Default'
  }
  return stateId
    .split(/[-_]+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

export function getVariantStateOptions(params: {
  variantId: PreviewVariantId
  pageId: string
}): PreviewStateOption[] {
  const { variantId, pageId } = params
  const stateIds = Object.keys(getVariantPageStates({ variantId, pageId }))
  if (stateIds.length === 0) {
    return []
  }

  const orderedStateIds = stateIds.includes('default')
    ? ['default', ...stateIds.filter(stateId => stateId !== 'default')]
    : stateIds

  return orderedStateIds.map(stateId => ({
    id: stateId,
    name: formatStateName(stateId),
  }))
}

export function resolveStateHtml(params: {
  variantId: PreviewVariantId
  pageId: string
  stateId: string
}): string | null {
  const { variantId, pageId, stateId } = params
  if (stateId === 'default') {
    return null
  }
  const pageStates = getVariantPageStates({ variantId, pageId })
  return pageStates[stateId] ?? null
}
