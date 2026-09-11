import type { LayoutBinding, LayoutId } from './types'
import { use } from 'react'
import { layoutCssPath } from '../../../keycloak-theme/paths'
import { DEFAULT_LAYOUT_ID } from './types'

const LAYOUT_LABELS: Record<LayoutId, string> = {
  card: 'Card',
  horizontal: 'Horizontal',
  split: 'Split',
}

/** Guards against a stale/unrecognized id (e.g. persisted from a removed layout) reaching the cache. */
function resolveLayoutId(layoutId: LayoutId): LayoutId {
  return LAYOUT_LABELS[layoutId] ? layoutId : DEFAULT_LAYOUT_ID
}

export const LAYOUT_OPTIONS: { id: LayoutId, label: string }[] = (
  Object.keys(LAYOUT_LABELS) as LayoutId[]
).map(id => ({ id, label: LAYOUT_LABELS[id] }))

const cache = new Map<LayoutId, LayoutBinding>()
const inFlight = new Map<LayoutId, Promise<LayoutBinding>>()

async function fetchLayoutCss(layoutId: LayoutId): Promise<string> {
  try {
    const response = await fetch(layoutCssPath(layoutId))
    return response.ok ? await response.text() : ''
  }
  catch {
    return ''
  }
}

export async function getLayoutBinding(requestedLayoutId: LayoutId): Promise<LayoutBinding> {
  const layoutId = resolveLayoutId(requestedLayoutId)
  const cached = cache.get(layoutId)
  if (cached) {
    return cached
  }

  let promise = inFlight.get(layoutId)
  if (!promise) {
    promise = fetchLayoutCss(layoutId).then((css) => {
      const binding: LayoutBinding = { id: layoutId, label: LAYOUT_LABELS[layoutId], css }
      cache.set(layoutId, binding)
      inFlight.delete(layoutId)
      return binding
    })
    inFlight.set(layoutId, promise)
  }

  return promise
}

/** Warms the cache for every layout so preview rendering (a sync DOM pass) never blocks on a fetch. */
export async function preloadLayoutBindings(): Promise<LayoutBinding[]> {
  return Promise.all((Object.keys(LAYOUT_LABELS) as LayoutId[]).map(getLayoutBinding))
}

let preloadCache: LayoutBinding[] | null = null
let preloadPromise: Promise<LayoutBinding[]> | null = null

/**
 * Suspends (mirrors `useThemeConfig()`'s `use()` pattern) until every layout's CSS is cached,
 * so the preview's sync DOM-mutation pass can read `getCachedLayoutBinding()` without ever
 * hitting an empty/not-yet-loaded cache entry.
 */
export function useLayoutBindingsReady(): void {
  if (preloadCache) {
    return
  }
  if (!preloadPromise) {
    preloadPromise = preloadLayoutBindings().then((bindings) => {
      preloadCache = bindings
      return bindings
    })
  }
  use(preloadPromise)
}

/** Sync read for the preview's DOM-sync pass - call only after `useLayoutBindingsReady()`. */
export function getCachedLayoutBinding(requestedLayoutId: LayoutId): LayoutBinding {
  const layoutId = resolveLayoutId(requestedLayoutId)
  return cache.get(layoutId) ?? { id: layoutId, label: LAYOUT_LABELS[layoutId], css: '' }
}
