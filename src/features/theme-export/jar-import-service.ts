import type { AppliedAssets, UploadedAsset } from '../assets/types'
import type { ImportedQuickSettingsByMode, JarImportResult } from './types'
import { processUploadedFile } from '../assets/upload-service'
import { stripQuickStartImportLine } from '../editor/css-source-sanitizer'
import { getFilename, parseAppliedAssetsFromCss } from './css-export-utils'
import { parseQuickSettingsFromImportedTheme } from './quick-settings-import'

export const THEME_JAR_IMPORTED_EVENT = 'themeJarImported'

interface ImportedEditorCssResolution {
  css: string
}

interface AssetImportRule {
  path: string
  category: UploadedAsset['category']
  fixedName?: string
  defaultName?: string
}

const THEME_ID_PATTERN = /^\s*x-kte-theme-id\s*=\s*([^\r\n#]+)/im
const ASSET_IMPORT_RULES: AssetImportRule[] = [
  { path: '/login/resources/fonts/', category: 'font' },
  {
    path: '/login/resources/img/backgrounds/',
    category: 'background',
    defaultName: 'keycloak-bg-darken.svg',
  },
  {
    path: '/login/resources/img/logos/',
    category: 'logo',
    defaultName: 'keycloak-logo-text.svg',
  },
  { path: '/login/resources/img/assets/', category: 'image' },
  {
    path: '/login/resources/img/favicon.ico',
    category: 'favicon',
    fixedName: 'favicon.ico',
  },
]

function joinCssBlocks(blocks: string[]): string {
  return blocks.map(block => block.trim()).filter(Boolean).join('\n\n')
}

function extractThemeNameFromPath(path: string): string {
  const pathParts = path.split('/')
  const themeIndex = pathParts.indexOf('theme')
  return (themeIndex !== -1 && pathParts[themeIndex + 1]) ? pathParts[themeIndex + 1] : ''
}

const textDecoder = new TextDecoder()

function readEntryText(data: Uint8Array): string {
  return textDecoder.decode(data)
}

async function importAssetByRule(
  filename: string,
  data: Uint8Array,
  rule: AssetImportRule,
  importedAssets: UploadedAsset[],
): Promise<void> {
  const name = rule.fixedName || getFilename(filename)
  if (!name) {
    return
  }

  const blob = new Blob([new Uint8Array(data) as BlobPart])
  const mimeType = rule.category === 'favicon'
    ? blob.type || 'image/x-icon'
    : blob.type
  const assetFile = new File([blob], name, { type: mimeType })
  const asset = await processUploadedFile(assetFile, rule.category)

  if (rule.defaultName && name.toLowerCase() === rule.defaultName.toLowerCase()) {
    asset.isDefault = true
  }

  importedAssets.push(asset)
}

function resolveImportedEditorCssWithQuickSettings(params: {
  customCss: string
  importedAssets: UploadedAsset[]
}): ImportedEditorCssResolution {
  const { customCss, importedAssets } = params
  const parsedForEditor = customCss
    ? parseAppliedAssetsFromCss(customCss, importedAssets)
    : { applied: {}, cleanedCss: '' }

  return { css: parsedForEditor.cleanedCss || customCss }
}

function normalizeImportedAppliedAssets(
  appliedAssets: AppliedAssets,
  importedAssets: UploadedAsset[],
): AppliedAssets {
  const normalized: AppliedAssets = { ...appliedAssets }

  // Keep the default background binding to avoid preview quick-start overrides
  // (e.g. a persisted bg color) hiding the imported v2 background on import.
  // For logos, keep CSS as source of truth and avoid auto-applying the default.
  const defaultLogo = importedAssets.find(
    asset => asset.category === 'logo' && asset.isDefault,
  )
  if (defaultLogo && normalized.logo === defaultLogo.id) {
    delete normalized.logo
  }

  return normalized
}

/** Parse a Keycloak theme JAR file and extract all theme data */
export async function importJarFile(file: File): Promise<JarImportResult> {
  const { unzipSync } = await import('fflate')
  const arrayBuffer = await file.arrayBuffer()
  const entries = unzipSync(new Uint8Array(arrayBuffer))

  let customCss = ''
  let quickStartCss = ''
  let stylesCss = ''
  let themeProps = ''
  let messagesProperties = ''
  let themeName = ''
  let themeId: string | null = null
  let quickSettingsByMode: ImportedQuickSettingsByMode | undefined
  const importedAssets: UploadedAsset[] = []

  for (const [filename, data] of Object.entries(entries)) {
    // Skip directories (fflate includes them as empty entries)
    if (filename.endsWith('/') || data.length === 0) {
      continue
    }

    if (filename.includes('/login/resources/css/custom-user-styles.css')) {
      customCss = readEntryText(data)
      continue
    }

    if (filename.includes('/login/resources/css/quick-start.css')) {
      quickStartCss = readEntryText(data)
      continue
    }

    if (filename.includes('/login/resources/css/styles.css')) {
      stylesCss = readEntryText(data)
      continue
    }

    if (filename.includes('/login/theme.properties')) {
      themeProps = readEntryText(data)
      const themeIdMatch = themeProps.match(THEME_ID_PATTERN)
      themeId = themeIdMatch?.[1]?.trim() || null
      themeName = extractThemeNameFromPath(filename)
      continue
    }

    if (filename.includes('/login/messages/messages.properties')) {
      messagesProperties = readEntryText(data)
      continue
    }

    if (!messagesProperties && filename.includes('/login/messages/messages_en.properties')) {
      messagesProperties = readEntryText(data)
      continue
    }

    const assetRule = ASSET_IMPORT_RULES.find(rule => filename.includes(rule.path))
    if (assetRule) {
      await importAssetByRule(filename, data, assetRule, importedAssets)
    }
  }

  const combinedCss = joinCssBlocks([quickStartCss, stylesCss, customCss])
  quickSettingsByMode = parseQuickSettingsFromImportedTheme({
    quickStartCss,
    stylesCss,
    customCss,
    messagesPropertiesText: messagesProperties,
  })

  // Parse applied assets from full CSS so imported asset bindings are preserved.
  const parsedForAssets = combinedCss
    ? parseAppliedAssetsFromCss(combinedCss, importedAssets)
    : { applied: {}, cleanedCss: '' }

  const appliedAssets = normalizeImportedAppliedAssets(parsedForAssets.applied, importedAssets)

  // Set favicon if present
  const faviconAsset = importedAssets.find(a => a.category === 'favicon')
  if (faviconAsset) {
    appliedAssets.favicon = faviconAsset.id
  }

  const importedEditorCss = resolveImportedEditorCssWithQuickSettings({
    customCss,
    importedAssets,
  })

  // Build the editor CSS: strip @import quick-start.css from styles.css (managed separately),
  // then combine with legacy custom-user-styles.css if present.
  const strippedStylesCss = stripQuickStartImportLine(stylesCss)
  const editorStylesCss = joinCssBlocks([strippedStylesCss, importedEditorCss.css])

  return {
    css: editorStylesCss,
    properties: themeProps,
    themeName,
    themeId,
    quickSettingsByMode,
    uploadedAssets: importedAssets,
    appliedAssets,
  }
}
