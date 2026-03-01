import type { AppliedAssets, UploadedAsset } from '../assets/types'
import type { QuickSettings } from '../editor/stores/types'
import type { EditorCssContext, ImportedQuickSettingsByMode, ThemeExportPayload } from './types'
import {
  generateExportAppliedCSS,
  generateExportFontCSS,
  generateExportImageCSS,
} from '../assets/font-css-generator'
import {
  buildGoogleFontsImportCSS,
  extractGoogleFontsFromCss,
  getGoogleFontFamilyFromId,
  normalizeGoogleFontFamily,
  toGoogleFontId,
} from '../assets/google-fonts'
import { REMOVED_ASSET_ID } from '../assets/types'
import {
  BORDER_RADIUS_OPTIONS,
  buildQuickStartNonVariableCss,
  CARD_SHADOW_OPTIONS,
  COLOR_REGEX,
  CUSTOM_PRESET_ID,
} from '../editor/quick-start-css'
import { themeResourcePath } from '../presets/types'

/** Remove editor-only data-kc-state attributes from exported templates */
export function stripDataKcStateAttributes(markup: string): string {
  if (!markup)
    return ''
  if (!markup.includes('data-kc-state'))
    return markup

  return markup
    .replace(/\sdata-kc-state="[^"]*"/g, '')
    .replace(/\sdata-kc-state='[^']*'/g, '')
}

/**
 * Get effective applied assets with default background fallback.
 * Only auto-applies the default Keycloak background for v2 base themes.
 * Non-v2 presets (e.g. Modern Gradient) define their own backgrounds via preset
 * CSS, so injecting the default image would overwrite them in the cascade.
 */
export function getEffectiveAppliedAssets(
  appliedAssets: AppliedAssets,
  uploadedAssets: UploadedAsset[],
  baseId: 'base' | 'v2' = 'v2',
): AppliedAssets {
  const next: AppliedAssets = { ...appliedAssets }
  if (!next.background) {
    if (baseId === 'v2') {
      // For v2, auto-apply default Keycloak background
      const defaultBackground = uploadedAssets.find(
        asset => asset.category === 'background' && asset.isDefault,
      )
      if (defaultBackground) {
        next.background = defaultBackground.id
      }
    }
    else {
      // For non-v2 presets, explicitly suppress default background
      // so generateExportAppliedCSS emits background-image suppression vars.
      next.background = REMOVED_ASSET_ID
    }
  }
  return next
}

/** Extract last path segment as filename */
export function getFilename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || ''
}

/** Build Google Fonts @import CSS from user CSS + applied assets */
function getGoogleFontsCss(cssText: string, applied: AppliedAssets): string {
  const families = new Set(extractGoogleFontsFromCss(cssText))
  const appliedGoogleFont = getGoogleFontFamilyFromId(applied.bodyFont)
  if (appliedGoogleFont) {
    families.add(appliedGoogleFont)
  }
  return buildGoogleFontsImportCSS(Array.from(families))
}

/** Generate JAR's META-INF/keycloak-themes.json */
export function generateKeycloakThemesJson(themeName: string): string {
  return JSON.stringify({
    themes: [{
      name: themeName,
      types: ['login'],
    }],
  }, null, 2)
}

/** Fetch the correct template.ftl for a theme */
export async function fetchTemplateFtl(themeId: string): Promise<string> {
  const response = await fetch(themeResourcePath(themeId, 'template.ftl'))
  if (!response.ok) {
    throw new Error(`Failed to load template.ftl for "${themeId}" (${response.status})`)
  }
  return await response.text()
}

/** Fetch the optional footer.ftl for a theme */
export async function fetchFooterFtl(themeId: string): Promise<string | null> {
  const response = await fetch(themeResourcePath(themeId, 'footer.ftl'))
  if (!response.ok) {
    return null
  }
  return await response.text()
}

