import type { ThemeId } from './types'
import { themeResourcePath } from './types'

export function getThemeQuickStartCssPath(themeId: ThemeId): string {
  return themeResourcePath(themeId, 'resources/css/quick-start.css')
}

export function getThemePreviewCssPath(themeId: ThemeId): string {
  return themeResourcePath(themeId, 'resources/css/preview.css')
}

export function getThemePreviewStylesPath(themeId: ThemeId): string {
  return themeResourcePath(themeId, 'resources/css/styles.css')
}
