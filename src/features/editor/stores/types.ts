import type { AppliedAssets, KeycloakPage, UploadedAsset } from '../../assets/types'
import type { QuickSettingsMode } from '../lib/quick-settings'

export interface AssetState {
  uploadedAssets: UploadedAsset[]
  appliedAssets: AppliedAssets
  appliedAssetsByTheme: Record<string, AppliedAssets>
}

export interface UndoRedoAction {
  undo: () => void
  redo: () => void
  scope?: 'mode' | 'theme'
  coalesceKey?: string
  createdAt?: number
  coalesceWindowMs?: number
}

export interface QuickSettingsStyle {
  colorPresetId: string
  colorPresetPrimaryColor: string
  colorPresetSecondaryColor: string
  colorPresetFontFamily: string
  colorPresetBgColor: string
  colorPresetBorderRadius: 'sharp' | 'rounded' | 'pill'
  colorPresetCardShadow: 'none' | 'subtle' | 'strong'
  colorPresetHeadingFontFamily: string
}

export interface QuickStartContentSettings {
  showClientName: boolean
  showRealmName: boolean
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
  imprintLabel: string
  dataProtectionLabel: string
}

export interface QuickSettings extends QuickSettingsStyle, QuickStartContentSettings {}

/**
 * Per-locale overrides for the theme's own message keys. Omitted or blank
 * fields are left out of the exported bundle so Keycloak falls back to English.
 */
export interface LocalizedContentOverrides {
  infoMessage?: string
  imprintLabel?: string
  dataProtectionLabel?: string
  /** Any Keycloak message key selected directly in the preview. */
  [messageKey: string]: string | undefined
}

/** Keyed by curated locale tag; the base language is not stored here. */
export type QuickStartContentByLocale = Partial<Record<string, LocalizedContentOverrides>>

export type QuickSettingsStylesByMode = Partial<Record<QuickSettingsMode, QuickSettingsStyle>>

export type QuickSettingsStylesByThemeMode = Record<string, QuickSettingsStylesByMode>

export interface PresetState {
  selectedThemeId: string
  presetCss: string
  quickSettingsStylesByThemeMode: QuickSettingsStylesByThemeMode
  colorPresetId: QuickSettingsStyle['colorPresetId']
  colorPresetPrimaryColor: QuickSettingsStyle['colorPresetPrimaryColor']
  colorPresetSecondaryColor: QuickSettingsStyle['colorPresetSecondaryColor']
  colorPresetFontFamily: QuickSettingsStyle['colorPresetFontFamily']
  colorPresetBgColor: QuickSettingsStyle['colorPresetBgColor']
  colorPresetBorderRadius: QuickSettingsStyle['colorPresetBorderRadius']
  colorPresetCardShadow: QuickSettingsStyle['colorPresetCardShadow']
  colorPresetHeadingFontFamily: QuickSettingsStyle['colorPresetHeadingFontFamily']
  showClientName: QuickStartContentSettings['showClientName']
  showRealmName: QuickStartContentSettings['showRealmName']
  infoMessage: QuickStartContentSettings['infoMessage']
  imprintUrl: QuickStartContentSettings['imprintUrl']
  dataProtectionUrl: QuickStartContentSettings['dataProtectionUrl']
  imprintLabel: QuickStartContentSettings['imprintLabel']
  dataProtectionLabel: QuickStartContentSettings['dataProtectionLabel']
  /** Curated locale tags the exported theme declares, excluding the base language. */
  enabledLocales: string[]
  quickStartContentByLocale: QuickStartContentByLocale
}

export interface ThemeState {
  baseCss: string
  stylesCss: string
  stylesCssByTheme: Record<string, string>
  stylesCssFiles: Record<string, string>
  stylesCssFilesByTheme: Record<string, Record<string, string>>
  activeCssFilePath: string
  /** Original quick-start.css content from the theme (read-only reference for defaults) */
  themeQuickStartDefaults: string
  pages: KeycloakPage[]
}

export interface CoreState {
  isDarkMode: boolean
  activePageId: string
  activeStateId: string
  selectedNodeId: string | null
  previewReady: boolean
  deviceId: 'desktop' | 'tablet' | 'mobile'
  /** Language the preview renders in; only affects the preview, not the export. */
  previewLocaleTag: string
}

export interface HistoryState {
  activeScopeKey: string
  revision: number
  stacksByScope: Record<string, {
    undoStack: UndoRedoAction[]
    redoStack: UndoRedoAction[]
  }>
  undoStack: UndoRedoAction[]
  redoStack: UndoRedoAction[]
  canUndo: boolean
  canRedo: boolean
}
