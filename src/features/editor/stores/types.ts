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

export interface QuickSettings {
  colorPresetId: string
  colorPresetPrimaryColor: string
  colorPresetSecondaryColor: string
  colorPresetFontFamily: string
  colorPresetBgColor: string
  colorPresetBorderRadius: 'default' | 'sharp' | 'rounded' | 'pill'
  colorPresetCardShadow: 'default' | 'none' | 'subtle' | 'strong'
  colorPresetHeadingFontFamily: string
  showClientName: boolean
  showRealmName: boolean
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
}

export interface PresetState {
  selectedThemeId: string
  presetCss: string
  colorPresetId: string
  colorPresetPrimaryColor: string
  colorPresetSecondaryColor: string
  colorPresetFontFamily: string
  colorPresetBgColor: string
  colorPresetBorderRadius: 'default' | 'sharp' | 'rounded' | 'pill'
  colorPresetCardShadow: 'default' | 'none' | 'subtle' | 'strong'
  colorPresetHeadingFontFamily: string
  showClientName: boolean
  showRealmName: boolean
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
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
