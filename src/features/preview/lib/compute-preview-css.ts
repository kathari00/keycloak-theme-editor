import { generateAppliedAssetsCSS, generateFontFaceCSS, generateImageCSSVars } from '../../assets/font-css-generator'
import type { AppliedAssets, UploadedAsset } from '../../assets/types'
import { buildQuickStartCss } from '../../editor/lib/quick-start-css'

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
  quickStartCss: string
  uploadedFontsCss: string
  uploadedImagesCss: string
  appliedAssetsCss: string
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

  return {
    quickStartCss: buildQuickStartCss({
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
    }),
    uploadedFontsCss: generateFontFaceCSS(uploadedAssets),
    uploadedImagesCss: generateImageCSSVars(uploadedAssets),
    appliedAssetsCss: generateAppliedAssetsCSS(appliedAssets, uploadedAssets),
  }
}
