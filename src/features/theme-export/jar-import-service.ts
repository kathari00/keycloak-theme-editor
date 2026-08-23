import type { UploadedAsset } from '../assets/types'
import type { LocalizedContentOverrides, QuickStartContentByLocale } from '../editor/stores/types'
import type { JarImportResult, ThemeEditorMetadata } from './types'
import { processUploadedFile } from '../assets/upload-service'
import { sanitizeThemeCssSourceForEditor } from '../editor/lib/css-source-sanitizer'
import { BASE_QUICK_START_MESSAGE_KEYS } from '../editor/stores/types'
import {
  DEFAULT_LOCALE_TAG,
  isCuratedLocale,
  localeTagForPropertiesSuffix,
} from '../i18n/locale-catalog'
import {
  THEME_FAVICON_RESOURCE_PATH,
  THEME_MESSAGES_DEFAULT_PATH,
  THEME_MESSAGES_EN_PATH,
  THEME_PROPERTIES_PATH,
  THEME_QUICK_START_CSS_PATH,
  THEME_RESOURCES_PATH,
  themeLoginPath,
} from '../keycloak-theme/paths'
import { parseMessageProperties, readMessageProperty } from '../preview/lib/message-properties'
import { getFilename, hasExplicitQuickStartBackgroundColor, parseAppliedAssetsFromCss } from './css-export-utils'
import { fetchOptionalThemeText } from './prepare-theme-export-files'
import { parseLocalizedContentOverrides, parseQuickSettingsFromImportedTheme } from './quick-settings-import'

export const THEME_JAR_IMPORTED_EVENT = 'themeJarImported'

const WHITESPACE_RE = /\s+/
const LOGIN_PATH_MARKER = '/login/'
const CUSTOM_USER_STYLES_CSS_PATH = 'css/custom-user-styles.css'
const LOCALE_MESSAGES_RE = /\/login\/messages\/messages_([A-Z_]+)\.properties$/i

function getLocaleMessagesSuffix(filename: string): string | null {
  return filename.match(LOCALE_MESSAGES_RE)?.[1] ?? null
}

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

/**
 * Unlike other locales - a preset rarely ships a base bundle for them, so
 * everything in an imported per-locale file is safely a user override -
 * English always has a real, non-empty base bundle. Telling a genuine user
 * override apart from the preset's own inherited content (e.g. `modern-card`
 * ships a blank `noAccount=` key today, but nothing guarantees every preset's
 * extra keys stay blank forever) needs a diff against that base, not just an
 * exclude-list. `sourceThemeId` missing or its base file unfetchable
 * (foreign/custom theme) falls back to the known-keys exclusion only, which
 * is safe but coarser.
 */
async function parseEnglishContentOverrides(
  messagesPropertiesText: string,
  sourceThemeId: string | undefined,
): Promise<LocalizedContentOverrides> {
  const pristineBase = sourceThemeId
    ? await fetchOptionalThemeText(themeLoginPath(sourceThemeId, THEME_MESSAGES_EN_PATH))
    : ''
  const pristineValues = parseMessageProperties(pristineBase)

  const overrides: LocalizedContentOverrides = {}
  for (const [key, rawValue] of Object.entries(parseMessageProperties(messagesPropertiesText))) {
    if ((BASE_QUICK_START_MESSAGE_KEYS as readonly string[]).includes(key)) {
      continue
    }
    const value = rawValue.trim()
    if (!value || value === pristineValues[key]?.trim()) {
      continue
    }
    overrides[key] = value
  }

  return overrides
}

/**
 * A locale counts as enabled when the theme declares it in `locales=` or ships a
 * bundle for it, so themes written by hand outside the editor still round-trip.
 */
async function parseImportedLocalization(params: {
  themeProps: string
  localeMessages: Record<string, string>
  messagesPropertiesText: string
  sourceThemeId: string | undefined
}): Promise<{ enabledLocales: string[], quickStartContentByLocale: QuickStartContentByLocale }> {
  const declared = (readMessageProperty(params.themeProps, 'locales') || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => isCuratedLocale(tag) && tag !== DEFAULT_LOCALE_TAG)

  const enabledLocales = [...new Set([...declared, ...Object.keys(params.localeMessages)])]

  const quickStartContentByLocale: QuickStartContentByLocale = {}
  for (const [localeTag, messagesText] of Object.entries(params.localeMessages)) {
    const overrides = parseLocalizedContentOverrides(messagesText)
    if (Object.keys(overrides).length > 0) {
      quickStartContentByLocale[localeTag] = overrides
    }
  }

  const englishOverrides = await parseEnglishContentOverrides(params.messagesPropertiesText, params.sourceThemeId)
  if (Object.keys(englishOverrides).length > 0) {
    quickStartContentByLocale[DEFAULT_LOCALE_TAG] = englishOverrides
  }

  return { enabledLocales, quickStartContentByLocale }
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
  const importedLocaleMessages: Record<string, string> = {}

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

    const localeSuffix = getLocaleMessagesSuffix(filename)
    if (localeSuffix) {
      const localeTag = localeTagForPropertiesSuffix(localeSuffix)
      // Locales outside the curated set can't be surfaced in the editor, so drop them.
      if (isCuratedLocale(localeTag) && localeTag !== DEFAULT_LOCALE_TAG) {
        importedLocaleMessages[localeTag] = readEntryText(data)
      }
      continue
    }

    const assetRule = ASSET_IMPORT_RULES.find(rule => filename.includes(rule.path))
    if (assetRule) {
      await importAssetByRule(filename, data, assetRule, importedAssets)
    }
  }

  const editorMetadata = parseStandaloneEditorMetadata(editorMetadataJsonText)
  const sourceThemeId = editorMetadata?.sourceThemeId
  const { enabledLocales, quickStartContentByLocale } = await parseImportedLocalization({
    themeProps,
    localeMessages: importedLocaleMessages,
    messagesPropertiesText: messagesProperties,
    sourceThemeId,
  })
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
    enabledLocales,
    quickStartContentByLocale,
    uploadedAssets: importedAssets,
    appliedAssets,
  }
}
