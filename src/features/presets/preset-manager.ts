import type { BaseThemeId, ThemeConfig, ThemeId } from './types'
import { sanitizeThemeCssSourceForEditor, stripQuickStartImportLine } from '../editor/css-source-sanitizer'
import { isBuiltinTheme, themeResourcePath } from './types'

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
    if (pagesResponse?.ok && pagesResponse.headers.get('content-type')?.includes('application/json')) {
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

async function fetchThemeStylesPaths(themeId: ThemeId): Promise<string[]> {
  try {
    const propsUrl = themeResourcePath(themeId, 'theme.properties')
    const response = await fetch(propsUrl)
    if (!response.ok) {
      return []
    }
    const text = await response.text()
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (line.startsWith('#') || !line)
        continue
      const eqIndex = line.indexOf('=')
      if (eqIndex <= 0)
        continue
      const key = line.slice(0, eqIndex).trim()
      if (key === 'styles') {
        return line.slice(eqIndex + 1).trim().split(/\s+/).filter(Boolean)
      }
    }
    return []
  }
  catch {
    return []
  }
}

/**
 * Load theme CSS as two separate streams (quick-start defaults + styles).
 * Discovers CSS file paths from the `styles=` property in theme.properties
 * so that user-provided CSS files (e.g. `styles=css/login.css`) are loaded.
 */
export async function loadThemeCssStructured(themeId: ThemeId): Promise<ThemeCssStructured> {
  try {
    const stylePaths = await fetchThemeStylesPaths(themeId)

    // Separate quick-start.css (editor-managed) from user styles
    const quickStartEntry = stylePaths.find(p => p === 'css/quick-start.css')
    const userStyleEntries = stylePaths.filter(p => p !== 'css/quick-start.css')

    const quickStartPromise = quickStartEntry
      ? fetchCssFile(themeResourcePath(themeId, `resources/${quickStartEntry}`))
      : Promise.resolve('')
    const userStylePromises = userStyleEntries.map(entry =>
      fetchCssFile(themeResourcePath(themeId, `resources/${entry}`)),
    )

    const [rawQuickStart, ...rawUserStyles] = await Promise.all([
      quickStartPromise,
      ...userStylePromises,
    ])

    const quickStartDefaults = rawQuickStart
    const combinedStyles = rawUserStyles.filter(Boolean).join('\n\n')
    // Strip @import "./quick-start.css" since we manage quick-start separately,
    // and sanitize visibility rules that may have been baked in from a previous export.
    const stylesCss = stripQuickStartImportLine(
      sanitizeThemeCssSourceForEditor(combinedStyles),
    )

    return { quickStartDefaults, stylesCss }
  }
  catch (error) {
    console.error(`Error loading theme CSS for ${themeId}:`, error)
    return { quickStartDefaults: '', stylesCss: '' }
  }
}
