import { useMemo } from 'react'
import { useStore } from 'zustand'
import { buildGoogleFontOptions } from '../../features/assets/google-fonts'
import { CUSTOM_PRESET_ID } from '../../features/editor/quick-start-css'
import { presetStore } from '../../features/editor/stores/preset-store'
import {
  useDarkModeState,
  usePresetState,
  useQuickStartColorsState,
  useQuickStartContentState,
  useUploadedAssetsState,
} from '../../features/editor/use-editor'

function formatFontLabelFromValue(fontValue: string): string {
  const first = fontValue.split(',')[0]?.trim() || fontValue
  return first.replace(/^['"]|['"]$/g, '')
}

export interface FontOption {
  value: string
  label: string
}

export function useQuickStartSettings() {
  const { uploadedAssets } = useUploadedAssetsState()
  const { selectedThemeId } = usePresetState()
  const { isDarkMode } = useDarkModeState()
  const {
    colorPresetId: presetId,
    colorPresetPrimaryColor: primaryColor,
    colorPresetSecondaryColor: secondaryColor,
    colorPresetFontFamily: fontFamily,
    colorPresetBgColor: bgColor,
    colorPresetBorderRadius: borderRadius,
    colorPresetCardShadow: cardShadow,
    colorPresetHeadingFontFamily: headingFontFamily,
  } = useQuickStartColorsState()
  const {
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  } = useQuickStartContentState()

  const quickSettingsKey = `${selectedThemeId}::${isDarkMode ? 'dark' : 'light'}`
  const activeModeQuickSettings = useStore(presetStore, state => state.presetQuickSettings[quickSettingsKey])

  const effectivePresetId = activeModeQuickSettings?.colorPresetId ?? presetId
  const effectivePrimaryColor = activeModeQuickSettings?.colorPresetPrimaryColor ?? primaryColor
  const effectiveSecondaryColor = activeModeQuickSettings?.colorPresetSecondaryColor ?? secondaryColor
  const effectiveFontFamily = activeModeQuickSettings?.colorPresetFontFamily ?? fontFamily
  const effectiveBgColor = activeModeQuickSettings?.colorPresetBgColor ?? bgColor
  const effectiveBorderRadius = activeModeQuickSettings?.colorPresetBorderRadius ?? borderRadius
  const effectiveCardShadow = activeModeQuickSettings?.colorPresetCardShadow ?? cardShadow
  const effectiveHeadingFontFamily = activeModeQuickSettings?.colorPresetHeadingFontFamily ?? headingFontFamily

  const fontOptions = useMemo<FontOption[]>(() => {
    const googleOptions = buildGoogleFontOptions().map(option => ({
      value: option.id,
      label: option.label,
    }))
    const uploadedOptions = uploadedAssets
      .filter(a => a.category === 'font' && a.fontFamily)
      .map(a => ({
        value: `'${a.fontFamily}', sans-serif`,
        label: `${a.fontFamily} (Uploaded)`,
      }))
    const options: FontOption[] = [
      { value: CUSTOM_PRESET_ID, label: 'Default (Keycloak)' },
      ...uploadedOptions,
      ...googleOptions,
    ]

    const knownValues = new Set(options.map(option => option.value))
    ;[effectiveFontFamily, effectiveHeadingFontFamily].forEach((selectedFont) => {
      if (!selectedFont || knownValues.has(selectedFont)) {
        return
      }

      options.push({
        value: selectedFont,
        label: `${formatFontLabelFromValue(selectedFont)} (Current)`,
      })
      knownValues.add(selectedFont)
    })

    return options
  }, [uploadedAssets, effectiveFontFamily, effectiveHeadingFontFamily])

  return {
    selectedThemeId,
    effectivePresetId,
    effectivePrimaryColor,
    effectiveSecondaryColor,
    effectiveFontFamily,
    effectiveBgColor,
    effectiveBorderRadius,
    effectiveCardShadow,
    effectiveHeadingFontFamily,
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
    fontOptions,
  }
}
