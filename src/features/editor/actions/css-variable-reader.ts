import type { QuickSettingsMode } from '../lib/quick-settings'
import type { PresetState, QuickSettingsStyle } from '../stores/types'
import { findFirstDeclarationValue } from '../../../lib/css-ast'
import { CUSTOM_PRESET_ID } from '../lib/quick-start-css'

export type QuickStartExtrasState = Pick<
  PresetState,
  | 'colorPresetBgColor'
  | 'colorPresetBorderRadius'
  | 'colorPresetCardShadow'
  | 'colorPresetHeadingFontFamily'
  | 'showClientName'
  | 'showRealmName'
  | 'infoMessage'
  | 'imprintUrl'
  | 'dataProtectionUrl'
>

export type QuickStartExtrasUpdate = Partial<QuickStartExtrasState>

export function readQuickStartVariable(cssText: string, variableName: string): string {
  return findFirstDeclarationValue(cssText, variableName)
}

function normalizeEditableQuickStartValue(value: string): string {
  const normalized = value.trim()
  return normalized.startsWith('var(') ? '' : normalized
}

function readQuickStartColorVariable(
  cssText: string,
  suffix: 'primary-color' | 'secondary-color' | 'bg-color',
  mode: QuickSettingsMode,
): string {
  const candidates = mode === 'dark'
    ? [`--quickstart-${suffix}-dark`, `--quickstart-${suffix}-light`]
    : [`--quickstart-${suffix}-light`, `--quickstart-${suffix}-dark`]

  for (const candidate of candidates) {
    const value = normalizeEditableQuickStartValue(readQuickStartVariable(cssText, candidate))
    if (value) {
      return value
    }
  }

  return ''
}

export function mapQuickStartBorderRadius(value: string): PresetState['colorPresetBorderRadius'] {
  const normalized = value.trim().toLowerCase()
  if (normalized === '0' || normalized === '0px') {
    return 'sharp'
  }
  if (normalized === '24px') {
    return 'pill'
  }
  return 'rounded'
}

export function mapQuickStartCardShadow(value: string): PresetState['colorPresetCardShadow'] {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ')
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

export function buildThemeQuickStartDefaults(themeCss: string, mode: QuickSettingsMode = 'light'): {
  colorPresetId: QuickSettingsStyle['colorPresetId']
  colorPresetPrimaryColor: QuickSettingsStyle['colorPresetPrimaryColor']
  colorPresetSecondaryColor: QuickSettingsStyle['colorPresetSecondaryColor']
  colorPresetFontFamily: QuickSettingsStyle['colorPresetFontFamily']
  colorPresetBgColor: QuickSettingsStyle['colorPresetBgColor']
  colorPresetBorderRadius: QuickSettingsStyle['colorPresetBorderRadius']
  colorPresetCardShadow: QuickSettingsStyle['colorPresetCardShadow']
  colorPresetHeadingFontFamily: QuickSettingsStyle['colorPresetHeadingFontFamily']
} {
  const bgColor = readQuickStartColorVariable(themeCss, 'bg-color', mode)
  const borderRadiusValue = readQuickStartVariable(themeCss, '--quickstart-border-radius')
  const cardShadowValue = readQuickStartVariable(themeCss, '--quickstart-card-shadow')
  return {
    colorPresetId: CUSTOM_PRESET_ID,
    colorPresetPrimaryColor: readQuickStartColorVariable(themeCss, 'primary-color', mode),
    colorPresetSecondaryColor: readQuickStartColorVariable(themeCss, 'secondary-color', mode),
    colorPresetFontFamily: normalizeEditableQuickStartValue(readQuickStartVariable(themeCss, '--quickstart-font-family')) || CUSTOM_PRESET_ID,
    colorPresetBgColor: bgColor,
    colorPresetBorderRadius: mapQuickStartBorderRadius(borderRadiusValue),
    colorPresetCardShadow: mapQuickStartCardShadow(cardShadowValue),
    colorPresetHeadingFontFamily: normalizeEditableQuickStartValue(readQuickStartVariable(themeCss, '--quickstart-heading-font-family')) || CUSTOM_PRESET_ID,
  }
}

export function getQuickStartExtrasState(state: PresetState): QuickStartExtrasState {
  return {
    colorPresetBgColor: state.colorPresetBgColor,
    colorPresetBorderRadius: state.colorPresetBorderRadius,
    colorPresetCardShadow: state.colorPresetCardShadow,
    colorPresetHeadingFontFamily: state.colorPresetHeadingFontFamily,
    showClientName: state.showClientName,
    showRealmName: state.showRealmName,
    infoMessage: state.infoMessage,
    imprintUrl: state.imprintUrl,
    dataProtectionUrl: state.dataProtectionUrl,
  }
}

export function withoutUndefinedValues<T extends Record<string, unknown>>(value: Partial<T>): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>
}
