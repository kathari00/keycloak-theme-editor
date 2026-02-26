import { useMemo } from 'react'
import { buildGoogleFontOptions } from '../../features/assets/google-fonts'
import { CUSTOM_PRESET_ID } from '../../features/editor/quick-start-css'
import {
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
  const {
    colorPresetId: effectivePresetId,
    colorPresetPrimaryColor: effectivePrimaryColor,
    colorPresetSecondaryColor: effectiveSecondaryColor,
    colorPresetFontFamily: effectiveFontFamily,
    colorPresetBgColor: effectiveBgColor,
    colorPresetBorderRadius: effectiveBorderRadius,
    colorPresetCardShadow: effectiveCardShadow,
    colorPresetHeadingFontFamily: effectiveHeadingFontFamily,
  } = useQuickStartColorsState()
  const {
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  } = useQuickStartContentState()

  const fontOptions = useMemo<FontOption[]>(() => {
    const googleOptions = buildGoogleFontOptions().map(option => ({
      value: option.id,
      label: option.label,
    }))
    const uploadedOptions = uploadedAssets
      .filter(asset => asset.category === 'font' && asset.fontFamily)
      .map(asset => ({
        value: `'${asset.fontFamily}', sans-serif`,
        label: `${asset.fontFamily} (Uploaded)`,
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
