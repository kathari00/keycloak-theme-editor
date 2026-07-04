import type {
  CreateThemeDocumentInput,
  ThemeDocument,
  ThemeDocumentColorSettings,
  ThemeDocumentContentSettings,
} from './types'

export function createQuickSettings(
  colorSettings: ThemeDocumentColorSettings,
  contentSettings: ThemeDocumentContentSettings,
) {
  return {
    ...colorSettings,
    ...contentSettings,
  }
}

export function createThemeDocument(input: CreateThemeDocumentInput): ThemeDocument {
  return {
    themeId: input.themeId,
    sourceThemeId: input.sourceThemeId ?? input.themeId,
    isPresetTheme: input.isPresetTheme,
    stylesCss: input.stylesCss,
    stylesCssFiles: input.stylesCssFiles ?? {},
    quickStartCss: input.quickStartCss,
    quickSettings: input.quickSettings,
    quickSettingsStylesByMode: input.quickSettingsStylesByMode ?? {},
    assets: {
      uploadedAssets: input.uploadedAssets,
      appliedAssets: input.appliedAssets,
    },
  }
}
