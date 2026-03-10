import type { UploadedAsset } from '../assets/types'
import type { AssembleThemeFilesParams, ThemeEditorMetadata } from './types'
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

  addText(files, `${metaInfPrefix}keycloak-themes.json`, generateKeycloakThemesJson(themeName, editorMetadata))
  addText(files, `${loginRoot}/theme.properties`, properties)

  addText(files, `${loginRoot}/template.ftl`, templateFtl)
  if (footerFtl) {
    addText(files, `${loginRoot}/footer.ftl`, footerFtl)
  }

  addText(files, `${loginRoot}/resources/css/quick-start.css`, quickStartCss)
  if (params.stylesCssFiles && Object.keys(params.stylesCssFiles).length > 0) {
    for (const [cssPath, cssContent] of Object.entries(params.stylesCssFiles)) {
      addText(files, `${loginRoot}/resources/${cssPath}`, cssContent)
    }
  }
  else {
    addText(files, `${loginRoot}/resources/css/styles.css`, stylesCss)
  }

  addText(files, `${loginRoot}/messages/messages.properties`, messagesContent)
  addText(files, `${loginRoot}/messages/messages_en.properties`, messagesContent)

  for (const [key, directory] of ASSET_BUCKETS) {
    for (const asset of dedupeAssetsByName(payload[key])) {
      await addBlob(files, `${loginRoot}/resources/${directory}/${asset.name}`, toAssetBlob(asset))
    }
  }

  if (payload.appliedFavicon) {
    await addBlob(files, `${loginRoot}/resources/img/favicon.ico`, toAssetBlob(payload.appliedFavicon))
  }

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