/** Reverse-engineer applied asset references from CSS text */
export function parseAppliedAssetsFromCss(
  cssText: string,
  assets: UploadedAsset[],
): { applied: AppliedAssets, cleanedCss: string } {
  const applied: AppliedAssets = {}
  let cleanedCss = cssText || ''

  const normalizeAssetName = (value: string): string => {
    return decodeURIComponent(value).split('?')[0].split('#')[0]
  }

  const findAssetByCssReference = (category: UploadedAsset['category'], name: string) => {
    return assets.find(a => a.category === category && a.name.toLowerCase() === name.toLowerCase())
  }

  // Parse background
  const bgNoneMatch = cssText.match(/--(?:keycloak|quickstart)-bg-logo-url\s*:\s*none\b/i)
  if (bgNoneMatch) {
    applied.background = REMOVED_ASSET_ID
  }
  else {
    const bgVarMatch = cssText.match(/--(?:keycloak|quickstart)-bg-logo-url\s*:\s*url\(["']?\.\.\/img\/backgrounds\/([^"']+)["']?\)/i)
    const bgNameRaw = bgVarMatch?.[1]
    if (bgNameRaw) {
      const bgName = normalizeAssetName(bgNameRaw)
      const bgAsset = findAssetByCssReference('background', bgName)
      if (bgAsset) {
        applied.background = bgAsset.id
      }
    }
  }
  if (!applied.background) {
    const bgRuleMatch = cssText.match(/background(?:-image)?\s*:\s*url\(["']?(?:\.\.\/img\/backgrounds\/)?([^"')]+)["']?\)/i)
    const bgNameRaw = bgRuleMatch?.[1]
    if (bgNameRaw) {
      const bgAsset = findAssetByCssReference('background', normalizeAssetName(bgNameRaw))
      if (bgAsset) {
        applied.background = bgAsset.id
      }
    }
  }

  // Parse logo
  const logoNoneMatch = cssText.match(/--(?:keycloak|quickstart)-logo-url\s*:\s*none\b/i)
  if (logoNoneMatch) {
    applied.logo = REMOVED_ASSET_ID
  }
  else {
    const logoVarMatch = cssText.match(/--(?:keycloak|quickstart)-logo-url\s*:\s*url\(["']?\.\.\/img\/logos\/([^"']+)["']?\)/i)
    const logoNameRaw = logoVarMatch?.[1]
    if (logoNameRaw) {
      const logoName = normalizeAssetName(logoNameRaw)
      const logoAsset = findAssetByCssReference('logo', logoName)
      if (logoAsset) {
        applied.logo = logoAsset.id
      }
    }
  }

  // Parse body font
  const quickStartFontVarMatch = cssText.match(/--quickstart-font-family\s*:\s*['"]?([^"',;]+)['"]?/i)
  const fontVarMatch = cssText.match(/--pf-v5-global--FontFamily--(?:text|sans-serif)\s*:\s*['"]?([^"',;]+)['"]?/i)
  const bodyMatch = cssText.match(/body\s*\{[^}]*font-family\s*:\s*['"]?([^"',;]+)['"]?/i)
  const fontFamily = (quickStartFontVarMatch?.[1] || fontVarMatch?.[1] || bodyMatch?.[1])?.trim()
  if (fontFamily) {
    const fontAsset = assets.find(a => a.category === 'font' && a.fontFamily === fontFamily)
    if (fontAsset) {
      applied.bodyFont = fontAsset.id
    }
    else {
      const googleFamily = normalizeGoogleFontFamily(fontFamily)
      if (googleFamily) {
        applied.bodyFont = toGoogleFontId(googleFamily)
      }
    }
  }

  cleanedCss = cleanedCss
    .replace(/(?:body:not\(#\\9\)\s*,\s*html:not\(#\\9\)|html:not\(#\\9\)\s*,\s*body:not\(#\\9\))\s*\{[^{}]*background\s*:\s*url\([^)]*\)[^{}]*\}\s*/gi, '')
    .replace(/(?:body\s*,\s*html|html\s*,\s*body)\s*\{[^{}]*background\s*:\s*url\([^)]*\.\.\/img\/backgrounds\/[^)]*\)[^{}]*\}\s*/gi, '')
    .replace(/(?:body\s*,\s*html|html\s*,\s*body|body|html)\s*\{[^{}]*background(?:-image)?\s*:\s*url\([^)]*\)[^{}]*\}\s*/gi, '')
    .replace(/body[^{}]*\.kcLogin\s*\{[^{}]*background(?:-image)?\s*:[^{}]*\}\s*/gi, '')
    .replace(/html\s+body\s+\.pf-v5-c-login\s*\{[^{}]*background-image\s*:\s*none[^{}]*\}\s*/gi, '')
    .replace(/--(?:keycloak|quickstart)-bg-logo-url\s*:\s*none\s*;?/gi, '')
    .replace(/--(?:keycloak|quickstart)-bg-logo-url\s*:\s*url\([^)]*\)\s*;?/gi, '')
    .replace(/--(?:keycloak|quickstart)-logo-url\s*:\s*none\s*;?/gi, '')
    .replace(/--(?:keycloak|quickstart)-logo-url\s*:\s*url\([^)]*\)\s*;?/gi, '')

  return { applied, cleanedCss }
}

/** Assemble the full export payload from all CSS sources */
export function assembleExportPayload(params: {
  sourceCss: string
  uploadedAssets: UploadedAsset[]
  appliedAssets: AppliedAssets
  editorCssContext: EditorCssContext
  baseId?: 'base' | 'v2'
}): ThemeExportPayload {
  const { sourceCss, uploadedAssets, appliedAssets, editorCssContext, baseId = 'v2' } = params

  const uploadedFonts = uploadedAssets.filter(a => a.category === 'font')
  const uploadedBackgrounds = uploadedAssets.filter(a => a.category === 'background')
  const uploadedLogos = uploadedAssets.filter(a => a.category === 'logo')
  const uploadedFavicons = uploadedAssets.filter(a => a.category === 'favicon')
  const uploadedImages = uploadedAssets.filter(a => a.category === 'image')
  const uploadedVarImages = [...uploadedBackgrounds, ...uploadedLogos, ...uploadedImages]

  const uploadedFontsCss = generateExportFontCSS(uploadedFonts)
  const uploadedImagesCss = generateExportImageCSS(uploadedVarImages)
  const effectiveAppliedAssets = getEffectiveAppliedAssets(appliedAssets, uploadedAssets, baseId)
  const appliedAssetsCss = generateExportAppliedCSS(effectiveAppliedAssets, uploadedAssets)
  const googleFontsCss = getGoogleFontsCss(sourceCss, appliedAssets)

  const generatedCss = [
    editorCssContext.presetCss,
    editorCssContext.colorPresetCss,
    googleFontsCss,
    uploadedFontsCss,
    uploadedImagesCss,
    appliedAssetsCss,
  ].filter(Boolean).join('\n\n')

  const appliedFavicon = appliedAssets.favicon
    ? uploadedAssets.find(a => a.id === appliedAssets.favicon)
    : uploadedFavicons[0]

  return {
    // Keep generated CSS as-is for export stability.
    // Stripping selectors at this stage can unintentionally rewrite valid
    // theme rules after editor modifications.
    generatedCss,
    uploadedFonts,
    uploadedBackgrounds,
    uploadedLogos,
    uploadedImages,
    appliedFavicon,
  }
}

// --- Quick-start CSS export utilities ---

const QUICK_START_LIGHT_VARIABLE_SCOPE = `html:not(.pf-v5-theme-dark):not(.kcDarkModeClass) body:not(.pf-v5-theme-dark):not(.kcDarkModeClass),
html:not(.pf-v5-theme-dark):not(.kcDarkModeClass) body#keycloak-bg:not(.pf-v5-theme-dark):not(.kcDarkModeClass)`
const QUICK_START_DARK_VARIABLE_SCOPE = `html.pf-v5-theme-dark,
html.pf-v5-theme-dark body,
html.pf-v5-theme-dark body#keycloak-bg,
body.pf-v5-theme-dark,
body#keycloak-bg.pf-v5-theme-dark,
html.kcDarkModeClass,
html.kcDarkModeClass body,
html.kcDarkModeClass body#keycloak-bg,
body.kcDarkModeClass,
body#keycloak-bg.kcDarkModeClass`

export function extractCssImports(cssText: string): { imports: string[], cssWithoutImports: string } {
  if (!cssText.trim()) {
    return { imports: [], cssWithoutImports: '' }
  }

  const imports: string[] = []
  const cssLines: string[] = []

  cssText.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim()
    const isImportLine = trimmedLine.toLowerCase().startsWith('@import ') && trimmedLine.endsWith(';')
    if (isImportLine) {
      imports.push(trimmedLine)
      return
    }
    cssLines.push(line)
  })

  const cssWithoutImports = cssLines.join('\n').trim()
  return {
    imports,
    cssWithoutImports,
  }
}

