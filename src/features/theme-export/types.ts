import type { AppliedAssets, UploadedAsset } from '../assets/types'
import type { QuickSettings } from '../editor/stores/types'
import type { ThemeEditorMetadata } from './theme-file-assembler'

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
  messagesContent: string
  editorMetadata: ThemeEditorMetadata
  /** Extra resource blobs (e.g. default bg/logo for v2) keyed by path relative to login/resources/ */
  extraBlobs?: Record<string, Blob>
}

/** Parameters for writing theme files to a directory */
export interface DirectoryWriteParams {
  themeName: string
  properties: string
  templateFtl: string
  footerFtl: string | null
  quickStartCss: string
  stylesCss: string
  messagesContent: string
  payload: ThemeExportPayload
  editorMetadata: ThemeEditorMetadata
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
  quickSettingsByMode?: ImportedQuickSettingsByMode
  uploadedAssets: UploadedAsset[]
  appliedAssets: AppliedAssets
}

/** CSS context assembled from preset + quick-start state */
export interface EditorCssContext {
  presetCss: string
  colorPresetCss: string
}
