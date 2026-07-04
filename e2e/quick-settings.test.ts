import { test } from '@playwright/test'
import { openApp, prepareAppTest } from './helpers/app'
import { expectPreviewStyleToContain, getPreviewFrame } from './helpers/preview'

test.beforeEach(async ({ page }) => {
  await prepareAppTest(page)
})

test('background color updates the preview iframe', async ({ page }) => {
  await openApp(page)
  const frame = await getPreviewFrame(page)

  await page.getByLabel('Background color value').fill('#123456')

  await expectPreviewStyleToContain(frame, '#preview-quick-start-overrides', '--quickstart-bg-color-light: #123456')
  await expectPreviewStyleToContain(frame, '#preview-quick-start-overrides', '--quickstart-bg-color: var(--quickstart-bg-color-light)')
  await expectPreviewStyleToContain(frame, '#preview-quick-start-overrides', '--quickstart-bg-image: none')
})
