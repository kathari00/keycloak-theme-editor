import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { openApp, openImportDialog, prepareAppTest } from './helpers/app'
import { downloadJarArchive, readZipText } from './helpers/export'
import { getPreviewFrame } from './helpers/preview'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1100 })
  await prepareAppTest(page)
  await openApp(page)
  await page.getByLabel('Select a style').selectOption('carbon')
  await expect(page.frameLocator('iframe').locator('#kc-login')).toHaveClass(/cds--btn--primary/)
})

test('Carbon uses native controls, responsive layouts and dark surfaces', async ({ page }) => {
  const frame = await getPreviewFrame(page)
  await expect(frame.locator('#kc-login')).toHaveClass(/cds--btn--primary/)
  await expect(frame.locator('#kc-login')).toHaveCSS('background-color', 'rgb(15, 98, 254)')
  await expect(frame.locator('#username')).toHaveCSS('height', '40px')
  await expect(frame.locator('#kc-login')).toHaveCSS('min-height', '48px')
  await expect(frame.locator('#password')).toHaveAttribute('type', 'password')
  await expect(frame.locator('.kcFormPasswordVisibilityButtonClass')).toBeVisible()
  await page.getByLabel('Select a layout').selectOption('horizontal')
  for (const width of [1180, 390, 320]) {
    await page.locator('iframe').evaluate((element, w) => {
      element.style.width = `${w}px`
    }, width)
    await expect.poll(async () => frame.locator('#username').evaluate((element) => {
      const input = element.getBoundingClientRect()
      const card = document.querySelector('.kcLoginClass')!.getBoundingClientRect()
      return input.left >= card.left && input.right <= card.right
    })).toBe(true)
  }
  await frame.evaluate(() => document.documentElement.classList.add('kcDarkModeClass'))
  await expect(frame.locator('.kcLoginClass')).toHaveCSS('background-color', 'rgb(22, 22, 22)')
  await expect(frame.locator('#username')).toHaveCSS('background-color', 'rgb(38, 38, 38)')
})

test('Carbon CSS edits are exported with fonts and survive JAR import', async ({ page }) => {
  await page.getByRole('tab', { name: 'Styling', exact: true }).click()
  await page.getByRole('tab', { name: 'carbon-custom.css', exact: true }).click()
  const editor = page.locator('.cm-content[contenteditable="true"]:visible')
  await editor.fill('.cds--btn--primary { background-color: #123456; }')
  await page.getByRole('tab', { name: 'Quick start', exact: true }).click()
  const frame = await getPreviewFrame(page)
  await expect(frame.locator('#kc-login')).toHaveCSS('background-color', 'rgb(18, 52, 86)')
  const exported = await downloadJarArchive(page, 'carbon-test')
  const root = 'theme/carbon-test/login/'
  expect(readZipText(exported.files, `${root}theme.properties`)).toContain('cds--btn--primary')
  expect(readZipText(exported.files, `${root}theme.properties`)).toContain('css/carbon-custom.css')
  const css = readZipText(exported.files, `${root}resources/css/styles.css`)
  expect(css).toContain('data:font/woff2;base64,')
  expect(css).toContain('--cds-background')
  expect(css).not.toContain('~@ibm')
  await openImportDialog(page)
  const dialog = page.getByRole('dialog', { name: 'Import Theme' })
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'carbon-test.jar',
    mimeType: 'application/java-archive',
    buffer: Buffer.from(exported.bytes),
  })
  await page.getByRole('button', { name: 'Import JAR Theme' }).click()
  await expect(page.getByText('Imported theme: carbon-test')).toBeVisible()
  const imported = await getPreviewFrame(page)
  await expect(imported.locator('#kc-login')).toHaveCSS('background-color', 'rgb(18, 52, 86)')
})
