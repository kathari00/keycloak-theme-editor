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
  /**
   * Whether this theme's template markup is fully driven by `theme.properties` `kc*Class`
   * substitutions (required for framework binding to work without touching `.ftl` files).
   * `v2`, for example, hardcodes some PatternFly classes directly in `template.ftl` and so
   * cannot host a foreign framework cleanly.
   */
  supportsFrameworkBinding?: boolean
  /**
   * Whether this theme's `template.ftl`/`footer.ftl` expose the DOM hooks (`#kc-content`,
   * `#kc-content-wrapper`, a grid-targetable `.kcFormCardClass`/`.kcFormHeaderClass` split
   * point) that layout stylesheets target. Independent of `supportsFrameworkBinding`: `v2`
   * doesn't support framework binding (it hardcodes `pf-v5-c-*` classes instead of the shared
   * `kc*Class` vocabulary theme.properties substitution relies on), but its template was given
   * these structural hooks directly, so layout selection works for it anyway.
   */
  supportsLayoutSelection?: boolean
}

export interface ThemeConfig {
  themes: EditorTheme[]
}
