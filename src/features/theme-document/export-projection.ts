import type { QuickSettings, QuickSettingsStyle, QuickStartContentSettings } from '../editor/stores/types'
import type { ImportedQuickSettingsByMode } from '../theme-export/types'
import type { ThemeDocument } from './types'
import { buildThemeQuickStartDefaults } from '../editor/actions/css-variable-reader'

type SharedExportContentSettings = QuickStartContentSettings

function getSharedExportContentSettings(document: ThemeDocument): SharedExportContentSettings {
  const {
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  } = document.quickSettings

  return {
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  }
}

function getDocumentQuickSettingsStyle(document: ThemeDocument): QuickSettingsStyle {
  const {
    colorPresetId,
    colorPresetPrimaryColor,
    colorPresetSecondaryColor,
    colorPresetFontFamily,
    colorPresetBgColor,
    colorPresetBorderRadius,
    colorPresetCardShadow,
    colorPresetHeadingFontFamily,
  } = document.quickSettings

  return {
    colorPresetId,
    colorPresetPrimaryColor,
    colorPresetSecondaryColor,
    colorPresetFontFamily,
    colorPresetBgColor,
    colorPresetBorderRadius,
    colorPresetCardShadow,
    colorPresetHeadingFontFamily,
  }
}

function getModeQuickSettingsStyle(
  document: ThemeDocument,
  quickStartCss: string,
  mode: 'light' | 'dark',
): QuickSettingsStyle {
  const themeDefaults = buildThemeQuickStartDefaults(quickStartCss, mode)
  return {
    ...getDocumentQuickSettingsStyle(document),
    colorPresetId: themeDefaults.colorPresetId,
    colorPresetPrimaryColor: themeDefaults.colorPresetPrimaryColor,
    colorPresetSecondaryColor: themeDefaults.colorPresetSecondaryColor,
    colorPresetBgColor: themeDefaults.colorPresetBgColor,
    ...document.quickSettingsStylesByMode[mode],
  }
}

export function themeDocumentToExportQuickSettingsByMode(
  document: ThemeDocument,
  quickStartCss: string,
  quickSettingsOverrides: Partial<QuickSettings> = {},
): ImportedQuickSettingsByMode {
  const quickSettings = {
    ...document.quickSettings,
    ...quickSettingsOverrides,
  }
  const sharedContentSettings = getSharedExportContentSettings({
    ...document,
    quickSettings,
  })
  const buildModeSettings = (mode: 'light' | 'dark') => {
    const modeStyle = getModeQuickSettingsStyle(document, quickStartCss, mode)
    return {
      ...modeStyle,
      colorPresetBgColor: modeStyle.colorPresetBgColor || '',
      ...sharedContentSettings,
    }
  }

  return {
    light: buildModeSettings('light'),
    dark: buildModeSettings('dark'),
  }
}
