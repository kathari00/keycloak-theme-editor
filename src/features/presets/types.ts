import type { AssetCategory } from '../assets/types'

export type ThemeId = string

export interface ThemeDefaultAsset {
  category: AssetCategory
  name: string
  path: string
}

export interface EditorTheme {
  id: ThemeId
  name: string
  description: string
  type?: 'imported'
  defaultAssets: ThemeDefaultAsset[]
  darkModeClasses?: string[]
}

export interface ThemeConfig {
  themes: EditorTheme[]
}

/** Derive a login file path for a theme by convention: /keycloak-dev-resources/themes/{themeId}/login/{filename} */
export function themeResourcePath(themeId: string, filename: string): string {
  return `/keycloak-dev-resources/themes/${themeId}/login/${filename}`
}
