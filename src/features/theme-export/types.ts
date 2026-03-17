import type { AppliedAssets, UploadedAsset } from '../assets/types'
import type { QuickSettings } from '../editor/stores/types'

export interface ThemeEditorMetadata {
  sourceThemeId?: string
}

export interface ThemeExportPayload {
  generatedCss: string
  uploadedFonts: UploadedAsset[]
  uploadedBackgrounds: UploadedAsset[]
  uploadedLogos: UploadedAsset[]
  uploadedImages: UploadedAsset[]
  appliedFavicon: UploadedAsset | undefined
}

export interface AssembleThemeFilesParams {
  themeName: string
  properties: string
  templateFtl: string
  footerFtl: string | null
  quickStartCss: string
  stylesCss: string
  stylesCssFiles?: Record<string, string>
  messagesContent: string
  payload: ThemeExportPayload
  customFtlFiles?: Record<string, string>
  editorMetadata: ThemeEditorMetadata
  extraBlobs?: Record<string, Blob>
}

export type JarBuildParams = AssembleThemeFilesParams

export type DirectoryWriteParams = Omit<AssembleThemeFilesParams, 'extraBlobs'>

export interface ImportedQuickSettingsByMode {
  light?: Partial<QuickSettings>
  dark?: Partial<QuickSettings>
}

export interface JarImportResult {
  css: string
  stylesCssFiles?: Record<string, string>
  quickStartCss?: string
  properties: string
  themeName: string
  sourceThemeId?: string
  quickSettingsByMode?: ImportedQuickSettingsByMode
  uploadedAssets: UploadedAsset[]
  appliedAssets: AppliedAssets
}

export interface EditorCssContext {
  presetCss: string
  colorPresetCss: string
}
