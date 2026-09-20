import type { QuickSettingsStyle } from '../stores/types'
import type { QuickStartMarkerKey } from './quick-start-css-parser'
import {
  buildGoogleFontsImportCSS,
  normalizeGoogleFontFamily,
} from '../../assets/google-fonts'
import { buildQuickStartMarkerComment } from './quick-start-css-parser'
import { QUICK_START_GENERATED_ROOT_VARIABLE_NAMES } from './quickstart-variable-registry'

export const CUSTOM_PRESET_ID = 'custom'

export const COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function hexToHslTokens(color: string): { h: string, s: string, l: string, invertL: string } | null {
  const match = color.match(COLOR_REGEX)
  if (!match)
    return null
  const hex = match[1].length === 3 ? [...match[1]].map(value => value.repeat(2)).join('') : match[1]
  const [r, g, b] = [0, 2, 4].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const lightness = (max + min) / 2
  let hue = 0
  if (delta) {
    if (max === r)
      hue = ((g - b) / delta) % 6
    else if (max === g)
      hue = (b - r) / delta + 2
    else
      hue = (r - g) / delta + 4
    hue = (hue * 60 + 360) % 360
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))
  const linear = [r, g, b].map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  // Compare both WCAG contrast ratios rather than cutting at a lightness the eye picked.
  const contrastAgainst = (other: number) => (Math.max(luminance, other) + 0.05) / (Math.min(luminance, other) + 0.05)
  return {
    h: `${Math.round(hue * 100) / 100}deg`,
    s: `${Math.round(saturation * 10000) / 100}%`,
    l: `${Math.round(lightness * 10000) / 100}%`,
    invertL: contrastAgainst(0) >= contrastAgainst(1) ? '4%' : '100%',
  }
}

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
  /** A logo renders into #kc-header-wrapper (see below) - it must survive the header collapse. */
  hasLogo?: boolean
}

interface QuickStartVisibilityState {
  showClientName: boolean
  effectiveShowRealmName: boolean
  hasInfoMessage: boolean
}

const AUTO_SWITCH_COLOR_VARIABLE_NAMES = new Set([
  '--quickstart-primary-color',
  '--quickstart-secondary-color',
  '--quickstart-bg-color',
])

const QUICK_START_DARK_ALIAS_SELECTORS = [
  'html.pf-v5-theme-dark',
  'html.kcDarkModeClass',
]

