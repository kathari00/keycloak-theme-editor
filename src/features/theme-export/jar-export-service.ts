import type { UploadedAsset } from '../assets/types'
import type { DirectoryWriteParams, JarBuildParams, ThemeExportPayload } from './types'
import { base64ToBlob } from '../assets/font-css-generator'
import { generateKeycloakThemesJson } from './css-export-utils'

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
const FILE_STREAM_CLOSE_TIMEOUT_MS = 4000

function addTextEntry(files: Record<string, Uint8Array>, path: string, content: string): void {
  files[path] = textEncoder.encode(content)
}

async function addBlobEntry(files: Record<string, Uint8Array>, path: string, blob: Blob): Promise<void> {
  files[path] = new Uint8Array(await blob.arrayBuffer())
}

async function addAssetsToZip(
  files: Record<string, Uint8Array>,
  basePath: string,
  payload: ThemeExportPayload,
): Promise<void> {
  for (const [key, directory] of ASSET_BUCKETS) {
    for (const asset of dedupeAssetsByName(payload[key])) {
      await addBlobEntry(files, `${basePath}/${directory}/${asset.name}`, toAssetBlob(asset))
    }
  }
}

async function ensureDirectory(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemDirectoryHandle> {
  const parts = relativePath.split('/').filter(Boolean)
  let current = root
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true })
  }
  return current
}

/** Build a complete Keycloak theme JAR as a Blob */
export async function buildJarBlob(params: JarBuildParams): Promise<Blob> {
  const {
    themeName,
    properties,
    payload,
    templateFtl,
    footerFtl,
    quickStartCss,
    stylesCss,
    bgImageBlob,
    logoImageBlob,
    messagesContent,
  } = params

  const { zipSync } = await import('fflate')
  const files: Record<string, Uint8Array> = {}
  const themeLoginRoot = `theme/${themeName}/login`

  addTextEntry(files, 'META-INF/keycloak-themes.json', generateKeycloakThemesJson(themeName))
  addTextEntry(files, `${themeLoginRoot}/theme.properties`, properties)
  addTextEntry(files, `${themeLoginRoot}/template.ftl`, templateFtl)
  if (footerFtl) {
    addTextEntry(files, `${themeLoginRoot}/footer.ftl`, footerFtl)
  }

  addTextEntry(files, `${themeLoginRoot}/resources/css/quick-start.css`, quickStartCss)
  addTextEntry(files, `${themeLoginRoot}/resources/css/styles.css`, stylesCss)

  if (bgImageBlob) {
    await addBlobEntry(files, `${themeLoginRoot}/resources/img/backgrounds/keycloak-bg-darken.svg`, bgImageBlob)
  }
  if (logoImageBlob) {
    await addBlobEntry(files, `${themeLoginRoot}/resources/img/logos/keycloak-logo-text.svg`, logoImageBlob)
  }

  await addAssetsToZip(files, `${themeLoginRoot}/resources`, payload)

  if (payload.appliedFavicon) {
    await addBlobEntry(
      files,
      `${themeLoginRoot}/resources/img/favicon.ico`,
      toAssetBlob(payload.appliedFavicon),
    )
  }

  addTextEntry(files, `${themeLoginRoot}/messages/messages.properties`, messagesContent)
  addTextEntry(files, `${themeLoginRoot}/messages/messages_en.properties`, messagesContent)

  // fflate expects a nested directory structure for zipSync
  const nested = buildNestedZipData(files)
  const zipped = zipSync(nested)
  return new Blob([new Uint8Array(zipped) as BlobPart], { type: 'application/java-archive' })
}

/** Convert flat path→data map to fflate's nested directory structure */
function buildNestedZipData(files: Record<string, Uint8Array>): Record<string, any> {
  const root: Record<string, any> = {}
  for (const [path, data] of Object.entries(files)) {
    const parts = path.split('/')
    let current = root
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i]
      if (!current[dir]) {
        current[dir] = {}
      }
      current = current[dir]
    }
    // Store with empty options (no compression for speed — theme files are small)
    current[parts[parts.length - 1]] = [data, { level: 0 }]
  }
  return root
}

