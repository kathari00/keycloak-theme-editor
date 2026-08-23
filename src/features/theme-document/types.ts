import type { AppliedAssets, UploadedAsset } from '../assets/types'
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
