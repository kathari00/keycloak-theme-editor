import type { AppliedAssets, UploadedAsset } from '../assets/types'
import type { QuickSettings } from '../editor/stores/types'
import type { ThemeDocument } from './types'
import { generateAppliedAssetsCSS, generateFontFaceCSS, generateImageCSSVars } from '../assets/font-css-generator'
import { buildGoogleFontUrl, normalizeGoogleFontFamily } from '../assets/google-fonts'
import { buildQuickStartCssParts, COLOR_REGEX } from '../editor/lib/quick-start-css'

interface PreviewCssInput extends QuickSettings {
  uploadedAssets: UploadedAsset[]
  appliedAssets: AppliedAssets
}

export interface PreviewCssOutput {
  googleFontUrls: string[]
  quickStartCss: string
  uploadedFontsCss: string
  uploadedImagesCss: string
  appliedAssetsCss: string
}

export const EMPTY_PREVIEW_CSS: PreviewCssOutput = {
  googleFontUrls: [],
  quickStartCss: '',
  uploadedFontsCss: '',
  uploadedImagesCss: '',
  appliedAssetsCss: '',
}

function resolveGoogleFontUrl(fontFamilyCss: string): string {
  if (!fontFamilyCss)
    return ''
  const primary = fontFamilyCss.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '')
  if (!primary)
    return ''
  const normalized = normalizeGoogleFontFamily(primary)
  if (!normalized)
    return ''
  return buildGoogleFontUrl(normalized)
}

function getPreviewAppliedAssets(appliedAssets: AppliedAssets, bgColor: string): AppliedAssets {
  if (!bgColor || !COLOR_REGEX.test(bgColor)) {
    return appliedAssets
  }

  const { background: _background, ...appliedWithoutBackground } = appliedAssets
  return appliedWithoutBackground
}

export function computePreviewCss(input: PreviewCssInput): PreviewCssOutput {
  const {
    colorPresetPrimaryColor,
    colorPresetSecondaryColor,
    colorPresetFontFamily = '',
    colorPresetBgColor,
    colorPresetBorderRadius,
    colorPresetCardShadow,
    colorPresetHeadingFontFamily = '',
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
    uploadedAssets,
    appliedAssets,
  } = input

  const parts = buildQuickStartCssParts({
    primaryColor: colorPresetPrimaryColor,
    secondaryColor: colorPresetSecondaryColor,
    fontFamily: colorPresetFontFamily,
    bgColor: colorPresetBgColor,
    borderRadius: colorPresetBorderRadius,
    cardShadow: colorPresetCardShadow,
    headingFontFamily: colorPresetHeadingFontFamily,
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  })

  const googleFontUrls = [
    resolveGoogleFontUrl(colorPresetFontFamily),
    resolveGoogleFontUrl(colorPresetHeadingFontFamily),
  ].filter(Boolean)
  const uniqueUrls = [...new Set(googleFontUrls)]
  const previewAppliedAssets = getPreviewAppliedAssets(appliedAssets, colorPresetBgColor)

  return {
    googleFontUrls: uniqueUrls,
    quickStartCss: [parts.rootVariablesCss, parts.rulesCss].filter(Boolean).join('\n\n').trim(),
    uploadedFontsCss: generateFontFaceCSS(uploadedAssets),
    uploadedImagesCss: generateImageCSSVars(uploadedAssets),
    appliedAssetsCss: generateAppliedAssetsCSS(previewAppliedAssets, uploadedAssets),
  }
}

export function themeDocumentToPreviewCss(document: ThemeDocument): PreviewCssOutput {
  if (!document.isPresetTheme) {
    return EMPTY_PREVIEW_CSS
  }

  return computePreviewCss({
    ...document.quickSettings,
    uploadedAssets: document.assets.uploadedAssets,
    appliedAssets: document.assets.appliedAssets,
  })
}
