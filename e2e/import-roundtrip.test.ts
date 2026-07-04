import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { openApp, openImportDialog, prepareAppTest } from './helpers/app'
import { downloadJarArchive } from './helpers/export'
import { expectPreviewStyleToContain, getPreviewFrame } from './helpers/preview'

test.beforeEach(async ({ page }) => {
  await prepareAppTest(page)
})

test('imports a previously exported JAR and restores quick-start settings', async ({ page }) => {
  await openApp(page)
  await page.getByLabel('Primary color value').fill('#2468ac')

  const exported = await downloadJarArchive(page, 'e2e-roundtrip-theme')

  await page.reload()
  await openApp(page)
  await openImportDialog(page)
  const importDialog = page.getByRole('dialog', { name: 'Import Theme' })
  await importDialog.locator('input[type="file"]').setInputFiles({
    name: 'e2e-roundtrip-theme.jar',
    mimeType: 'application/java-archive',
    buffer: Buffer.from(exported.bytes),
  })
  await page.getByRole('button', { name: 'Import JAR Theme' }).click()

  await expect(page.getByText('Imported theme: e2e-roundtrip-theme')).toBeVisible()
  const frame = await getPreviewFrame(page)
  await expectPreviewStyleToContain(frame, '#preview-quick-start-overrides', '--quickstart-primary-color-light: #2468ac')
})
