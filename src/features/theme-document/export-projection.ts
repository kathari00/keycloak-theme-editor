import type {
  LocalizedContentOverrides,
  QuickSettings,
  QuickSettingsStyle,
  QuickStartContentSettings,
} from '../editor/stores/types'
import type { ImportedQuickSettingsByMode } from '../theme-export/types'
import type { ThemeDocument } from './types'
import { buildThemeQuickStartDefaults } from '../editor/actions/css-variable-reader'
import { DEFAULT_LOCALE_TAG, isCuratedLocale } from '../i18n/locale-catalog'

type SharedExportContentSettings = QuickStartContentSettings

function getSharedExportContentSettings(document: ThemeDocument): SharedExportContentSettings {
  const {
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
    imprintLabel,
    dataProtectionLabel,
  } = document.quickSettings

  return {
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
    imprintLabel,
    dataProtectionLabel,
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

/**
 * Locale tags the exported theme declares: the base language plus every
 * enabled curated locale, deduplicated and in catalog-independent input order.
 */
export function themeDocumentToExportLocales(document: ThemeDocument): string[] {
  const enabled = document.enabledLocales.filter(
    tag => isCuratedLocale(tag) && tag !== DEFAULT_LOCALE_TAG,
  )
  return [DEFAULT_LOCALE_TAG, ...new Set(enabled)]
}

/** Per-locale message overrides, restricted to locales the theme actually declares. */
export function themeDocumentToExportLocaleMessages(
  document: ThemeDocument,
): Record<string, LocalizedContentOverrides> {
  const result: Record<string, LocalizedContentOverrides> = {}
  for (const tag of themeDocumentToExportLocales(document)) {
    if (tag === DEFAULT_LOCALE_TAG) {
      continue
    }
    result[tag] = document.quickStartContentByLocale[tag] ?? {}
  }
  return result
}
