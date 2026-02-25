import type { QuickSettings } from '../editor/stores/types'
import type { ImportedQuickSettingsByMode } from './types'

const QUICK_SETTINGS_LIGHT_KEY = 'x-kte-quick-settings-light'
const QUICK_SETTINGS_DARK_KEY = 'x-kte-quick-settings-dark'

function sanitizeQuickSettingsValue(
  value: Partial<QuickSettings> | null | undefined,
): Partial<QuickSettings> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  return value
}

function encodeQuickSettings(value: Partial<QuickSettings>): string {
  return encodeURIComponent(JSON.stringify(value))
}

function decodeQuickSettings(encoded: string | undefined): Partial<QuickSettings> | undefined {
  if (!encoded) {
    return undefined
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded))
    return sanitizeQuickSettingsValue(parsed)
  }
  catch {
    return undefined
  }
}

function extractPropertyValue(propertiesText: string, key: string): string | undefined {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*([^\\r\\n#]+)`, 'im')
  const match = propertiesText.match(pattern)
  return match?.[1]?.trim()
}

export function parseQuickSettingsMetadataFromProperties(propertiesText: string): ImportedQuickSettingsByMode | undefined {
  const light = decodeQuickSettings(extractPropertyValue(propertiesText, QUICK_SETTINGS_LIGHT_KEY))
  const dark = decodeQuickSettings(extractPropertyValue(propertiesText, QUICK_SETTINGS_DARK_KEY))
  if (!light && !dark) {
    return undefined
  }
  return { light, dark }
}

export function withQuickSettingsMetadata(
  propertiesContent: string,
  quickSettingsByMode: ImportedQuickSettingsByMode | undefined,
): string {
  const withoutMetadata = propertiesContent
    .replace(/^\s*x-kte-quick-settings-light\s*=.*(?:\r?\n)?/gim, '')
    .replace(/^\s*x-kte-quick-settings-dark\s*=.*(?:\r?\n)?/gim, '')
    .trimEnd()

  const light = sanitizeQuickSettingsValue(quickSettingsByMode?.light)
  const dark = sanitizeQuickSettingsValue(quickSettingsByMode?.dark)
  if (!light && !dark) {
    return withoutMetadata
  }

  const lines = [withoutMetadata, '', '# Keycloak Theme Editor Quick Settings']
  if (light) {
    lines.push(`${QUICK_SETTINGS_LIGHT_KEY}=${encodeQuickSettings(light)}`)
  }
  if (dark) {
    lines.push(`${QUICK_SETTINGS_DARK_KEY}=${encodeQuickSettings(dark)}`)
  }
  return `${lines.join('\n')}\n`
}

