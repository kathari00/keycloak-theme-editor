import type { QuickSettingsMode } from '../lib/quick-settings'
import type { PresetState, QuickSettingsStyle } from '../stores/types'
import { CUSTOM_PRESET_ID } from '../lib/quick-start-css'
import {
  extractQuickStartCssForMode,
  mapQuickStartBorderRadius,
  mapQuickStartCardShadow,
  normalizeEditableQuickStartValue,
  readQuickStartColorVariable,
  readQuickStartVariable,
} from '../lib/quick-start-css-parser'

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
  | 'imprintLabel'
  | 'dataProtectionLabel'
>

export type QuickStartExtrasUpdate = Partial<QuickStartExtrasState>

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
  // Scope the marker lookup to this mode's own rule blocks, so a dark-mode @kte: marker can't
  // be picked up while reading light-mode defaults (or vice versa) from the combined CSS.
  const cssForMode = extractQuickStartCssForMode(themeCss, mode)
  return {
    colorPresetId: CUSTOM_PRESET_ID,
    colorPresetPrimaryColor: readQuickStartColorVariable(themeCss, 'primary-color', mode),
    colorPresetSecondaryColor: readQuickStartColorVariable(themeCss, 'secondary-color', mode),
    colorPresetFontFamily: normalizeEditableQuickStartValue(readQuickStartVariable(themeCss, '--quickstart-font-family')) || CUSTOM_PRESET_ID,
    colorPresetBgColor: bgColor,
    colorPresetBorderRadius: mapQuickStartBorderRadius(cssForMode, borderRadiusValue),
    colorPresetCardShadow: mapQuickStartCardShadow(cssForMode, cardShadowValue),
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
    imprintLabel: state.imprintLabel,
    dataProtectionLabel: state.dataProtectionLabel,
  }
}

export function withoutUndefinedValues<T extends Record<string, unknown>>(value: Partial<T>): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>
}
