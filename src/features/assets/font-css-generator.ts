import type { AppliedAssets, UploadedAsset } from './types'
import { getGoogleFontFamilyFromId, normalizeGoogleFontFamily } from './google-fonts'
import { REMOVED_ASSET_ID } from './types'

type AssetUrlResolver = (asset: UploadedAsset) => string

function getFontFormat(mimeType: string, filename: string): string {
  if (mimeType.includes('woff2') || filename.endsWith('.woff2'))
    return 'woff2'
  if (mimeType.includes('woff') || filename.endsWith('.woff'))
    return 'woff'
  if (mimeType.includes('ttf') || filename.endsWith('.ttf'))
    return 'truetype'
  if (mimeType.includes('otf') || filename.endsWith('.otf'))
    return 'opentype'
  return 'woff2'
}

function resolveAppliedFontFamily(
  appliedAssets: AppliedAssets,
  uploadedAssets: UploadedAsset[],
): string | null {
  if (!appliedAssets.bodyFont)
    return null
  const uploadedFont = uploadedAssets.find(a => a.id === appliedAssets.bodyFont)
  if (uploadedFont?.fontFamily) {
    return uploadedFont.fontFamily
  }

  const googleFamily
    = getGoogleFontFamilyFromId(appliedAssets.bodyFont)
      || normalizeGoogleFontFamily(appliedAssets.bodyFont)

  return googleFamily
}

function resolveExportImageUrl(asset: UploadedAsset): string {
  const folder
    = asset.category === 'background'
      ? 'backgrounds'
      : asset.category === 'logo'
        ? 'logos'
        : 'assets'
  return `../img/${folder}/${asset.name}`
}

function generateFontFaceCssWithResolver(fonts: UploadedAsset[], resolveAssetUrl: AssetUrlResolver): string {
  return fonts
    .filter(asset => asset.category === 'font')
    .map((font) => {
      const format = getFontFormat(font.mimeType, font.name)
      const assetUrl = resolveAssetUrl(font)
      return `@font-face {
  font-family: '${font.fontFamily}';
  src: url(${assetUrl}) format('${format}');
  font-weight: ${font.fontWeight || 'normal'};
  font-style: ${font.fontStyle || 'normal'};
}`
    })
    .join('\n\n')
}

/**
 * Generate @font-face CSS rules with data URLs for canvas preview
 */
export function generateFontFaceCSS(fonts: UploadedAsset[]): string {
  return generateFontFaceCssWithResolver(fonts, getAssetDataUrl)
}

/**
 * Generate @font-face CSS rules with relative URLs for export
 */
export function generateExportFontCSS(fonts: UploadedAsset[]): string {
  return generateFontFaceCssWithResolver(fonts, asset => `'../fonts/${asset.name}'`)
}

/**
 * Get data URL for an asset
 */
export function getAssetDataUrl(asset: UploadedAsset): string {
  return `data:${asset.mimeType};base64,${asset.base64Data}`
}

/**
 * Convert base64 to Blob for export
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteArrays: Uint8Array[] = []

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512)
    const byteNumbers: number[] = []
    for (let i = 0; i < slice.length; i++) {
      byteNumbers.push(slice.charCodeAt(i))
    }
    byteArrays.push(new Uint8Array(byteNumbers))
  }

  return new Blob(byteArrays, { type: mimeType })
}

/**
 * Generate CSS variable name from asset name
 */
function generateCssVarName(asset: UploadedAsset): string {
  const baseName = asset.name
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-z0-9]/gi, '-') // Replace non-alphanumeric with dash
    .replace(/-+/g, '-') // Collapse multiple dashes
    .toLowerCase()

  const prefix
    = asset.category === 'background'
      ? 'bg'
      : asset.category === 'logo'
        ? 'logo'
        : asset.category === 'image'
          ? 'img'
          : 'asset'
  return `--uploaded-${prefix}-${baseName}`
}

export function getUploadedImageCssVarName(asset: UploadedAsset): string | null {
  if (asset.category !== 'background' && asset.category !== 'logo' && asset.category !== 'image')
    return null
  return generateCssVarName(asset)
}

function getImageAssets(images: UploadedAsset[]): UploadedAsset[] {
  return images.filter(
    asset => asset.category === 'background' || asset.category === 'logo' || asset.category === 'image',
  )
}

function generateImageCssVarsWithResolver(images: UploadedAsset[], resolveAssetUrl: AssetUrlResolver): string {
  const imageAssets = getImageAssets(images)
  if (imageAssets.length === 0)
    return ''

  const vars = imageAssets
    .map((asset) => {
      const varName = generateCssVarName(asset)
      const assetUrl = resolveAssetUrl(asset)
      return `  ${varName}: url("${assetUrl}");`
    })
    .join('\n')

  return `:root {\n${vars}\n}`
}

/**
 * Generate CSS custom properties for uploaded images (backgrounds and logos)
 */
export function generateImageCSSVars(images: UploadedAsset[]): string {
  return generateImageCssVarsWithResolver(images, getAssetDataUrl)
}

/**
 * Generate CSS for export with relative URLs for images
 */