function extractPrimaryFontFamily(fontFamily: string): string | null {
  const first = fontFamily.split(',')[0]?.trim()
  if (!first) {
    return null
  }

  return first.replace(/^['"]|['"]$/g, '')
}

export function buildQuickStartRootCss(
  variableValues: Partial<Record<string, string>>,
  markers: Partial<Record<string, string>> = {},
): string {
  const rootLines: string[] = []
  const darkLines: string[] = []

  QUICK_START_GENERATED_ROOT_VARIABLE_NAMES.forEach((variableName) => {
    const variableValue = variableValues[variableName]
    if (!variableValue) {
      return
    }

    const marker = markers[variableName]
    if (marker) {
      const markerKey = variableName.replace('--quickstart-', '') as QuickStartMarkerKey
      rootLines.push(`  ${buildQuickStartMarkerComment(markerKey, marker)}`)
    }

    if (AUTO_SWITCH_COLOR_VARIABLE_NAMES.has(variableName)) {
      rootLines.push(`  ${variableName}-light: ${variableValue};`)
      rootLines.push(`  ${variableName}-dark: ${variableValue};`)
      rootLines.push(`  ${variableName}: var(${variableName}-light);`)
      darkLines.push(`  ${variableName}: var(${variableName}-dark);`)
      return
    }

    rootLines.push(`  ${variableName}: ${variableValue};`)
  })

  const cssBlocks = [`:root {\n${rootLines.join('\n')}\n}`]
  if (darkLines.length > 0) {
    cssBlocks.push(`${QUICK_START_DARK_ALIAS_SELECTORS.join(',\n')} {\n${darkLines.join('\n')}\n}`)
  }

  return cssBlocks.join('\n\n')
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

export interface QuickStartCssParts {
  googleFontsImport: string
  rootVariablesCss: string
  rulesCss: string
}

export interface QuickStartVariableMapResult {
  variables: Record<string, string>
  /** Marker values (keyed by CSS variable name) for enum-valued tokens, for exact round-tripping. */
  markers: Partial<Record<string, string>>
}

/**
 * Single source of truth for quickstart option values -> `--quickstart-*` CSS custom properties.
 * Shared by the preview path (via `buildQuickStartCssParts`/`buildQuickStartRootCss`, which filters
 * to the registered root variable names) and the export path (via `buildScopedQuickStartVariablesCss`,
 * which emits every entry unfiltered into an explicit selector scope).
 */
export function buildQuickStartVariableMap(options: QuickStartCssOptions): QuickStartVariableMapResult {
  const {
    primaryColor,
    secondaryColor,
    fontFamily = '',
    bgColor = '',
    borderRadius = 'rounded',
    cardShadow = 'subtle',
    headingFontFamily = '',
  } = options

  const radiusEntry
    = BORDER_RADIUS_OPTIONS.find(option => option.value === borderRadius)
      || BORDER_RADIUS_OPTIONS.find(option => option.value === 'rounded')
  const shadowEntry
    = CARD_SHADOW_OPTIONS.find(option => option.value === cardShadow)
      || CARD_SHADOW_OPTIONS.find(option => option.value === 'subtle')

  const variables: Record<string, string> = {
    '--quickstart-primary-color': primaryColor,
    '--quickstart-secondary-color': secondaryColor,
  }
  const primaryHsl = hexToHslTokens(primaryColor)
  const secondaryHsl = hexToHslTokens(secondaryColor)
  if (primaryHsl) {
    variables['--quickstart-primary-h'] = primaryHsl.h
    variables['--quickstart-primary-s'] = primaryHsl.s
    variables['--quickstart-primary-l'] = primaryHsl.l
    variables['--quickstart-primary-invert-l'] = primaryHsl.invertL
  }
  if (secondaryHsl) {
    variables['--quickstart-secondary-h'] = secondaryHsl.h
    variables['--quickstart-secondary-s'] = secondaryHsl.s
    variables['--quickstart-secondary-l'] = secondaryHsl.l
    variables['--quickstart-secondary-invert-l'] = secondaryHsl.invertL
  }
  const markers: Partial<Record<string, string>> = {}

  if (fontFamily && fontFamily !== CUSTOM_PRESET_ID) {
    variables['--quickstart-font-family'] = fontFamily
  }

  if (headingFontFamily && headingFontFamily !== CUSTOM_PRESET_ID) {
    variables['--quickstart-heading-font-family'] = headingFontFamily
  }

  variables['--quickstart-gradient-bg-default']
    = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`

  if (bgColor && COLOR_REGEX.test(bgColor)) {
    variables['--quickstart-bg-color'] = bgColor
    variables['--quickstart-bg-image'] = 'none'
    variables['--quickstart-bg-logo-url'] = 'none'
    variables['--keycloak-bg-logo-url'] = 'none'
  }

  if (radiusEntry) {
    variables['--quickstart-border-radius'] = radiusEntry.px
    markers['--quickstart-border-radius'] = radiusEntry.value
  }

  if (shadowEntry) {
    variables['--quickstart-card-shadow'] = shadowEntry.css
    markers['--quickstart-card-shadow'] = shadowEntry.value
  }

  return { variables, markers }
}

/** Render a variable map as an explicit CSS selector block — used by export's mode-aware scoping. */
export function buildScopedQuickStartVariablesCss(selectors: string, result: QuickStartVariableMapResult): string {
  const variableEntries = Object.entries(result.variables)
  if (variableEntries.length === 0) {
    return ''
  }

  const lines = variableEntries.flatMap(([name, value]) => {
    const marker = result.markers[name]
    const markerLine = marker ? [`  ${buildQuickStartMarkerComment(name.replace('--quickstart-', '') as QuickStartMarkerKey, marker)}`] : []
    return [...markerLine, `  ${name}: ${value};`]
  })
  return `${selectors} {\n${lines.join('\n')}\n}`
}

export function buildQuickStartCssParts(options: QuickStartCssOptions): QuickStartCssParts {
  const {
    fontFamily = '',
    headingFontFamily = '',
    showRealmName,
    hasLogo = false,
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
  const { variables: quickStartRootVariableValues, markers: quickStartRootVariableMarkers } = buildQuickStartVariableMap(options)
  const rootVariablesCss = buildQuickStartRootCss(quickStartRootVariableValues, quickStartRootVariableMarkers)

  const rulesCss = `${
    !effectiveShowRealmName
      ? `
/* @kte:visibility-start:hide-realm-name */
/* Hide realm name */
#kc-realm-name,
.kc-realm-name {
  display: none !important;
}
/* @kte:visibility-end */
`
      : `
/* Show realm name — override theme defaults that may hide it */
#kc-realm-name,
.kc-realm-name {
  display: block !important;
}
`
  }${
    !showClientName
      ? `
/* @kte:visibility-start:hide-client-name */
/* Hide client name */
#kc-client-name,
.kc-client-name,
[data-kc-client="name"] {
  display: none !important;
}
/* @kte:visibility-end */
`
      : `
/* Show client name — override theme defaults that may hide it */
#kc-client-name,
.kc-client-name,
[data-kc-client="name"] {
  display: block !important;
}
`
  }${
    !showClientName && !effectiveShowRealmName
      ? `
/* @kte:visibility-start:hide-subtitle */
/* Hide subtitle row when both client and realm are disabled */
.subtitle {
  display: none !important;
}
${
  hasLogo
    ? ''
    : `/* v2's #kc-header-wrapper (PatternFly's .pf-v5-c-brand, sized for a logo image) keeps its own
   height/spacing even once both name spans inside it are display:none - collapse the wrapper
   (and its parent) too, or it renders as an empty styled box. A logo needs the wrapper to stay,
   since it renders into #kc-header-wrapper::before. */
#kc-header-wrapper,
#kc-header {
  display: none !important;
}`
}
/* @kte:visibility-end */
`
      : ''
  }${
    hasInfoMessage
      ? `
/* Show info message — override theme defaults that may hide it */
#kc-info-message.kcAlertClass,
.kc-info-message,
[data-kc-i18n-key="infoMessage"] {
  display: block !important;
}
`
      : `
/* @kte:visibility-start:hide-info-message */
/* Hide info message */
#kc-info-message.kcAlertClass,
.kc-info-message,
[data-kc-i18n-key="infoMessage"] {
  display: none !important;
}
/* @kte:visibility-end */
`
  }${
    showClientName || hasInfoMessage || (showRealmName !== undefined ? effectiveShowRealmName : false)
      ? ''
      : `
/* @kte:visibility-start:hide-client-container */
/* Hide client container */
#kc-client,
.kc-client {
  display: none !important;
}
/* @kte:visibility-end */
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
