import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { openApp, prepareAppTest } from './helpers/app'
import { downloadJar, expectZipEntry, readZipText } from './helpers/export'
import { svgLogo } from './helpers/fixtures'
import { expectPreviewStyleToContain, getPreviewFrame } from './helpers/preview'

test.beforeEach(async ({ page }) => {
  await prepareAppTest(page)
})

test('uploads a logo and includes it in the exported JAR', async ({ page }) => {
  await openApp(page)
  await page.getByRole('tab', { name: 'Uploads' }).click()

  await page.locator('input[type="file"]').nth(1).setInputFiles({
    name: 'e2e-logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svgLogo),
  })

  const frame = await getPreviewFrame(page)
  await expectPreviewStyleToContain(frame, '#preview-uploaded-images', '--uploaded-logo-e2e-logo')
  await expectPreviewStyleToContain(frame, '#preview-applied-assets', '--quickstart-logo-url')

  const files = await downloadJar(page, 'e2e-upload-theme')

  expectZipEntry(files, 'theme/e2e-upload-theme/login/resources/img/logos/e2e-logo.svg')
  expect(readZipText(files, 'theme/e2e-upload-theme/login/resources/css/styles.css')).toContain('../img/logos/e2e-logo.svg')
})
