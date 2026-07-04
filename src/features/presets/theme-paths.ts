import type { ThemeId } from './types'
import {
  THEME_PREVIEW_CSS_PATH,
  THEME_QUICK_START_CSS_PATH,
  THEME_STYLES_CSS_PATH,
  themeLoginResourcePath,
} from '../keycloak-theme/paths'

export function getThemeQuickStartCssPath(themeId: ThemeId): string {
  return themeLoginResourcePath(themeId, THEME_QUICK_START_CSS_PATH)
}

export function getThemePreviewCssPath(themeId: ThemeId): string {
  return themeLoginResourcePath(themeId, THEME_PREVIEW_CSS_PATH)
}

export function getThemePreviewStylesPath(themeId: ThemeId): string {
  return themeLoginResourcePath(themeId, THEME_STYLES_CSS_PATH)
}
