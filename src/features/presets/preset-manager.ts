import type { ThemeConfig, ThemeId } from './types'
import { sanitizeThemeCssSourceForEditor, stripQuickStartImportLine } from '../editor/css-source-sanitizer'
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
    const response = await fetch('/keycloak-dev-resources/themes/themes.json')
    if (!response.ok) {
      throw new Error(`Failed to load themes.json: ${response.statusText}`)
    }
    return await response.json() as ThemeConfig
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
