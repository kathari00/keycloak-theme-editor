import type { AppliedAssets, UploadedAsset } from '../../assets/types'
import { generateAppliedAssetsCSS, generateFontFaceCSS, generateImageCSSVars } from '../../assets/font-css-generator'
import { buildGoogleFontUrl, normalizeGoogleFontFamily } from '../../assets/google-fonts'
import { buildQuickStartCssParts } from '../../editor/lib/quick-start-css'

interface PreviewCssInput {
  primaryColor: string
  secondaryColor: string
  fontFamily?: string
  bgColor: string
  borderRadius: 'sharp' | 'rounded' | 'pill'
  cardShadow: 'none' | 'subtle' | 'strong'
  headingFontFamily?: string
  showClientName: boolean
  showRealmName: boolean
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
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

export function computePreviewCss(input: PreviewCssInput): PreviewCssOutput {
  const {
    primaryColor,
    secondaryColor,
    fontFamily = '',
    bgColor,
    borderRadius,
    cardShadow,
    headingFontFamily = '',
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
    uploadedAssets,
    appliedAssets,
  } = input

  const parts = buildQuickStartCssParts({
    primaryColor,
    secondaryColor,
    fontFamily,
    bgColor,
    borderRadius,
    cardShadow,
    headingFontFamily,
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  })

  const googleFontUrls = [
    resolveGoogleFontUrl(fontFamily),
    resolveGoogleFontUrl(headingFontFamily),
  ].filter(Boolean)
  const uniqueUrls = [...new Set(googleFontUrls)]

  return {
    googleFontUrls: uniqueUrls,
    quickStartCss: [parts.rootVariablesCss, parts.rulesCss].filter(Boolean).join('\n\n').trim(),
    uploadedFontsCss: generateFontFaceCSS(uploadedAssets),
    uploadedImagesCss: generateImageCSSVars(uploadedAssets),
    appliedAssetsCss: generateAppliedAssetsCSS(appliedAssets, uploadedAssets),
  }
}
