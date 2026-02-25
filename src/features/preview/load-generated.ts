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

  previewPagesLoadPromise = import('./generated/pages.json')
    .then((module) => {
      const previewPages = module.default as PreviewPageHtmlMap
      applyPreviewPages(previewPages)
    })
    .finally(() => {
      previewPagesLoadPromise = null
    })

  return previewPagesLoadPromise
}

export function resolvePreviewVariantId(params: {
  selectedThemeId?: string | null
}): PreviewVariantId {
  const { selectedThemeId } = params
  const normalizedThemeId = (selectedThemeId || '').trim()
  if (normalizedThemeId && previewVariants[normalizedThemeId]) {
    return normalizedThemeId as PreviewVariantId
  }
  return 'v2'
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

  return orderedStoryIds.map((storyId) => ({
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