export function mergeCssImports(imports: string[]): string {
  const uniqueImports = Array.from(new Set(
    imports
      .map(entry => entry.trim())
      .filter(Boolean),
  ))
  return uniqueImports.join('\n')
}

function buildQuickStartVariableMap(settings: QuickSettings): Record<string, string> {
  const variables: Record<string, string> = {
    '--quickstart-primary-color': settings.colorPresetPrimaryColor,
    '--quickstart-secondary-color': settings.colorPresetSecondaryColor,
  }

  if (settings.colorPresetFontFamily && settings.colorPresetFontFamily !== CUSTOM_PRESET_ID) {
    variables['--quickstart-font-family'] = settings.colorPresetFontFamily
  }

  if (settings.colorPresetHeadingFontFamily && settings.colorPresetHeadingFontFamily !== CUSTOM_PRESET_ID) {
    variables['--quickstart-heading-font-family'] = settings.colorPresetHeadingFontFamily
  }

  variables['--quickstart-gradient-bg-default']
    = `linear-gradient(135deg, ${settings.colorPresetPrimaryColor} 0%, ${settings.colorPresetSecondaryColor} 100%)`

  if (settings.colorPresetBgColor && COLOR_REGEX.test(settings.colorPresetBgColor)) {
    variables['--quickstart-bg-color'] = settings.colorPresetBgColor
    variables['--quickstart-bg-image'] = 'none'
  }

  const borderRadius = BORDER_RADIUS_OPTIONS.find(option => option.value === settings.colorPresetBorderRadius)?.px
  if (borderRadius) {
    variables['--quickstart-border-radius'] = borderRadius
  }

  const cardShadow = CARD_SHADOW_OPTIONS.find(option => option.value === settings.colorPresetCardShadow)?.css
  if (cardShadow) {
    variables['--quickstart-card-shadow'] = cardShadow
  }

  return variables
}

