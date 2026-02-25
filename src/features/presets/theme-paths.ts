import type { ThemeId } from './types'

const THEME_ROOT = '/keycloak-dev-resources/themes'

function getThemeDirectory(themeId: ThemeId): string {
  return `${THEME_ROOT}/${themeId}`
}

function getThemeLoginDirectory(themeId: ThemeId): string {
  return `${getThemeDirectory(themeId)}/login`
}

function getThemeResourcesDirectory(themeId: ThemeId): string {
  return `${getThemeLoginDirectory(themeId)}/resources`
}

export function getThemeQuickStartCssPath(themeId: ThemeId): string {
  return `${getThemeResourcesDirectory(themeId)}/css/quick-start.css`
}

export function getThemePreviewCssPath(themeId: ThemeId): string {
  return `${getThemeResourcesDirectory(themeId)}/css/preview.css`
}

export function getThemePreviewStylesPath(themeId: ThemeId): string {
  return `${getThemeResourcesDirectory(themeId)}/css/styles.css`
}
