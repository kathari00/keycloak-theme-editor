import type { QuickSettingsMode } from '../lib/quick-settings'
import type { PresetState, QuickSettings } from '../stores/types'
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

export const DEFAULT_QUICK_START_EXTRAS: Omit<QuickStartExtrasState, 'colorPresetBgColor' | 'colorPresetCardShadow'> = {
  colorPresetBorderRadius: 'rounded',
  colorPresetHeadingFontFamily: CUSTOM_PRESET_ID,
  showClientName: false,
  showRealmName: true,
  infoMessage: '',
  imprintUrl: '',
  dataProtectionUrl: '',
}

export function readQuickStartVariable(cssText: string, variableName: string): string {
  return findFirstDeclarationValue(cssText, variableName)
}

export function getQuickStartVariableNameForMode(mode: QuickSettingsMode, baseVariableName: string): string {
  return mode === 'dark' ? `${baseVariableName}-dark` : baseVariableName
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

export function buildThemeQuickStartDefaults(themeCss: string, mode: QuickSettingsMode): {
  colorPresetId: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  extras: QuickStartExtrasUpdate
} {
  const primaryColor = readQuickStartVariable(themeCss, getQuickStartVariableNameForMode(mode, '--quickstart-primary-color'))
  const secondaryColor = readQuickStartVariable(themeCss, '--quickstart-secondary-color')
  const fontFamilyRaw = readQuickStartVariable(themeCss, '--quickstart-font-family')
  const fontFamily = fontFamilyRaw.includes('var(') ? '' : fontFamilyRaw
  const bgColor = readQuickStartVariable(themeCss, getQuickStartVariableNameForMode(mode, '--quickstart-bg-color'))
  const borderRadiusValue
    = readQuickStartVariable(themeCss, '--quickstart-border-radius')
      || readQuickStartVariable(themeCss, '--quickstart-control-border-radius-default')
  const cardShadowValue
    = readQuickStartVariable(themeCss, '--quickstart-card-shadow')
      || readQuickStartVariable(themeCss, '--quickstart-card-shadow-default')
  return {
    colorPresetId: CUSTOM_PRESET_ID,
    primaryColor,
    secondaryColor,
    fontFamily,
    extras: {
      ...DEFAULT_QUICK_START_EXTRAS,
      colorPresetBgColor: bgColor,
      colorPresetBorderRadius: mapQuickStartBorderRadius(borderRadiusValue),
      colorPresetCardShadow: mapQuickStartCardShadow(cardShadowValue),
    },
  }
}

export function buildQuickSettingsSnapshot(state: PresetState): QuickSettings {
  return {
    colorPresetId: state.colorPresetId,
    colorPresetPrimaryColor: state.colorPresetPrimaryColor,
    colorPresetSecondaryColor: state.colorPresetSecondaryColor,
    colorPresetFontFamily: state.colorPresetFontFamily,
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
