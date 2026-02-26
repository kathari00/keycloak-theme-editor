import type { ThemeCssStructured } from './preset-manager'
import type { BaseThemeId, EditorTheme, ThemeConfig, ThemeId } from './types'
import { use } from 'react'
import { loadThemeCssStructured, loadThemes } from './preset-manager'

const DEFAULT_THEME_ID: ThemeId = 'v2'
const DEFAULT_BASE_THEME_ID: BaseThemeId = 'v2'
const themeCssStructuredCache = new Map<ThemeId, ThemeCssStructured>()
const themeCssStructuredInFlight = new Map<ThemeId, Promise<ThemeCssStructured>>()
let themeConfigCache: ThemeConfig | null = null
let themeConfigPromise: Promise<ThemeConfig> | null = null

function normalizeThemeId(value: string | null | undefined): string {
  return (value || '').trim()
}

function findThemeById(config: ThemeConfig, themeId: string): EditorTheme | undefined {
  return config.themes.find(theme => theme.id === themeId)
}

function getDefaultTheme(config: ThemeConfig): EditorTheme | undefined {
  return findThemeById(config, DEFAULT_THEME_ID) ?? config.themes[0]
}

function resolveThemeFromConfig(
  config: ThemeConfig,
  value: string | null | undefined,
): EditorTheme | undefined {
  const normalizedThemeId = normalizeThemeId(value)
  if (normalizedThemeId) {
    const matchedTheme = findThemeById(config, normalizedThemeId)
    if (matchedTheme) {
      return matchedTheme
    }
  }
  return getDefaultTheme(config)
}

export function resolveThemeIdFromConfig(
  config: ThemeConfig,
  value: string | null | undefined,
): ThemeId {
  return resolveThemeFromConfig(config, value)?.id ?? DEFAULT_THEME_ID
}

export function resolveThemeBaseIdFromConfig(
  config: ThemeConfig,
  value: string | null | undefined,
): BaseThemeId {
  return resolveThemeFromConfig(config, value)?.baseId ?? DEFAULT_BASE_THEME_ID
}

export async function getThemeConfigCached(): Promise<ThemeConfig> {
  if (themeConfigCache) {
    return themeConfigCache
  }

  if (!themeConfigPromise) {
    themeConfigPromise = loadThemes().then((config) => {
      themeConfigCache = config
      return config
    })
  }

  return themeConfigPromise
}

async function getThemeValueCached<T>(params: {
  themeId: ThemeId
  cache: Map<ThemeId, T>
  inFlight: Map<ThemeId, Promise<T>>
  emptyValue: () => T
  load: () => Promise<T>
}): Promise<T> {
  const { themeId, cache, inFlight, emptyValue, load } = params

  if (!themeId) {
    return emptyValue()
  }

  const cachedValue = cache.get(themeId)
  if (cachedValue !== undefined) {
    return cachedValue
  }

  const pendingRequest = inFlight.get(themeId)
  if (pendingRequest) {
    return pendingRequest
  }

  const request = load()
    .then((value) => {
      cache.set(themeId, value)
      return value
    })
    .finally(() => {
      inFlight.delete(themeId)
    })

  inFlight.set(themeId, request)
  return request
}

export async function getThemeCssStructuredCached(themeId: ThemeId): Promise<ThemeCssStructured> {
  return getThemeValueCached({
    themeId,
    cache: themeCssStructuredCache,
    inFlight: themeCssStructuredInFlight,
    emptyValue: () => ({ quickStartDefaults: '', stylesCss: '' }),
    load: () => loadThemeCssStructured(themeId),
  })
}

export function useThemeConfig(): ThemeConfig {
  if (themeConfigCache) {
    return themeConfigCache
  }
  return use(getThemeConfigCached())
}
