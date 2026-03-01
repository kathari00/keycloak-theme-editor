export type BaseThemeId = 'base' | 'v2'
export type ThemeId = 'base' | 'v2' | 'modern-gradient' | 'horizontal-card'

const BUILTIN_THEME_IDS: ReadonlySet<string> = new Set<string>(['base', 'v2', 'modern-gradient', 'horizontal-card'])

export function isBuiltinTheme(themeId: string): boolean {
  return BUILTIN_THEME_IDS.has(themeId)
}

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
