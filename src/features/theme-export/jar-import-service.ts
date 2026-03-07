import type { AppliedAssets, UploadedAsset } from '../assets/types'
import type { JarImportResult } from './types'
import type { ThemeEditorMetadata } from './theme-file-assembler'
import { processUploadedFile } from '../assets/upload-service'
import { getFilename } from './css-export-utils'
import { parseQuickSettingsFromImportedTheme } from './quick-settings-import'

export const THEME_JAR_IMPORTED_EVENT = 'themeJarImported'

interface AssetImportRule {
  path: string
  category: UploadedAsset['category']
  fixedName?: string
  defaultName?: string
}

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

/** Try to extract editor metadata from keycloak-themes.json */
function parseEditorMetadata(keycloakThemesJson: string): ThemeEditorMetadata | null {
  try {
    const parsed = JSON.parse(keycloakThemesJson)
    const editor = parsed?.themes?.[0]?.editor
    if (editor && typeof editor === 'object') {
      return editor as ThemeEditorMetadata
    }
  }
  catch {
    // Not valid JSON or missing structure
  }
  return null
}

function buildAppliedAssetsFromImported(
  importedAssets: UploadedAsset[],
  savedApplied: AppliedAssets | undefined,
): AppliedAssets {
  const hasMetadata = !!savedApplied
  const wasApplied = (role: keyof AppliedAssets) => hasMetadata && !!savedApplied[role]
  const result: AppliedAssets = {}
  for (const asset of importedAssets) {
    if (asset.isDefault && !wasApplied(asset.category as keyof AppliedAssets)) continue
    if (asset.category === 'background' && !result.background) result.background = asset.id
    else if (asset.category === 'logo' && !result.logo) result.logo = asset.id
    else if (asset.category === 'favicon' && !result.favicon) result.favicon = asset.id
  }
  return result
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
  let keycloakThemesJsonText = ''
  const importedAssets: UploadedAsset[] = []

  for (const [filename, data] of Object.entries(entries)) {
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
      themeName = extractThemeNameFromPath(filename)
      continue
    }

    if (filename.endsWith('/keycloak-themes.json') || filename === 'keycloak-themes.json') {
      keycloakThemesJsonText = readEntryText(data)
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

  const editorMetadata = parseEditorMetadata(keycloakThemesJsonText)
  const sourceThemeId = editorMetadata?.sourceThemeId

  // Build quick settings: prefer metadata, fall back to CSS parsing
  const quickSettingsByMode = editorMetadata?.quickSettings
    ?? parseQuickSettingsFromImportedTheme({
      quickStartCss,
      stylesCss,
      customCss,
      messagesPropertiesText: messagesProperties,
    })

  const appliedAssets = buildAppliedAssetsFromImported(importedAssets, editorMetadata?.appliedAssets)

  const editorStylesCss = joinCssBlocks([stylesCss, customCss])

  return {
    css: editorStylesCss,
    properties: themeProps,
    themeName,
    sourceThemeId,
    quickSettingsByMode,
    uploadedAssets: importedAssets,
    appliedAssets,
  }
}
