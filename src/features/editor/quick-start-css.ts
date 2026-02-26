import type { QuickSettingsStyle } from './stores/types'
import {
  buildGoogleFontsImportCSS,
  normalizeGoogleFontFamily,
} from '../assets/google-fonts'
import { QUICK_START_GENERATED_ROOT_VARIABLE_NAMES } from './quickstart-variable-registry'

export const CUSTOM_PRESET_ID = 'custom'

export const COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export const BORDER_RADIUS_OPTIONS: {
  value: QuickSettingsStyle['colorPresetBorderRadius']
  label: string
  px: string
}[] = [
  { value: 'sharp', label: 'Sharp', px: '0px' },
  { value: 'rounded', label: 'Rounded', px: '8px' },
  { value: 'pill', label: 'Pill', px: '24px' },
]

export const CARD_SHADOW_OPTIONS: {
  value: QuickSettingsStyle['colorPresetCardShadow']
  label: string
  css: string
}[] = [
  { value: 'none', label: 'None', css: 'none' },
  { value: 'subtle', label: 'Subtle', css: '0 2px 8px rgba(0,0,0,0.10)' },
  { value: 'strong', label: 'Strong', css: '0 8px 32px rgba(0,0,0,0.25)' },
]

export interface QuickStartCssOptions {
  primaryColor: string
  secondaryColor: string
  fontFamily?: string
  bgColor?: string
  borderRadius?: QuickSettingsStyle['colorPresetBorderRadius']
  cardShadow?: QuickSettingsStyle['colorPresetCardShadow']
  headingFontFamily?: string
  showClientName?: boolean
  showRealmName?: boolean
  infoMessage?: string
  imprintUrl?: string
  dataProtectionUrl?: string
}

interface QuickStartVisibilityState {
  showClientName: boolean
  effectiveShowRealmName: boolean
  hasInfoMessage: boolean
}

function extractPrimaryFontFamily(fontFamily: string): string | null {
  const first = fontFamily.split(',')[0]?.trim()
  if (!first) {
    return null
  }

  return first.replace(/^['"]|['"]$/g, '')
}

function buildQuickStartRootCss(variableValues: Partial<Record<string, string>>): string {
  const lines = QUICK_START_GENERATED_ROOT_VARIABLE_NAMES
    .flatMap((variableName) => {
      const variableValue = variableValues[variableName]
      return variableValue ? [`  ${variableName}: ${variableValue};`] : []
    })

  return `:root {\n${lines.join('\n')}\n}`
}

function buildQuickStartVisibilityState(options: QuickStartCssOptions): QuickStartVisibilityState {
  const showClientName = Boolean(options.showClientName)
  const effectiveShowRealmName = options.showRealmName ?? !showClientName
  const hasInfoMessage = Boolean(options.infoMessage && options.infoMessage.trim())

  return {
    showClientName,
    effectiveShowRealmName,
    hasInfoMessage,
  }
}

interface QuickStartCssParts {
  googleFontsImport: string
  rootVariablesCss: string
  rulesCss: string
}

function buildQuickStartCssParts(options: QuickStartCssOptions): QuickStartCssParts {
  const {
    primaryColor,
    secondaryColor,
    fontFamily = '',
    bgColor = '',
    borderRadius = 'rounded',
    cardShadow = 'subtle',
    headingFontFamily = '',
    showRealmName,
  } = options

  const {
    showClientName,
    effectiveShowRealmName,
    hasInfoMessage,
  } = buildQuickStartVisibilityState(options)

  const googleFontFamilies = new Set<string>()
  ;[fontFamily, headingFontFamily].forEach((selectedFont) => {
    if (!selectedFont || selectedFont === CUSTOM_PRESET_ID) {
      return
    }

    const primaryFamily = extractPrimaryFontFamily(selectedFont)
    if (!primaryFamily) {
      return
    }

    const normalizedGoogleFamily = normalizeGoogleFontFamily(primaryFamily)
    if (normalizedGoogleFamily) {
      googleFontFamilies.add(normalizedGoogleFamily)
    }
  })

  const googleFontsImport = buildGoogleFontsImportCSS(Array.from(googleFontFamilies))
  const radiusEntry
    = BORDER_RADIUS_OPTIONS.find(option => option.value === borderRadius)
      || BORDER_RADIUS_OPTIONS.find(option => option.value === 'rounded')
  const shadowEntry
    = CARD_SHADOW_OPTIONS.find(option => option.value === cardShadow)
      || CARD_SHADOW_OPTIONS.find(option => option.value === 'subtle')

  const quickStartRootVariableValues: Partial<Record<string, string>> = {
    '--quickstart-primary-color': primaryColor,
    '--quickstart-secondary-color': secondaryColor,
  }

  if (fontFamily && fontFamily !== CUSTOM_PRESET_ID) {
    quickStartRootVariableValues['--quickstart-font-family'] = fontFamily
  }

  if (headingFontFamily && headingFontFamily !== CUSTOM_PRESET_ID) {
    quickStartRootVariableValues['--quickstart-heading-font-family'] = headingFontFamily
  }

  if (bgColor && COLOR_REGEX.test(bgColor)) {
    quickStartRootVariableValues['--quickstart-bg-color'] = bgColor
    quickStartRootVariableValues['--quickstart-bg-image'] = 'none'
  }

  if (radiusEntry) {
    quickStartRootVariableValues['--quickstart-border-radius'] = radiusEntry.px
  }

  if (shadowEntry) {
    quickStartRootVariableValues['--quickstart-card-shadow'] = shadowEntry.css
  }

  const rootVariablesCss = buildQuickStartRootCss(quickStartRootVariableValues)

  const rulesCss = `${
    !effectiveShowRealmName
      ? `
/* Hide realm name */
#kc-realm-name,
.kc-realm-name,
.kc-horizontal-card-realm-name {
  display: none !important;
}
`
      : ''
  }${
    !showClientName
      ? `
/* Hide client name */
#kc-client-name,
.kc-client-name,
.kc-horizontal-card-client-name,
[data-kc-client="name"] {
  display: none !important;
}
`
      : ''
  }${
    !showClientName && !effectiveShowRealmName
      ? `
/* Hide subtitle row when both client and realm are disabled */
.kc-horizontal-card-subtitle {
  display: none !important;
}
`
      : ''
  }${
    hasInfoMessage
      ? ''
      : `
/* Hide info message */
#kc-info-message.kcAlertClass,
.kc-info-message,
[data-kc-i18n-key="infoMessage"] {
  display: none !important;
}
`
  }${
    showClientName || hasInfoMessage || (showRealmName !== undefined ? effectiveShowRealmName : false)
      ? ''
      : `
/* Hide client container */
#kc-client,
.kc-client {
  display: none !important;
}
`
  }`.trim()

  return { googleFontsImport, rootVariablesCss, rulesCss }
}

export function buildQuickStartCss(options: QuickStartCssOptions) {
  const { googleFontsImport, rootVariablesCss, rulesCss } = buildQuickStartCssParts(options)
  return [googleFontsImport, rootVariablesCss, rulesCss].filter(Boolean).join('\n\n').trim()
}

/** Returns quick-start CSS without the :root variable block — for export where variables are scoped separately. */
export function buildQuickStartNonVariableCss(options: QuickStartCssOptions) {
  const { googleFontsImport, rulesCss } = buildQuickStartCssParts(options)
  return [googleFontsImport, rulesCss].filter(Boolean).join('\n\n').trim()
}
