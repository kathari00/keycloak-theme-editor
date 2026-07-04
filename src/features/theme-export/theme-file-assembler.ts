import type { UploadedAsset } from '../assets/types'
import type { AssembleThemeFilesParams, ThemeEditorMetadata } from './types'
import { base64ToBlob } from '../assets/font-css-generator'
import {
  THEME_FAVICON_RESOURCE_PATH,
  THEME_FOOTER_FTL_PATH,
  THEME_MESSAGES_DEFAULT_PATH,
  THEME_MESSAGES_EN_PATH,
  THEME_PROPERTIES_PATH,
  THEME_QUICK_START_CSS_PATH,
  THEME_RESOURCES_PATH,
  THEME_STYLES_CSS_PATH,
  THEME_TEMPLATE_FTL_PATH,
} from '../keycloak-theme/paths'

type AssetBucketKey = 'uploadedFonts' | 'uploadedBackgrounds' | 'uploadedLogos' | 'uploadedImages'

const ASSET_BUCKETS: ReadonlyArray<[AssetBucketKey, string]> = [
  ['uploadedFonts', 'fonts'],
  ['uploadedBackgrounds', 'img/backgrounds'],
  ['uploadedLogos', 'img/logos'],
  ['uploadedImages', 'img/assets'],
]

function dedupeAssetsByName(assets: UploadedAsset[]): UploadedAsset[] {
  const byName = new Map<string, UploadedAsset>()
  for (const asset of assets) {
    byName.set(asset.name, asset)
  }
  return Array.from(byName.values())
}

function toAssetBlob(asset: UploadedAsset): Blob {
  return base64ToBlob(asset.base64Data, asset.mimeType)
}

const textEncoder = new TextEncoder()

function themeArchiveLoginPath(loginRoot: string, loginRelativePath: string): string {
  return `${loginRoot}/${loginRelativePath}`
}

function themeArchiveLoginResourcePath(loginRoot: string, resourceRelativePath: string): string {
  return themeArchiveLoginPath(loginRoot, `${THEME_RESOURCES_PATH}/${resourceRelativePath}`)
}

export function generateKeycloakThemesJson(
  themeName: string,
): string {
  return JSON.stringify({
    themes: [{
      name: themeName,
      types: ['login'],
    }],
  }, null, 2)
}

export function generateEditorMetadataJson(
  editorMetadata: ThemeEditorMetadata,
): string {
  return JSON.stringify(editorMetadata, null, 2)
}

export async function assembleThemeFiles(
  params: AssembleThemeFilesParams,
  themeRoot: string,
  metaInfPrefix: string,
): Promise<Record<string, Uint8Array>> {
  const {
    themeName,
    properties,
    templateFtl,
    footerFtl,
    quickStartCss,
    stylesCss,
    messagesContent,
    payload,
    editorMetadata,
    extraBlobs,
  } = params

  const files: Record<string, Uint8Array> = {}
  const loginRoot = `${themeRoot}/login`

  addText(files, `${metaInfPrefix}keycloak-themes.json`, generateKeycloakThemesJson(themeName))
  addText(files, `${metaInfPrefix}keycloak-theme-editor.json`, generateEditorMetadataJson(editorMetadata))
  addText(files, themeArchiveLoginPath(loginRoot, THEME_PROPERTIES_PATH), properties)

  if (templateFtl) {
    addText(files, themeArchiveLoginPath(loginRoot, THEME_TEMPLATE_FTL_PATH), templateFtl)
  }
  if (footerFtl) {
    addText(files, themeArchiveLoginPath(loginRoot, THEME_FOOTER_FTL_PATH), footerFtl)
  }

  if (params.customFtlFiles) {
    for (const [filename, content] of Object.entries(params.customFtlFiles)) {
      addText(files, themeArchiveLoginPath(loginRoot, filename), content)
    }
  }

  if (quickStartCss) {
    addText(files, themeArchiveLoginResourcePath(loginRoot, THEME_QUICK_START_CSS_PATH), quickStartCss)
  }
  if (params.stylesCssFiles && Object.keys(params.stylesCssFiles).length > 0) {
    for (const [cssPath, cssContent] of Object.entries(params.stylesCssFiles)) {
      addText(files, themeArchiveLoginResourcePath(loginRoot, cssPath), cssContent)
    }
  }
  else {
    addText(files, themeArchiveLoginResourcePath(loginRoot, THEME_STYLES_CSS_PATH), stylesCss)
  }

  addText(files, themeArchiveLoginPath(loginRoot, THEME_MESSAGES_DEFAULT_PATH), messagesContent)
  addText(files, themeArchiveLoginPath(loginRoot, THEME_MESSAGES_EN_PATH), messagesContent)

  for (const [key, directory] of ASSET_BUCKETS) {
    for (const asset of dedupeAssetsByName(payload[key])) {
      await addBlob(files, themeArchiveLoginResourcePath(loginRoot, `${directory}/${asset.name}`), toAssetBlob(asset))
    }
  }

  if (payload.appliedFavicon) {
    await addBlob(files, themeArchiveLoginResourcePath(loginRoot, THEME_FAVICON_RESOURCE_PATH), toAssetBlob(payload.appliedFavicon))
  }

  if (extraBlobs) {
    for (const [path, blob] of Object.entries(extraBlobs)) {
      await addBlob(files, themeArchiveLoginResourcePath(loginRoot, path), blob)
    }
  }

  return files
}

function addText(files: Record<string, Uint8Array>, path: string, content: string): void {
  files[path] = textEncoder.encode(content)
}

async function addBlob(files: Record<string, Uint8Array>, path: string, blob: Blob): Promise<void> {
  files[path] = new Uint8Array(await blob.arrayBuffer())
}
