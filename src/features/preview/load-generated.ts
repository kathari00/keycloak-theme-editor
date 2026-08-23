import type {
  PreviewPageHtmlMap,
  PreviewVariantId,
} from './types'
import { DEFAULT_LOCALE_TAG } from '../i18n/locale-catalog'
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

/**
 * Pre-rendered translations, emitted by `generate:preview -- --locales=...`.
 * Only the base language is bundled eagerly; the rest are fetched the first
 * time the user actually switches to them.
 */
const localePagesUrls: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('./generated/pages.*.json', {
      query: '?url',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  ).flatMap(([modulePath, url]) => {
    const tag = modulePath.match(/pages\.(.+)\.json$/)?.[1]
    return tag ? [[tag, url] as const] : []
  }),
)

const localeVariants: Record<string, PreviewVariantMap> = {}
const localeLoadPromises: Record<string, Promise<void>> = {}
const localeCacheOrder: string[] = []
const MAX_CACHED_LOCALES = 5

function rememberLoadedLocale(localeTag: string): void {
  const existingIndex = localeCacheOrder.indexOf(localeTag)
  if (existingIndex >= 0) {
    localeCacheOrder.splice(existingIndex, 1)
  }
  localeCacheOrder.push(localeTag)

  while (localeCacheOrder.length > MAX_CACHED_LOCALES) {
    const evictedTag = localeCacheOrder.shift()
    if (evictedTag) {
      delete localeVariants[evictedTag]
    }
  }
}

export function getAvailablePreviewLocaleTags(): string[] {
  return [DEFAULT_LOCALE_TAG, ...Object.keys(localePagesUrls)]
}

/**
 * Loads a language's pre-rendered pages. Missing languages resolve quietly:
 * the CLI's dev server only ever serves the base language, and a language can
 * be enabled for export before anyone has generated a preview for it.
 */
export async function ensureLocalePreviewPagesLoaded(localeTag: string): Promise<void> {
  if (localeTag === DEFAULT_LOCALE_TAG) {
    return
  }
  if (localeVariants[localeTag]) {
    rememberLoadedLocale(localeTag)
    return
  }

  const url = localePagesUrls[localeTag]
  if (!url) {
    return
  }

  localeLoadPromises[localeTag] ??= fetchPreviewPages(url)
    .then((previewPages) => {
      localeVariants[localeTag] = previewPages.variants || {}
      rememberLoadedLocale(localeTag)
    })
    .catch(() => {
      // Leave it unloaded; callers fall back to the base language.
    })
    .finally(() => {
      delete localeLoadPromises[localeTag]
    })

  return localeLoadPromises[localeTag]
}

function getVariantsForLocale(localeTag: string | undefined): PreviewVariantMap {
  if (!localeTag || localeTag === DEFAULT_LOCALE_TAG) {
    return previewVariants
  }
  return localeVariants[localeTag] ?? previewVariants
}

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
  if (sseConnected)
    return
  sseConnected = true
  fetch('/api/save-theme').then((r) => {
    if (!r.ok) {
      sseConnected = false
      return
    }
    const source = new EventSource('/api/events')
    const reload = () => reloadPreviewPages().then(onPagesUpdated).catch(() => {})
    source.onopen = reload
    source.addEventListener('pages-updated', reload)
    source.onerror = () => {
      source.close()
      sseConnected = false
    }
  }).catch(() => {
    sseConnected = false
  })
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

export function getVariantPages(
  variantId: PreviewVariantId,
  localeTag?: string,
): Record<string, string> {
  if (!localeTag || localeTag === DEFAULT_LOCALE_TAG) {
    return variantPagesCache[variantId] ?? EMPTY_PAGE_MAP
  }

  const variantPages = getVariantsForLocale(localeTag)[variantId]
  if (!variantPages) {
    return variantPagesCache[variantId] ?? EMPTY_PAGE_MAP
  }

  const pages: Record<string, string> = {}
  for (const [pageId, states] of Object.entries(variantPages)) {
    pages[pageId] = states.default
  }
  return pages
}

export function getVariantMessageUsagePages(params: {
  variantId: PreviewVariantId
  localeTag: string
  messageText: string
}): string[] {
  const { variantId, localeTag, messageText } = params
  const normalized = messageText.trim()
  if (!normalized) {
    return []
  }
  const escaped = normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  const needles = new Set([normalized, escaped])
  const pages = getVariantsForLocale(localeTag)[variantId] ?? {}

  return Object.entries(pages)
    .filter(([, states]) => Object.values(states).some(html => [...needles].some(needle => html.includes(needle))))
    .map(([pageId]) => pageId)
}

function getVariantPageStates(params: {
  variantId: PreviewVariantId
  pageId: string
  localeTag?: string
}): Record<string, string> {
  const { variantId, pageId, localeTag } = params
  return getVariantsForLocale(localeTag)[variantId]?.[pageId] ?? EMPTY_STATE_MAP
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
  localeTag?: string
}): string | null {
  const { variantId, pageId, stateId, localeTag } = params
  if (stateId === 'default') {
    return null
  }
  const pageStates = getVariantPageStates({ variantId, pageId, localeTag })
  return pageStates[stateId] ?? null
}
