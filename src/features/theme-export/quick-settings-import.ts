import type { QuickSettings } from '../editor/stores/types'
import type { ImportedQuickSettingsByMode } from './types'
import { CUSTOM_PRESET_ID } from '../editor/quick-start-css'
import { readMessageProperty } from '../preview/message-properties'

type QuickSettingsMode = 'light' | 'dark'
type QuickSettingsVars = Partial<Record<string, string>>

const COLOR_HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const HIDE_REALM_RULE_PATTERN = /\/\*\s*Hide realm name\s*\*\//i
const HIDE_CLIENT_RULE_PATTERN = /\/\*\s*Hide client name\s*\*\//i

function normalizeCssValue(value: string | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ')
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
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g
  const declPattern = /(--quickstart-[a-z0-9-]+)\s*:([^;]+);/gi

  for (const match of cssText.matchAll(blockPattern)) {
    const selector = match[1] || ''
    const body = match[2] || ''
    if (!body.toLowerCase().includes('--quickstart-')) {
      continue
    }

    const mode = classifyModeBySelector(selector)
    const target = mode === 'light' ? light : mode === 'dark' ? dark : shared

    for (const decl of body.matchAll(declPattern)) {
      const varName = decl[1]?.trim()
      const value = normalizeCssValue(decl[2])
      if (!varName || !value) {
        continue
      }
      target[varName] = value
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

function buildSharedQuickStartContent(cssText: string, messagesText: string): Pick<
  QuickSettings,
  'showClientName' | 'showRealmName' | 'infoMessage' | 'imprintUrl' | 'dataProtectionUrl'
> {
  const infoMessage = readMessageProperty(messagesText, 'infoMessage') || ''
  const imprintUrl = readMessageProperty(messagesText, 'imprintUrl') || ''
  const dataProtectionUrl = readMessageProperty(messagesText, 'dataProtectionUrl') || ''

  return {
    showClientName: !HIDE_CLIENT_RULE_PATTERN.test(cssText),
    showRealmName: !HIDE_REALM_RULE_PATTERN.test(cssText),
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  }
}

function buildModeQuickSettings(params: {
  vars: QuickSettingsVars
  sharedContent: Pick<QuickSettings, 'showClientName' | 'showRealmName' | 'infoMessage' | 'imprintUrl' | 'dataProtectionUrl'>
}): Partial<QuickSettings> {
  const { vars, sharedContent } = params
  const bgColorValue = normalizeCssValue(vars['--quickstart-bg-color'])

  return {
    colorPresetId: CUSTOM_PRESET_ID,
    colorPresetPrimaryColor: normalizeCssValue(vars['--quickstart-primary-color']) || '#0066cc',
    colorPresetSecondaryColor: normalizeCssValue(vars['--quickstart-secondary-color']) || '#c0c0c0',
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

export function parseQuickSettingsFromImportedTheme(params: {
  quickStartCss: string
  stylesCss: string
  customCss?: string
  messagesPropertiesText?: string
}): ImportedQuickSettingsByMode | undefined {
  const { quickStartCss, stylesCss, customCss = '', messagesPropertiesText = '' } = params
  const cssForVars = [quickStartCss, stylesCss].filter(Boolean).join('\n\n')
  const cssForVisibility = [quickStartCss, stylesCss, customCss].filter(Boolean).join('\n\n')
  const hasQuickStartSignal = /--quickstart-|Hide client name|Hide realm name|infoMessage|imprintUrl|dataProtectionUrl/i.test(
    `${cssForVars}\n${messagesPropertiesText}`,
  )

  if (!hasQuickStartSignal) {
    return undefined
  }

  const { shared, light, dark } = collectQuickStartVariablesByMode(cssForVars)
  const sharedContent = buildSharedQuickStartContent(cssForVisibility, messagesPropertiesText)

  const lightVars = mergeVarMaps(shared, light)
  const darkVars = mergeVarMaps(shared, dark, light)

  return {
    light: buildModeQuickSettings({ vars: lightVars, sharedContent }),
    dark: buildModeQuickSettings({ vars: darkVars, sharedContent }),
  }
}
