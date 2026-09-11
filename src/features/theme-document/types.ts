import type { AppliedAssets, UploadedAsset } from '../assets/types'
import type { BootstrapVariantId, FrameworkId } from '../editor/lib/framework-bindings/types'
import type { LayoutId } from '../editor/lib/layouts/types'
import type {
  QuickSettings,
  QuickSettingsStyle,
  QuickSettingsStylesByMode,
  QuickStartContentByLocale,
  QuickStartContentSettings,
} from '../editor/stores/types'

export interface ThemeDocumentAssets {
  uploadedAssets: UploadedAsset[]
  appliedAssets: AppliedAssets
}

export interface ThemeDocument {
  themeId: string
  sourceThemeId: string
  isPresetTheme: boolean
  stylesCss: string
  stylesCssFiles: Record<string, string>
  quickStartCss: string
  quickSettings: QuickSettings
  quickSettingsStylesByMode: QuickSettingsStylesByMode
  enabledLocales: string[]
  quickStartContentByLocale: QuickStartContentByLocale
  /** Effective framework-binding engine — always 'native' when the theme doesn't support binding. */
  frameworkId: FrameworkId
  bootstrapVariantId: BootstrapVariantId
  /** Effective layout — always 'card' when the theme doesn't support layout selection. */
  layoutId: LayoutId
  assets: ThemeDocumentAssets
}

export interface CreateThemeDocumentInput {
  themeId: string
  sourceThemeId?: string
  isPresetTheme: boolean
  stylesCss: string
  stylesCssFiles?: Record<string, string>
  quickStartCss: string
  quickSettings: QuickSettings
  quickSettingsStylesByMode?: QuickSettingsStylesByMode
  enabledLocales?: string[]
  quickStartContentByLocale?: QuickStartContentByLocale
  frameworkId?: FrameworkId
  bootstrapVariantId?: BootstrapVariantId
  layoutId?: LayoutId
  uploadedAssets: UploadedAsset[]
  appliedAssets: AppliedAssets
}

export type ThemeDocumentColorSettings = Pick<
  QuickSettingsStyle,
  | 'colorPresetId'
  | 'colorPresetPrimaryColor'
  | 'colorPresetSecondaryColor'
  | 'colorPresetFontFamily'
  | 'colorPresetBgColor'
  | 'colorPresetBorderRadius'
  | 'colorPresetCardShadow'
  | 'colorPresetHeadingFontFamily'
>

export type ThemeDocumentContentSettings = Pick<
  QuickStartContentSettings,
  | 'showClientName'
  | 'showRealmName'
  | 'infoMessage'
  | 'imprintUrl'
  | 'dataProtectionUrl'
  | 'imprintLabel'
  | 'dataProtectionLabel'
>
