import { expect, test } from '@playwright/test'
import { openApp, prepareAppTest } from './helpers/app'
import { getPreviewFrame } from './helpers/preview'

test.beforeEach(async ({ page }) => {
  await prepareAppTest(page)
  await openApp(page)
})

test('Bootstrap CSS edits update the preview and survive switching variants', async ({ page }) => {
  await page.getByLabel('Select a style').selectOption('bootstrap')
  await expect(page.getByLabel('Primary color value')).toHaveValue('#0d6efd')
  await page.getByRole('tab', { name: 'Styling', exact: true }).click()
  await page.getByRole('tab', { name: 'bootstrap-custom.css', exact: true }).click()
  const editor = page.locator('.cm-content[contenteditable="true"]:visible')
  await editor.fill('.btn-')
  await editor.press('Control+Space')
  await expect(page.getByRole('option').filter({ hasText: '.btn-primary' }).first()).toBeVisible()
  await editor.press('Escape')
  await editor.fill('.btn-primary { --bs-btn-')
  await editor.press('Control+Space')
  await expect(page.getByRole('option').filter({ hasText: '--bs-btn-bg' }).first()).toBeVisible()
  await editor.press('Escape')
  const customCss = '.btn-primary { --bs-btn-bg: #123456; --bs-btn-hover-bg: #234567; }'
  await editor.fill(customCss)
  await page.getByRole('tab', { name: 'Quick start', exact: true }).click()
  const frame = await getPreviewFrame(page)
  await expect(frame.locator('#kc-login')).toHaveCSS('background-color', 'rgb(18, 52, 86)')
  await page.getByLabel('Select a Bootstrap variant').selectOption('flatly')
  await expect(frame.locator('#kc-login')).toHaveCSS('background-color', 'rgb(18, 52, 86)')
  await page.getByRole('tab', { name: 'Styling', exact: true }).click()
  await expect(editor).toContainText(customCss)
})

test('native themes do not offer Bootstrap-specific completions', async ({ page }) => {
  await page.getByLabel('Select a style').selectOption('v2')
  await expect(page.frameLocator('iframe').locator('.pf-v5-c-login')).toBeVisible()
  await page.getByRole('tab', { name: 'Styling', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'bootstrap-custom.css', exact: true })).toHaveCount(0)
  const editor = page.locator('.cm-content[contenteditable="true"]:visible')
  await editor.fill('.example { --bs-btn-')
  await editor.press('Control+Space')
  await expect(page.getByRole('option').filter({ hasText: '--bs-btn-bg' })).toHaveCount(0)
})
