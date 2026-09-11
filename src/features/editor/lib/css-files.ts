import { THEME_QUICK_START_CSS_PATH, THEME_STYLES_CSS_PATH } from '../../keycloak-theme/paths'

export const QUICK_START_CSS_PATH = THEME_QUICK_START_CSS_PATH
export const BOOTSTRAP_CUSTOM_CSS_PATH = 'css/bootstrap-custom.css'
export const CARBON_CUSTOM_CSS_PATH = 'css/carbon-custom.css'

export function frameworkCustomCssPath(frameworkId: string): string | undefined {
  if (frameworkId === 'bootstrap')
    return BOOTSTRAP_CUSTOM_CSS_PATH
  if (frameworkId === 'carbon')
    return CARBON_CUSTOM_CSS_PATH
}

export function isFrameworkCustomCssFile(path: string): boolean {
  return path === BOOTSTRAP_CUSTOM_CSS_PATH || path === CARBON_CUSTOM_CSS_PATH
}

/** Check if a file path is the editor-managed quick-start.css. */
export function isQuickStartCssFile(filePath: string): boolean {
  return filePath === QUICK_START_CSS_PATH
}

/** Combine user CSS file contents (excluding quick-start.css) into a single string for preview. */
export function combineCssFiles(files: Record<string, string>): string {
  return Object.entries(files)
    .filter(([path]) => !isQuickStartCssFile(path) && !isFrameworkCustomCssFile(path))
    .map(([, css]) => css)
    .filter(Boolean)
    .join('\n\n')
}

/** Create a file map from combined user CSS (fallback when no structured files are available). */
export function singleFileMap(css: string): Record<string, string> {
  return css.trim() ? { [THEME_STYLES_CSS_PATH]: css } : {}
}

/** Get the first file path from a files map, or a default. */
export function firstFilePath(files: Record<string, string>): string {
  const paths = Object.keys(files)
  return paths[0] || THEME_STYLES_CSS_PATH
}

/** Extract display name from a CSS file path (e.g. "css/styles.css" -> "styles.css"). */
export function cssFileDisplayName(filePath: string): string {
  const parts = filePath.split('/')
  return parts[parts.length - 1] || filePath
}
