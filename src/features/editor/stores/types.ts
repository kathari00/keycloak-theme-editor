import type { AppliedAssets, KeycloakPage, UploadedAsset } from '../../assets/types'

export interface AssetState {
  uploadedAssets: UploadedAsset[]
  appliedAssets: AppliedAssets
}

export interface UndoRedoAction {
  undo: () => void
  redo: () => void
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
}

export interface QuickSettings extends QuickSettingsStyle, QuickStartContentSettings {}

export interface PresetState {
  selectedThemeId: string
  presetCss: string
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
  // Key format: `${themeId}::light|dark`.
  presetQuickSettings: Record<string, QuickSettings>
}

export interface ThemeState {
  baseCss: string
  /** User-editable layout/styles CSS (loaded from styles.css, without quick-start content) */
  stylesCss: string
  /** User-editable styles scoped per theme id. */
  stylesCssByTheme: Record<string, string>
  /** Original quick-start.css content from the theme (read-only reference for defaults) */
  themeQuickStartDefaults: string
  pages: KeycloakPage[]
}

export interface CoreState {
  isDarkMode: boolean
  activePageId: string
  activeStoryId: string
  selectedNodeId: string | null
  previewReady: boolean
  deviceId: 'desktop' | 'tablet' | 'mobile'
}

export interface HistoryState {
  activeScopeKey: string
  stacksByScope: Record<string, {
    undoStack: UndoRedoAction[]
    redoStack: UndoRedoAction[]
  }>
  undoStack: UndoRedoAction[]
  redoStack: UndoRedoAction[]
  canUndo: boolean
  canRedo: boolean
}
