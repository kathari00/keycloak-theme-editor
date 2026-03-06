import type { DirectoryWriteParams, JarBuildParams } from './types'
import { assembleThemeFiles } from './theme-file-assembler'

const FILE_STREAM_CLOSE_TIMEOUT_MS = 4000

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
    current[parts[parts.length - 1]] = [data, { level: 0 }]
  }
  return root
}

/** Build a complete Keycloak theme JAR as a Blob */
export async function buildJarBlob(params: JarBuildParams): Promise<Blob> {
  const { themeName, extraBlobs, ...rest } = params
  const { zipSync } = await import('fflate')

  const files = await assembleThemeFiles(
    { ...rest, themeName, extraBlobs },
    `theme/${themeName}`,
    'META-INF/',
  )

  const nested = buildNestedZipData(files)
  const zipped = zipSync(nested)
  return new Blob([new Uint8Array(zipped) as BlobPart], { type: 'application/java-archive' })
}

/** Build a ZIP blob from DirectoryWriteParams (for folder-as-zip download) */
export async function buildFolderZipBlob(params: DirectoryWriteParams): Promise<Blob> {
  const { themeName, ...rest } = params
  const { zipSync } = await import('fflate')

  const files = await assembleThemeFiles(
    { ...rest, themeName },
    themeName,
    `${themeName}/META-INF/`,
  )

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
  const { themeName, ...rest } = params

  const files = await assembleThemeFiles(
    { ...rest, themeName },
    themeName,
    `${themeName}/META-INF/`,
  )

  for (const [path, data] of Object.entries(files)) {
    const parts = path.split('/')
    const fileName = parts.pop()!
    let dir = dirHandle
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true })
    }
    const fileHandle = await dir.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(data as ArrayBufferView<ArrayBuffer>)
    await closeWritableStream(writable)
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
