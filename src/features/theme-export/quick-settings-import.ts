import type {
  LocalizedContentOverrides,
  QuickSettings,
  QuickStartContentSettings,
} from '../editor/stores/types'
import type { ImportedQuickSettingsByMode } from './types'
import { collectDeclarationsBySelector } from '../../lib/css-ast'
import { CUSTOM_PRESET_ID } from '../editor/lib/quick-start-css'
import { DEFAULT_DATA_PROTECTION_LABEL, DEFAULT_IMPRINT_LABEL } from '../editor/stores/preset-store'
import { parseMessageProperties, readMessageProperty } from '../preview/lib/message-properties'

type QuickSettingsMode = 'light' | 'dark'
type QuickSettingsVars = Partial<Record<string, string>>

const COLOR_HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const HIDE_REALM_RULE_PATTERN = /\/\*\s*Hide realm name\s*\*\//i
const HIDE_CLIENT_RULE_PATTERN = /\/\*\s*Hide client name\s*\*\//i

function normalizeCssValue(value: string | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ')
}

function getModeColorValue(
  vars: QuickSettingsVars,
  suffix: 'primary-color' | 'secondary-color' | 'bg-color',
  mode: QuickSettingsMode,
): string {
  const candidates = mode === 'dark'
    ? [`--quickstart-${suffix}`, `--quickstart-${suffix}-dark`, `--quickstart-${suffix}-light`]
    : [`--quickstart-${suffix}`, `--quickstart-${suffix}-light`, `--quickstart-${suffix}-dark`]

  for (const candidate of candidates) {
    const value = normalizeCssValue(vars[candidate])
    if (value && !value.startsWith('var(')) {
      return value
    }
  }

  return ''
}

function normalizeFontValue(value: string | undefined): string {
  const normalized = normalizeCssValue(value)
  if (!normalized || normalized.includes('var(')) {
    return CUSTOM_PRESET_ID
  }
  return normalized
}

function mapBorderRadiusValue(value: string | undefined): QuickSettings['colorPresetBorderRadius'] {
  const normalized = normalizeCssValue(value).toLowerCase()
  if (normalized === '0' || normalized === '0px') {
    return 'sharp'
  }
  if (normalized === '24px') {
    return 'pill'
  }
  return 'rounded'
}

function mapCardShadowValue(value: string | undefined): QuickSettings['colorPresetCardShadow'] {
  const normalized = normalizeCssValue(value).toLowerCase()
  if (!normalized) {
    return 'subtle'
  }
  if (normalized === 'none') {
    return 'none'
  }
  if (normalized.includes('0 8px 32px')) {
    return 'strong'
  }
  return 'subtle'
}

function classifyModeBySelector(selectorText: string): QuickSettingsMode | 'shared' {
  const selector = selectorText.toLowerCase()
  if (selector.includes(':not(.pf-v5-theme-dark)') || selector.includes(':not(.kcdarkmodeclass)')) {
    return 'light'
  }
  if (
    selector.includes('html.pf-v5-theme-dark')
    || selector.includes('body.pf-v5-theme-dark')
    || selector.includes('html.kcdarkmodeclass')
    || selector.includes('body.kcdarkmodeclass')
  ) {
    return 'dark'
  }
  if (selector.includes(':root')) {
    return 'shared'
  }
  return 'shared'
}

function collectQuickStartVariablesByMode(cssText: string): {
  shared: QuickSettingsVars
  light: QuickSettingsVars
  dark: QuickSettingsVars
} {
  const shared: QuickSettingsVars = {}
  const light: QuickSettingsVars = {}
  const dark: QuickSettingsVars = {}

  for (const [selector, declarations] of collectDeclarationsBySelector(cssText)) {
    const mode = classifyModeBySelector(selector)
    const target = mode === 'light' ? light : mode === 'dark' ? dark : shared

    for (const [property, rawValue] of Object.entries(declarations)) {
      if (!property.startsWith('--quickstart-')) {
        continue
      }

      const value = normalizeCssValue(rawValue)
      if (!value) {
        continue
      }

      target[property] = value
    }
  }

  return { shared, light, dark }
}

function mergeVarMaps(...maps: QuickSettingsVars[]): QuickSettingsVars {
  const merged: QuickSettingsVars = {}
  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      if (value) {
        merged[key] = value
      }
    }
  }
  return merged
}