/** Build a ZIP blob from DirectoryWriteParams (for folder-as-zip download) */
export async function buildFolderZipBlob(params: DirectoryWriteParams): Promise<Blob> {
  const { properties, templateFtl, footerFtl, quickStartCss, stylesCss, messagesContent, payload } = params
  const { zipSync } = await import('fflate')
  const files: Record<string, Uint8Array> = {}

  addTextEntry(files, 'login/theme.properties', properties)
  if (templateFtl) {
    addTextEntry(files, 'login/template.ftl', templateFtl)
  }
  if (footerFtl) {
    addTextEntry(files, 'login/footer.ftl', footerFtl)
  }

  addTextEntry(files, 'login/resources/css/quick-start.css', quickStartCss)
  addTextEntry(files, 'login/resources/css/styles.css', stylesCss)
  addTextEntry(files, 'login/messages/messages.properties', messagesContent)
  addTextEntry(files, 'login/messages/messages_en.properties', messagesContent)

  for (const [key, directory] of ASSET_BUCKETS) {
    for (const asset of dedupeAssetsByName(payload[key])) {
      await addBlobEntry(files, `login/resources/${directory}/${asset.name}`, toAssetBlob(asset))
    }
  }

  if (payload.appliedFavicon) {
    await addBlobEntry(files, 'login/resources/img/favicon.ico', toAssetBlob(payload.appliedFavicon))
  }

  const nested = buildNestedZipData(files)
  const zipped = zipSync(nested)
  return new Blob([new Uint8Array(zipped) as BlobPart], { type: 'application/zip' })
}

/** Trigger a Blob download via anchor element */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  requestAnimationFrame(() => URL.revokeObjectURL(url))
}

/**
 * Try to save via File System Access API.
 * Returns `saved` when the file is written, `cancelled` when user aborts,
 * and `unavailable` when the browser does not support the picker API.
 */
export async function saveWithFilePicker(
  blob: Blob,
  suggestedName: string,
  types: { description: string, accept: Record<string, string[]> }[],
): Promise<'saved' | 'cancelled' | 'unavailable'> {
  if (!('showSaveFilePicker' in window))
    return 'unavailable'

  try {
    const fileHandle = await (window as any).showSaveFilePicker({ suggestedName, types })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await closeWritableStream(writable)
    return 'saved'
  }
  catch (err) {
    if ((err as Error).name === 'AbortError')
      return 'cancelled'
    throw err
  }
}

/** Write all theme files to a directory via File System Access API */
export async function writeToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  params: DirectoryWriteParams,
): Promise<void> {
  const { properties, templateFtl, footerFtl, quickStartCss, stylesCss, messagesContent, payload } = params

  const loginDir = await dirHandle.getDirectoryHandle('login', { create: true })
  const resourcesDir = await loginDir.getDirectoryHandle('resources', { create: true })
  const cssDir = await resourcesDir.getDirectoryHandle('css', { create: true })
  const messagesDir = await loginDir.getDirectoryHandle('messages', { create: true })

  await writeFile(loginDir, 'theme.properties', properties)
  if (templateFtl) {
    await writeFile(loginDir, 'template.ftl', templateFtl)
  }
  if (footerFtl) {
    await writeFile(loginDir, 'footer.ftl', footerFtl)
  }

  await writeFile(messagesDir, 'messages.properties', messagesContent)
  await writeFile(messagesDir, 'messages_en.properties', messagesContent)

  await writeFile(cssDir, 'quick-start.css', quickStartCss)
  await writeFile(cssDir, 'styles.css', stylesCss)

  for (const [key, directory] of ASSET_BUCKETS) {
    await writeAssets(await ensureDirectory(resourcesDir, directory), payload[key])
  }

  if (payload.appliedFavicon) {
    const imgDir = await resourcesDir.getDirectoryHandle('img', { create: true })
    await writeBlobFile(imgDir, 'favicon.ico', toAssetBlob(payload.appliedFavicon))
  }
}

/** Write a text file to a directory handle */
async function writeFile(dir: FileSystemDirectoryHandle, name: string, content: string): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await closeWritableStream(writable)
}

/** Write a blob file to a directory handle */
async function writeBlobFile(dir: FileSystemDirectoryHandle, name: string, blob: Blob): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await closeWritableStream(writable)
}

/** Write uploaded assets to a directory */
async function writeAssets(dir: FileSystemDirectoryHandle, assets: UploadedAsset[]): Promise<void> {
  for (const asset of dedupeAssetsByName(assets)) {
    await writeBlobFile(dir, asset.name, toAssetBlob(asset))
  }
}

async function closeWritableStream(writable: FileSystemWritableFileStream): Promise<void> {
  let didClose = false
  const closePromise = writable.close().then(() => {
    didClose = true
  })

  await Promise.race([
    closePromise,
    new Promise<void>(resolve => setTimeout(resolve, FILE_STREAM_CLOSE_TIMEOUT_MS)),
  ])

  if (!didClose) {
    console.warn('File stream close timed out; continuing to avoid stuck export UI.')
  }
}
