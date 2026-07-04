import type { UploadedAsset } from '../assets/types'
import type { JarImportResult, ThemeEditorMetadata } from './types'
import { processUploadedFile } from '../assets/upload-service'
import { sanitizeThemeCssSourceForEditor } from '../editor/lib/css-source-sanitizer'
import {
  THEME_FAVICON_RESOURCE_PATH,
  THEME_MESSAGES_DEFAULT_PATH,
  THEME_MESSAGES_EN_PATH,
  THEME_PROPERTIES_PATH,
  THEME_QUICK_START_CSS_PATH,
  THEME_RESOURCES_PATH,
} from '../keycloak-theme/paths'
import { readMessageProperty } from '../preview/lib/message-properties'
import { getFilename, hasExplicitQuickStartBackgroundColor, parseAppliedAssetsFromCss } from './css-export-utils'
import { parseQuickSettingsFromImportedTheme } from './quick-settings-import'

export const THEME_JAR_IMPORTED_EVENT = 'themeJarImported'

const WHITESPACE_RE = /\s+/
const LOGIN_PATH_MARKER = '/login/'
const CUSTOM_USER_STYLES_CSS_PATH = 'css/custom-user-styles.css'

function themeArchiveLoginMarker(loginRelativePath: string): string {
  return `${LOGIN_PATH_MARKER}${loginRelativePath}`
}

function themeArchiveLoginResourceMarker(resourceRelativePath: string): string {
  return themeArchiveLoginMarker(`${THEME_RESOURCES_PATH}/${resourceRelativePath}`)
}

interface AssetImportRule {
  path: string
  category: UploadedAsset['category']
  fixedName?: string
  defaultName?: string
}

const ASSET_IMPORT_RULES: AssetImportRule[] = [
  { path: themeArchiveLoginResourceMarker('fonts/'), category: 'font' },
  {
    path: themeArchiveLoginResourceMarker('img/backgrounds/'),
    category: 'background',
    defaultName: 'keycloak-bg-darken.svg',
  },
  {
    path: themeArchiveLoginResourceMarker('img/logos/'),
    category: 'logo',
    defaultName: 'keycloak-logo-text.svg',
  },
  { path: themeArchiveLoginResourceMarker('img/assets/'), category: 'image' },
  {
    path: themeArchiveLoginResourceMarker(THEME_FAVICON_RESOURCE_PATH),
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

function getResourcePath(filename: string): string | null {
  const resourcePrefix = themeArchiveLoginResourceMarker('')
  const resourceIndex = filename.indexOf(resourcePrefix)
  if (resourceIndex === -1) {
    return null
  }
  return filename.slice(resourceIndex + resourcePrefix.length)
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

/** Try to extract editor metadata from standalone keycloak-theme-editor.json */
function parseStandaloneEditorMetadata(json: string): ThemeEditorMetadata | null {
  if (!json)
    return null
  try {
    const parsed = JSON.parse(json)
    if (parsed && typeof parsed === 'object') {
      return parsed as ThemeEditorMetadata
    }
  }
  catch {}
  return null
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
  let editorMetadataJsonText = ''
  const importedAssets: UploadedAsset[] = []
  const importedCssFiles: Record<string, string> = {}

  for (const [filename, data] of Object.entries(entries)) {
    if (filename.endsWith('/') || data.length === 0) {
      continue
    }

    if (filename.includes(themeArchiveLoginResourceMarker(CUSTOM_USER_STYLES_CSS_PATH))) {
      customCss = readEntryText(data)
      continue
    }

    if (filename.includes(themeArchiveLoginResourceMarker(THEME_QUICK_START_CSS_PATH))) {
      quickStartCss = readEntryText(data)
      continue
    }

    const resourcePath = getResourcePath(filename)
    if (resourcePath?.startsWith('css/') && resourcePath.endsWith('.css')) {
      importedCssFiles[resourcePath] = readEntryText(data)
      continue
    }

    if (filename.includes(themeArchiveLoginMarker(THEME_PROPERTIES_PATH))) {
      themeProps = readEntryText(data)
      themeName = extractThemeNameFromPath(filename)
      continue
    }

    if (filename.endsWith('/keycloak-theme-editor.json') || filename === 'keycloak-theme-editor.json') {
      editorMetadataJsonText = readEntryText(data)
      continue
    }

    if (filename.includes(themeArchiveLoginMarker(THEME_MESSAGES_DEFAULT_PATH))) {
      messagesProperties = readEntryText(data)
      continue
    }

    if (!messagesProperties && filename.includes(themeArchiveLoginMarker(THEME_MESSAGES_EN_PATH))) {
      messagesProperties = readEntryText(data)
      continue
    }

    const assetRule = ASSET_IMPORT_RULES.find(rule => filename.includes(rule.path))
    if (assetRule) {
      await importAssetByRule(filename, data, assetRule, importedAssets)
    }
  }

  const editorMetadata = parseStandaloneEditorMetadata(editorMetadataJsonText)
  const sourceThemeId = editorMetadata?.sourceThemeId
  const declaredStylePaths = (readMessageProperty(themeProps, 'styles') || '')
    .split(WHITESPACE_RE)
    .filter(Boolean)
    .filter(path => path !== THEME_QUICK_START_CSS_PATH)
  if (customCss.trim()) {
    importedCssFiles[CUSTOM_USER_STYLES_CSS_PATH] = customCss
  }
  const orderedStylePaths = [
    ...declaredStylePaths.filter(path => importedCssFiles[path] !== undefined),
    ...Object.keys(importedCssFiles).filter(path => !declaredStylePaths.includes(path)),
  ]
  const rawStylesCss = joinCssBlocks(orderedStylePaths.map(path => importedCssFiles[path] || ''))

  const stylesCssFiles = Object.fromEntries(
    orderedStylePaths
      .map(path => [path, sanitizeThemeCssSourceForEditor(importedCssFiles[path])] as const)
      .filter(([, css]) => Boolean(css)),
  )
  stylesCss = joinCssBlocks(orderedStylePaths.map(path => stylesCssFiles[path] || ''))

  const quickSettingsByMode = parseQuickSettingsFromImportedTheme({
    quickStartCss,
    stylesCss: rawStylesCss,
    customCss,
    messagesPropertiesText: messagesProperties,
  })

  const allCss = joinCssBlocks([quickStartCss, rawStylesCss])
  const { applied: appliedAssets } = parseAppliedAssetsFromCss(allCss, importedAssets)
  const hasExplicitBackgroundColor = hasExplicitQuickStartBackgroundColor(allCss)
  if (hasExplicitBackgroundColor) {
    delete appliedAssets.background
  }

  for (const { category, target } of [
    { category: 'background', target: 'background' },
    { category: 'logo', target: 'logo' },
    { category: 'favicon', target: 'favicon' },
  ] as const) {
    if (category === 'background' && hasExplicitBackgroundColor) {
      continue
    }
    if (!appliedAssets[target]) {
      const candidate = importedAssets.find(a => a.category === category)
      if (candidate) {
        appliedAssets[target] = candidate.id
      }
    }
  }

  return {
    css: stylesCss,
    stylesCssFiles,
    quickStartCss,
    properties: themeProps,
    themeName,
    sourceThemeId,
    quickSettingsByMode,
    uploadedAssets: importedAssets,
    appliedAssets,
  }
}
