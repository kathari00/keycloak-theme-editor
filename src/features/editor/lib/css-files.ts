export const QUICK_START_CSS_PATH = 'css/quick-start.css'

/** Check if a file path is the editor-managed quick-start.css. */
export function isQuickStartCssFile(filePath: string): boolean {
  return filePath === QUICK_START_CSS_PATH
}

/** Combine user CSS file contents (excluding quick-start.css) into a single string for preview. */
export function combineCssFiles(files: Record<string, string>): string {
  return Object.entries(files)
    .filter(([path]) => !isQuickStartCssFile(path))
    .map(([, css]) => css)
    .filter(Boolean)
    .join('\n\n')
}

/** Create a file map from combined user CSS (fallback when no structured files are available). */
export function singleFileMap(css: string): Record<string, string> {
  return css.trim() ? { 'css/styles.css': css } : {}
}

/** Get the first file path from a files map, or a default. */
export function firstFilePath(files: Record<string, string>): string {
  const paths = Object.keys(files)
  return paths[0] || 'css/styles.css'
}

/** Extract display name from a CSS file path (e.g. "css/styles.css" -> "styles.css"). */
export function cssFileDisplayName(filePath: string): string {
  const parts = filePath.split('/')
  return parts[parts.length - 1] || filePath
}
