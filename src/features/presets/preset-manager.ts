import type { ThemeConfig, ThemeId } from './types'
import { sanitizeThemeCssSourceForEditor } from '../editor/lib/css-source-sanitizer'
import { readMessageProperty } from '../preview/lib/message-properties'
import { themeResourcePath } from './types'

export interface ThemeCssStructured {
  quickStartDefaults: string
  stylesCss: string
  stylesCssFiles: Record<string, string>
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

async function fetchThemeProperty(themeId: ThemeId, key: string): Promise<string | undefined> {
  try {
    const response = await fetch(themeResourcePath(themeId, 'theme.properties'))
    if (!response.ok) {
      return undefined
    }
    return readMessageProperty(await response.text(), key)
  }
  catch {
    return undefined
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
            id: variantId,
            name: variantId,
            description: 'Imported theme',
            defaultAssets: [],
            isImported: true,
          })
        }
      }
    }

    await Promise.all(config.themes.map(async (theme) => {
      theme.darkModeClasses = (await fetchThemeProperty(theme.id, 'kcDarkModeClass'))?.split(/\s+/).filter(Boolean) || ['kcDarkModeClass']
    }))

    return config
  }
  catch (error) {
    console.error('Error loading themes:', error)
    return { themes: [] }
  }
}

async function fetchThemeStylesPaths(themeId: ThemeId): Promise<string[]> {
  try {
    return ((await fetchThemeProperty(themeId, 'styles')) || '').split(/\s+/).filter(Boolean)
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

    // Build individual file map (quick-start.css always first)
    const stylesCssFiles: Record<string, string> = {
      'css/quick-start.css': rawQuickStart,
    }
    for (let i = 0; i < userStyleEntries.length; i++) {
      const css = sanitizeThemeCssSourceForEditor(rawUserStyles[i])
      if (css) {
        stylesCssFiles[userStyleEntries[i]] = css
      }
    }

    const stylesCss = rawUserStyles.filter(Boolean).map(css => sanitizeThemeCssSourceForEditor(css)).filter(Boolean).join('\n\n')

    return { quickStartDefaults, stylesCss, stylesCssFiles }
  }
  catch (error) {
    console.error(`Error loading theme CSS for ${themeId}:`, error)
    return { quickStartDefaults: '', stylesCss: '', stylesCssFiles: {} }
  }
}
