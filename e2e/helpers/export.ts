import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { expect } from '@playwright/test'
import { unzipSync } from 'fflate'
import { openExportDialog } from './app'

export type ZipFiles = Record<string, Uint8Array>

export interface DownloadedJar {
  bytes: Uint8Array
  files: ZipFiles
}

export async function downloadJarArchive(page: Page, themeName: string): Promise<DownloadedJar> {
  await openExportDialog(page)
  await page.locator('#theme-name-input').fill(themeName)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: new RegExp(`Download\\s+${themeName}\\.jar`) }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()

  const bytes = await readFile(path!)
  const archiveBytes = new Uint8Array(bytes)
  return {
    bytes: archiveBytes,
    files: unzipSync(archiveBytes),
  }
}

export async function downloadJar(page: Page, themeName: string): Promise<ZipFiles> {
  return (await downloadJarArchive(page, themeName)).files
}

export function expectZipEntry(files: ZipFiles, path: string): Uint8Array {
  const entry = files[path]
  expect(entry, `Expected ${path} in downloaded archive`).toBeTruthy()
  return entry
}

export function readZipText(files: ZipFiles, path: string): string {
  return new TextDecoder().decode(expectZipEntry(files, path))
}
