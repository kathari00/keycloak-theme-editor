export type BaseThemeId = 'base' | 'v2'
export type ThemeId = 'base' | 'v2' | 'modern-gradient' | 'horizontal-card'

export interface EditorTheme {
  id: ThemeId
  name: string
  description: string
  baseId: BaseThemeId
}

export interface ThemeConfig {
  themes: EditorTheme[]
}

/** Derive a login file path for a theme by convention: /keycloak-dev-resources/themes/{themeId}/login/{filename} */
export function themeResourcePath(themeId: string, filename: string): string {
  return `/keycloak-dev-resources/themes/${themeId}/login/${filename}`
}