export function generateExportImageCSS(images: UploadedAsset[]): string {
  return generateImageCssVarsWithResolver(images, resolveExportImageUrl)
}

function generateAppliedAssetsCssWithResolver(
  appliedAssets: AppliedAssets,
  uploadedAssets: UploadedAsset[],
  resolveAssetUrl: AssetUrlResolver,
  options?: { suppressV2HeaderWrapperLogo?: boolean },
): string {
  const cssRules: string[] = []
  const extraRules: string[] = []

  // Background image override
  if (appliedAssets.background) {
    if (appliedAssets.background === REMOVED_ASSET_ID) {
      cssRules.push(`  --quickstart-bg-logo-url: none;`)
      cssRules.push(`  --keycloak-bg-logo-url: none;`)
      extraRules.push(`.kcLogin {\n  --quickstart-bg-logo-url: none;\n  --keycloak-bg-logo-url: none;\n}`)
      extraRules.push(`html body .pf-v5-c-login {\n  background-image: none;\n}`)
    }
    else {
      const bgAsset = uploadedAssets.find(asset => asset.id === appliedAssets.background)
      if (bgAsset) {
        const bgUrl = resolveAssetUrl(bgAsset)
        cssRules.push(`  --quickstart-bg-image: url("${bgUrl}");`)
        cssRules.push(`  --quickstart-bg-logo-url: url("${bgUrl}");`)
        cssRules.push(`  --keycloak-bg-logo-url: url("${bgUrl}");`)
        extraRules.push(`.kcLogin {\n  --quickstart-bg-image: url("${bgUrl}");\n  --quickstart-bg-logo-url: url("${bgUrl}");\n  --keycloak-bg-logo-url: url("${bgUrl}");\n}`)
        extraRules.push(
          `body:not(#\\9), html:not(#\\9) {\n  background: url("${bgUrl}") no-repeat center center fixed;\n  background-size: cover;\n}`,
        )
      }
    }
  }

  // Logo override
  if (appliedAssets.logo) {
    if (appliedAssets.logo === REMOVED_ASSET_ID) {
      cssRules.push(`  --quickstart-logo-url: none;`)
      cssRules.push(`  --keycloak-logo-url: none;`)
    }
    else {
      const logoAsset = uploadedAssets.find(asset => asset.id === appliedAssets.logo)
      if (logoAsset) {
        const logoUrl = resolveAssetUrl(logoAsset)
        cssRules.push(`  --quickstart-logo-url: url("${logoUrl}");`)
        cssRules.push(`  --keycloak-logo-url: url("${logoUrl}");`)
        cssRules.push(`  --kc-applied-logo-url: url("${logoUrl}");`)
        extraRules.push(
          `.kc-logo-text {\n  background-image: url("${logoUrl}");\n  background-repeat: no-repeat;\n  background-size: contain;\n  background-position: center;\n}`,
        )
        extraRules.push(
          `#kc-header-wrapper::before {\n  content: \"\";\n  display: block;\n  background-image: url("${logoUrl}");\n  background-repeat: no-repeat;\n  background-size: contain;\n  background-position: center;\n  height: var(--quickstart-logo-height, 63px);\n  width: var(--quickstart-logo-width, 300px);\n  max-width: 100%;\n  margin: 0 auto;\n}`,
        )
        if (options?.suppressV2HeaderWrapperLogo) {
          extraRules.push(
            `html.login-pf #kc-header-wrapper::before {\n  content: none;\n  display: none;\n}`,
          )
        }
      }
    }
  }

  // Body font override
  const appliedFontFamily = resolveAppliedFontFamily(appliedAssets, uploadedAssets)
  if (appliedFontFamily) {
    cssRules.push(`  --pf-v5-global--FontFamily--text: '${appliedFontFamily}', sans-serif;`)
    cssRules.push(`  --pf-v5-global--FontFamily--sans-serif: '${appliedFontFamily}', sans-serif;`)
    extraRules.push(`body {\n  font-family: '${appliedFontFamily}', sans-serif;\n}`)
  }

  if (cssRules.length === 0 && extraRules.length === 0)
    return ''

  const rootBlock = cssRules.length > 0
    ? `:root {\n${cssRules.join('\n')}\n}`
    : ''
  const extrasBlock = extraRules.length > 0 ? extraRules.join('\n\n') : ''

  return [rootBlock, extrasBlock].filter(Boolean).join('\n\n')
}

/**
 * Generate CSS that overrides Keycloak theme variables with applied assets
 */
export function generateAppliedAssetsCSS(
  appliedAssets: AppliedAssets,
  uploadedAssets: UploadedAsset[],
): string {
  return generateAppliedAssetsCssWithResolver(appliedAssets, uploadedAssets, getAssetDataUrl)
}

/**
 * Generate CSS for export with applied asset overrides using relative URLs
 */
export function generateExportAppliedCSS(
  appliedAssets: AppliedAssets,
  uploadedAssets: UploadedAsset[],
): string {
  return generateAppliedAssetsCssWithResolver(appliedAssets, uploadedAssets, resolveExportImageUrl, {
    suppressV2HeaderWrapperLogo: true,
  })
}