function buildScopedQuickStartVariablesCss(selectors: string, settings: QuickSettings): string {
  const variableEntries = Object.entries(buildQuickStartVariableMap(settings))
  if (variableEntries.length === 0) {
    return ''
  }

  const lines = variableEntries.map(([name, value]) => `  ${name}: ${value};`)
  return `${selectors} {\n${lines.join('\n')}\n}`
}

function buildQuickStartNonVariableCssForSettings(settings: QuickSettings): string {
  return buildQuickStartNonVariableCss({
    primaryColor: settings.colorPresetPrimaryColor,
    secondaryColor: settings.colorPresetSecondaryColor,
    fontFamily: settings.colorPresetFontFamily,
    bgColor: settings.colorPresetBgColor,
    borderRadius: settings.colorPresetBorderRadius,
    cardShadow: settings.colorPresetCardShadow,
    headingFontFamily: settings.colorPresetHeadingFontFamily,
    showClientName: settings.showClientName,
    showRealmName: settings.showRealmName,
    infoMessage: settings.infoMessage,
    imprintUrl: settings.imprintUrl,
    dataProtectionUrl: settings.dataProtectionUrl,
  })
}

export function buildModeAwareQuickStartCssParts(settingsByMode: ImportedQuickSettingsByMode | undefined): {
  sharedCss: string
  variablesCss: string
} {
  const light = settingsByMode?.light as QuickSettings | undefined
  if (!light) {
    return { sharedCss: '', variablesCss: '' }
  }

  const lightCss = buildQuickStartNonVariableCssForSettings(light)
  const lightCssParts = extractCssImports(lightCss)
  const sharedQuickStartCss = lightCssParts.cssWithoutImports.trim()
  const lightVariablesCss = buildScopedQuickStartVariablesCss(QUICK_START_LIGHT_VARIABLE_SCOPE, light)

  const dark = settingsByMode?.dark as QuickSettings | undefined
  const darkImports = dark
    ? extractCssImports(buildQuickStartNonVariableCssForSettings(dark)).imports
    : []
  const quickStartImportsCss = mergeCssImports([
    ...lightCssParts.imports,
    ...darkImports,
  ])
  const darkVariablesCss = dark
    ? buildScopedQuickStartVariablesCss(QUICK_START_DARK_VARIABLE_SCOPE, dark)
    : ''

  return {
    sharedCss: [quickStartImportsCss, sharedQuickStartCss].filter(Boolean).join('\n\n'),
    variablesCss: [lightVariablesCss, darkVariablesCss].filter(Boolean).join('\n\n'),
  }
}
