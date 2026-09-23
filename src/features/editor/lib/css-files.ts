import type { FrameworkId } from './framework-bindings/types'
import { THEME_QUICK_START_CSS_PATH, THEME_STYLES_CSS_PATH } from '../../keycloak-theme/paths'
import { FRAMEWORK_BINDINGS, getFrameworkBindingMetadata } from './framework-bindings/metadata'

export const QUICK_START_CSS_PATH = THEME_QUICK_START_CSS_PATH

export function frameworkCustomCssPath(frameworkId: string): string | undefined {
  return getFrameworkBindingMetadata(frameworkId as FrameworkId).customCssPath
}

export function isFrameworkCustomCssFile(path: string): boolean {
  return FRAMEWORK_BINDINGS.some(binding => binding.customCssPath === path)
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
