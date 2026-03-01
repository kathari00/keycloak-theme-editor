import type {
  PreviewPageHtmlMap,
  PreviewVariantId,
} from './types'

interface PreviewScenarioOption {
  id: string
  name: string
}

type PreviewVariantMap = PreviewPageHtmlMap['variants']

const EMPTY_PAGE_MAP: Record<string, string> = {}
const EMPTY_SCENARIO_MAP: Record<string, string> = {}
let previewVariants: PreviewVariantMap = {}
let variantPagesCache: Record<string, Record<string, string>> = {}
let previewPagesLoadPromise: Promise<void> | null = null

function buildVariantPagesCache(variants: PreviewVariantMap): Record<string, Record<string, string>> {
  return Object.fromEntries(Object.entries(variants).map(([variantId, variantPages]) => {
    const pages: Record<string, string> = {}
    for (const [pageId, stories] of Object.entries(variantPages)) {
      pages[pageId] = stories.default
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

  previewPagesLoadPromise = fetch('/api/pages.json')
    .then((res) => {
      if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`Failed to load pages.json: ${res.status}`)
      }
      return res.json()
    })
    .then((previewPages: PreviewPageHtmlMap) => {
      applyPreviewPages(previewPages)
    })
    .catch(() => {
      // CLI serves /api/pages.json; during Vite dev, fall back to the generated file
      return import('./generated/pages.json').then((mod) => {
        applyPreviewPages(mod.default as PreviewPageHtmlMap)
      })
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
  source.addEventListener('pages-updated', () => {
    reloadPreviewPages().then(onPagesUpdated).catch(() => {})
  })
  source.onerror = () => {
    // SSE not available (e.g. Vite dev server) — silently ignore
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
  // Fall back to first available variant instead of hardcoded 'v2'
  const availableVariants = Object.keys(previewVariants)
  if (availableVariants.includes('v2')) {
    return 'v2'
  }
  return (availableVariants[0] ?? 'v2') as PreviewVariantId
}

export function getVariantPages(variantId: PreviewVariantId): Record<string, string> {
  return variantPagesCache[variantId] ?? EMPTY_PAGE_MAP
}

function getVariantPageScenarios(params: {
  variantId: PreviewVariantId
  pageId: string
}): Record<string, string> {
  const { variantId, pageId } = params
  return previewVariants[variantId]?.[pageId] ?? EMPTY_SCENARIO_MAP
}

function formatScenarioName(storyId: string): string {
  if (storyId === 'default') {
    return 'Default'
  }
  return storyId
    .split(/[-_]+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

export function getVariantScenarioOptions(params: {
  variantId: PreviewVariantId
  pageId: string
}): PreviewScenarioOption[] {
  const { variantId, pageId } = params
  const storyIds = Object.keys(getVariantPageScenarios({ variantId, pageId }))
  if (storyIds.length === 0) {
    return []
  }

  const orderedStoryIds = storyIds.includes('default')
    ? ['default', ...storyIds.filter(storyId => storyId !== 'default')]
    : storyIds

  return orderedStoryIds.map(storyId => ({
    id: storyId,
    name: formatScenarioName(storyId),
  }))
}

export function resolveScenarioHtml(params: {
  variantId: PreviewVariantId
  pageId: string
  storyId: string
}): string | null {
  const { variantId, pageId, storyId } = params
  if (storyId === 'default') {
    return null
  }
  const pageStories = getVariantPageScenarios({ variantId, pageId })
  return pageStories[storyId] ?? null
}
