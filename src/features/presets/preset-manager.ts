import type { BaseThemeId, ThemeConfig, ThemeId } from './types'
import { sanitizeThemeCssSourceForEditor, stripQuickStartImportLine } from '../editor/css-source-sanitizer'
import { isBuiltinTheme } from './types'
import { getThemePreviewStylesPath, getThemeQuickStartCssPath } from './theme-paths'

export interface ThemeCssStructured {
  quickStartDefaults: string
  stylesCss: string
}

/**
 * Theme API helpers.
 * Caching is handled in `features/presets/queries.ts`.
 */

async function fetchCssFile(path: string): Promise<string> {
  try {
    const response = await fetch(path)
    if (!response.ok) {
      return ''
    }
    return (await response.text()).trim()
  }
  catch {
    return ''
  }
}

export async function loadThemes(): Promise<ThemeConfig> {
  try {
    const [themesResponse, pagesResponse] = await Promise.all([
      fetch('/keycloak-dev-resources/themes/themes.json'),
      fetch('/api/pages.json').catch(() => null),
    ])
    if (!themesResponse.ok) {
      throw new Error(`Failed to load themes.json: ${themesResponse.statusText}`)
    }
    const config = await themesResponse.json() as ThemeConfig
    // Discover user theme variants from pages.json and add them to the theme list
    if (pagesResponse?.ok) {
      const pages = await pagesResponse.json()
      const knownIds = new Set<string>(config.themes.map(t => t.id))
      for (const variantId of Object.keys(pages.variants ?? {})) {
        if (!knownIds.has(variantId)) {
          config.themes.push({
            id: variantId as ThemeId,
            name: variantId,
            description: 'Imported theme',
            baseId: (isBuiltinTheme(variantId) ? variantId : 'base') as BaseThemeId,
          })
        }
      }
    }
    return config
  }
  catch (error) {
    console.error('Error loading themes:', error)
    return { themes: [] }
  }
}

/**
 * Load theme CSS as two separate streams (quick-start defaults + styles).
 */
export async function loadThemeCssStructured(themeId: ThemeId): Promise<ThemeCssStructured> {
  try {
    const quickStartPath = getThemeQuickStartCssPath(themeId)
    const stylesPath = getThemePreviewStylesPath(themeId)

    const [rawQuickStart, rawStyles] = await Promise.all([
      fetchCssFile(quickStartPath),
      fetchCssFile(stylesPath),
    ])

    const quickStartDefaults = rawQuickStart
    // Strip @import "./quick-start.css" since we manage quick-start separately,
    // and sanitize visibility rules that may have been baked in from a previous export.
    const stylesCss = stripQuickStartImportLine(
      sanitizeThemeCssSourceForEditor(rawStyles),
    )

    return { quickStartDefaults, stylesCss }
  }
  catch (error) {
    console.error(`Error loading theme CSS for ${themeId}:`, error)
    return { quickStartDefaults: '', stylesCss: '' }
  }
}