function buildSharedQuickStartContent(cssText: string, messagesText: string): QuickStartContentSettings {
  const infoMessage = readMessageProperty(messagesText, 'infoMessage') || ''
  const imprintUrl = readMessageProperty(messagesText, 'imprintUrl') || ''
  const dataProtectionUrl = readMessageProperty(messagesText, 'dataProtectionUrl') || ''
  const imprintLabel = readMessageProperty(messagesText, 'imprintLabel') || ''
  const dataProtectionLabel = readMessageProperty(messagesText, 'dataProtectionLabel') || ''

  return {
    showClientName: !HIDE_CLIENT_RULE_PATTERN.test(cssText),
    showRealmName: !HIDE_REALM_RULE_PATTERN.test(cssText),
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
    imprintLabel: imprintLabel || DEFAULT_IMPRINT_LABEL,
    dataProtectionLabel: dataProtectionLabel || DEFAULT_DATA_PROTECTION_LABEL,
  }
}

function buildModeQuickSettings(params: {
  mode: QuickSettingsMode
  vars: QuickSettingsVars
  sharedContent: QuickStartContentSettings
}): Partial<QuickSettings> {
  const { mode, vars, sharedContent } = params
  const bgColorValue = getModeColorValue(vars, 'bg-color', mode)

  return {
    colorPresetId: CUSTOM_PRESET_ID,
    colorPresetPrimaryColor: getModeColorValue(vars, 'primary-color', mode) || '#0066cc',
    colorPresetSecondaryColor: getModeColorValue(vars, 'secondary-color', mode) || '#c0c0c0',
    colorPresetFontFamily: normalizeFontValue(vars['--quickstart-font-family']),
    colorPresetBgColor: COLOR_HEX_PATTERN.test(bgColorValue) ? bgColorValue : '',
    colorPresetBorderRadius: mapBorderRadiusValue(
      vars['--quickstart-border-radius'] || vars['--quickstart-control-border-radius-default'],
    ),
    colorPresetCardShadow: mapCardShadowValue(
      vars['--quickstart-card-shadow'] || vars['--quickstart-card-shadow-default'],
    ),
    colorPresetHeadingFontFamily: normalizeFontValue(vars['--quickstart-heading-font-family']),
    ...sharedContent,
  }
}

/**
 * Reads a translation bundle back into editable overrides. Keys the bundle does
 * not carry stay undefined, which round-trips as "not translated". `excludeKeys`
 * strips keys that already have a canonical home elsewhere (see
 * `BASE_QUICK_START_MESSAGE_KEYS`) - needed when reading the base English
 * bundle, which carries those keys as first-class properties.
 */
export function parseLocalizedContentOverrides(messagesText: string, excludeKeys?: readonly string[]): LocalizedContentOverrides {
  const overrides: LocalizedContentOverrides = {}
  for (const [key, rawValue] of Object.entries(parseMessageProperties(messagesText))) {
    if (excludeKeys?.includes(key)) {
      continue
    }
    const value = rawValue.trim()
    if (value) {
      overrides[key] = value
    }
  }

  return overrides
}

export function parseQuickSettingsFromImportedTheme(params: {
  quickStartCss: string
  stylesCss: string
  customCss?: string
  messagesPropertiesText?: string
}): ImportedQuickSettingsByMode | undefined {
  const { quickStartCss, stylesCss, customCss = '', messagesPropertiesText = '' } = params
  const cssForVars = [quickStartCss, stylesCss].filter(Boolean).join('\n\n')
  const cssForVisibility = [quickStartCss, stylesCss, customCss].filter(Boolean).join('\n\n')
  const hasQuickStartSignal = /--quickstart-(?:primary|secondary|font|heading|bg-color|border|card|gradient)|Hide client name|Hide realm name|infoMessage|imprintUrl|dataProtectionUrl/i.test(
    `${cssForVars}\n${messagesPropertiesText}`,
  )

  if (!hasQuickStartSignal) {
    return undefined
  }

  const { shared, light, dark } = collectQuickStartVariablesByMode(cssForVars)
  const sharedContent = buildSharedQuickStartContent(cssForVisibility, messagesPropertiesText)

  const lightVars = mergeVarMaps(shared, light)
  const darkVars = mergeVarMaps(shared, light, dark)

  return {
    light: buildModeQuickSettings({ mode: 'light', vars: lightVars, sharedContent }),
    dark: buildModeQuickSettings({ mode: 'dark', vars: darkVars, sharedContent }),
  }
}
