import type { AppliedAssets, UploadedAsset } from '../assets/types'
import type { QuickSettings } from '../editor/stores/types'

/** Assembled CSS + asset payload ready for JAR packing or directory writing */
export interface ThemeExportPayload {
  generatedCss: string
  uploadedFonts: UploadedAsset[]
  uploadedBackgrounds: UploadedAsset[]
  uploadedLogos: UploadedAsset[]
  uploadedImages: UploadedAsset[]
  appliedFavicon: UploadedAsset | undefined
}

/** Parameters for building a complete JAR blob */
export interface JarBuildParams {
  themeName: string
  properties: string
  payload: ThemeExportPayload
  templateFtl: string
  footerFtl: string | null
  quickStartCss: string
  stylesCss: string
  bgImageBlob?: Blob
  logoImageBlob?: Blob
  messagesContent: string
}

/** Parameters for writing theme files to a directory */
export interface DirectoryWriteParams {
  properties: string
  templateFtl: string
  footerFtl: string | null
  quickStartCss: string
  stylesCss: string
  messagesContent: string
  payload: ThemeExportPayload
}

export interface ImportedQuickSettingsByMode {
  light?: Partial<QuickSettings>
  dark?: Partial<QuickSettings>
}

/** Result of parsing an imported JAR file */
export interface JarImportResult {
  css: string
  properties: string
  themeName: string
  themeId: string | null
  quickSettingsByMode?: ImportedQuickSettingsByMode
  uploadedAssets: UploadedAsset[]
  appliedAssets: AppliedAssets
}

/** CSS context assembled from preset + quick-start state */
export interface EditorCssContext {
  presetCss: string
  colorPresetCss: string
}
