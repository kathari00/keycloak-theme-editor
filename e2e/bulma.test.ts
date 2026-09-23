import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { openApp, openImportDialog, prepareAppTest } from './helpers/app'
import { downloadJarArchive, readZipText } from './helpers/export'
import { getPreviewFrame } from './helpers/preview'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1100 })
  await prepareAppTest(page)
  await openApp(page)
  await page.getByLabel('Select a style').selectOption('bulma')
  await expect(page.frameLocator('iframe').locator('#kc-login')).toHaveClass(/is-primary/)
})

test('Bulma maps native controls and follows Keycloak dark mode', async ({ page }) => {
  const frame = await getPreviewFrame(page)
  await expect(frame.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(frame.locator('#kc-login')).toHaveClass(/button/)
  await expect(frame.locator('#username')).toHaveClass(/input/)
  await expect(frame.locator('#kc-login')).toHaveCSS('background-color', 'rgb(0, 209, 178)')
  await expect(frame.locator('.kcFormCardClass')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(frame.locator('body')).toHaveCSS('font-family', /Inter/)
  // The declaration alone proves nothing: assert the embedded face actually loaded.
  await expect.poll(() => frame.locator('body').evaluate(async () => {
    await document.fonts.ready
    return document.fonts.check('1em Inter')
  })).toBe(true)
  await expect(frame.locator('.kcLocaleListClass')).toBeHidden()
  await expect.poll(() => frame.locator('.kcFormPasswordVisibilityIconShow').evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(12)
  await expect.poll(() => frame.locator('.kcFormPasswordVisibilityIconShow').evaluate(element => getComputedStyle(element, '::before').webkitMaskImage)).toContain('data:image/svg+xml')

  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(frame.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(frame.locator('html')).toHaveCSS('color-scheme', 'dark')
  await expect(frame.locator('.kcFormCardClass')).not.toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('Bulma custom CSS and framework identity survive JAR export/import', async ({ page }) => {
  await page.getByRole('tab', { name: 'Styling', exact: true }).click()
  await page.getByRole('tab', { name: 'bulma-custom.css', exact: true }).click()

  const editor = page.locator('.cm-content[contenteditable="true"]:visible')
  await editor.click()
  await page.keyboard.press('Control+Space')
  const suggestions = page.locator('.cm-tooltip-autocomplete li')
  await expect(suggestions.filter({ hasText: '.box' }).first()).toContainText('Bulma class')
  await expect(suggestions.filter({ hasText: 'Bootstrap' })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await editor.fill('.button.is-primary { background-color: #123456; }')
  await page.getByRole('tab', { name: 'Quick start', exact: true }).click()
  const frame = await getPreviewFrame(page)
  await expect(frame.locator('#kc-login')).toHaveCSS('background-color', 'rgb(18, 52, 86)')

  const exported = await downloadJarArchive(page, 'bulma-test')
  const root = 'theme/bulma-test/login/'
  expect(readZipText(exported.files, `${root}theme.properties`)).toContain('button is-primary')
  expect(readZipText(exported.files, `${root}theme.properties`)).toContain('css/bulma-custom.css')
  expect(readZipText(exported.files, `${root}resources/css/styles.css`)).toContain('--bulma-body-background-color')
  // Exports carry the font and the licences of what they redistribute, with no CDN dependency.
  expect(readZipText(exported.files, `${root}resources/css/styles.css`)).toContain('src:url("data:font/woff2;base64,')
  expect(readZipText(exported.files, `${root}resources/css/styles.css`)).toContain('SIL OPEN FONT LICENSE')
  expect(readZipText(exported.files, 'META-INF/keycloak-theme-editor.json')).toContain('"frameworkId": "bulma"')

  await openImportDialog(page)
  const dialog = page.getByRole('dialog', { name: 'Import Theme' })
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'bulma-test.jar',
    mimeType: 'application/java-archive',
    buffer: Buffer.from(exported.bytes),
  })
  await page.getByRole('button', { name: 'Import JAR Theme' }).click()
  await expect(page.getByText('Imported theme: bulma-test')).toBeVisible()
  await expect(page.getByLabel('Select a style')).toHaveValue('bulma')
  const imported = await getPreviewFrame(page)
  await expect(imported.locator('#kc-login')).toHaveClass(/is-primary/)
  await expect(imported.locator('#kc-login')).toHaveCSS('background-color', 'rgb(18, 52, 86)')
})

test('Bulma applies Quick Start messages and card shadows at component scope', async ({ page }) => {
  const frame = await getPreviewFrame(page)
  await page.getByLabel('Select card shadow').selectOption('strong')
  await expect(frame.locator('.kcFormCardClass')).toHaveCSS('box-shadow', /rgba\(0, 0, 0, 0\.25\)/)

  await page.getByLabel('Info message', { exact: true }).fill('A useful Bulma notification')
  await expect(frame.locator('#kc-info-message')).toContainText('A useful Bulma notification')
  await expect(frame.locator('#kc-info-message')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(frame.locator('#kc-info-message')).toHaveCSS('border-radius', '8px')
})
