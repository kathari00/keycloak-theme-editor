import type { AssetCategory } from '../assets/types'
import type { QuickStartContentSettings } from '../editor/stores/types'

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
  contentDefaults?: Partial<QuickStartContentSettings>
  darkModeClasses?: string[]
}

export interface ThemeConfig {
  themes: EditorTheme[]
}
