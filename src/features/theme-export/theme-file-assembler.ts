import type { AppliedAssets, UploadedAsset } from '../assets/types'
import type { ImportedQuickSettingsByMode, ThemeExportPayload } from './types'
import { base64ToBlob } from '../assets/font-css-generator'

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

/** Editor metadata stored in keycloak-themes.json alongside each theme entry */
export interface ThemeEditorMetadata {
  sourceThemeId?: string
  appliedAssets: AppliedAssets
  quickSettings?: ImportedQuickSettingsByMode
}

export interface AssembleThemeFilesParams {
  themeName: string
  properties: string
  templateFtl: string
  footerFtl: string | null
  quickStartCss: string
  stylesCss: string
  messagesContent: string
  payload: ThemeExportPayload
  editorMetadata: ThemeEditorMetadata
  /** Extra blobs to include (e.g. default bg/logo images for v2 JAR export) */
  extraBlobs?: Record<string, Blob>
}

/** Generate keycloak-themes.json content with editor metadata */
export function generateKeycloakThemesJson(
  themeName: string,
  editorMetadata: ThemeEditorMetadata,
): string {
  return JSON.stringify({
    themes: [{
      name: themeName,
      types: ['login'],
      editor: editorMetadata,
    }],
  }, null, 2)
}

/**
 * Single source of truth for theme file assembly.
 * Returns a flat path→data map representing the complete theme file tree.
 * The `themeRoot` is used as the top-level directory (e.g. `theme/mytheme` for JARs, `mytheme` for folders).
 */
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

  // META-INF/keycloak-themes.json
  addText(files, `${metaInfPrefix}keycloak-themes.json`, generateKeycloakThemesJson(themeName, editorMetadata))

  // theme.properties
  addText(files, `${loginRoot}/theme.properties`, properties)

  // FTL templates
  addText(files, `${loginRoot}/template.ftl`, templateFtl)
  if (footerFtl) {
    addText(files, `${loginRoot}/footer.ftl`, footerFtl)
  }

  // CSS
  addText(files, `${loginRoot}/resources/css/quick-start.css`, quickStartCss)
  addText(files, `${loginRoot}/resources/css/styles.css`, stylesCss)

  // Messages
  addText(files, `${loginRoot}/messages/messages.properties`, messagesContent)
  addText(files, `${loginRoot}/messages/messages_en.properties`, messagesContent)

  // Uploaded assets
  for (const [key, directory] of ASSET_BUCKETS) {
    for (const asset of dedupeAssetsByName(payload[key])) {
      await addBlob(files, `${loginRoot}/resources/${directory}/${asset.name}`, toAssetBlob(asset))
    }
  }

  // Favicon
  if (payload.appliedFavicon) {
    await addBlob(files, `${loginRoot}/resources/img/favicon.ico`, toAssetBlob(payload.appliedFavicon))
  }

  // Extra blobs (e.g. default background/logo SVGs for JAR export)
  if (extraBlobs) {
    for (const [path, blob] of Object.entries(extraBlobs)) {
      await addBlob(files, `${loginRoot}/resources/${path}`, blob)
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
