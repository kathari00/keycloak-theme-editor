import { expect, test } from '@playwright/test'
import { openApp, prepareAppTest } from './helpers/app'
import { downloadJar, readZipText } from './helpers/export'
import { getPreviewFrame } from './helpers/preview'

for (const style of ['base', 'v2', 'custom', 'bootstrap', 'carbon']) {
  test(`${style} split fills the screen and stacks on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1100 })
    await prepareAppTest(page)
    await openApp(page)
    await page.getByLabel('Select a style').selectOption(style)
    await expect(page.getByLabel('Select a style')).toHaveValue(style)
    if (style === 'carbon' || style === 'bootstrap') {
      await expect(page.getByLabel('Primary color value')).toHaveValue(style === 'carbon' ? '#0f62fe' : '#0d6efd')
    }
    await page.getByLabel('Select a layout').selectOption('split')
    const frame = await getPreviewFrame(page)
    await expect.poll(() => frame.locator('#kc-content').evaluate((e) => {
      const box = e.getBoundingClientRect()
      const title = document.querySelector('#kc-page-title')!.getBoundingClientRect()
      const form = document.querySelector('#kc-content-wrapper')!.getBoundingClientRect()
      return box.left === 0 && Math.abs(box.right - innerWidth / 2) < 1
        && title.left >= box.left && title.right <= box.right
        && title.bottom <= form.top && form.top - title.bottom <= 40
    })).toBe(true)
    await expect(frame.locator('#kc-page-title')).toBeVisible()
    await expect(frame.locator('#username')).toBeVisible()
    await page.locator('iframe').evaluate((e) => {
      e.style.width = '390px'
    })
    await expect.poll(() => frame.locator('#kc-content').evaluate((e) => {
      const box = e.getBoundingClientRect()
      const title = document.querySelector('#kc-page-title')!.getBoundingClientRect()
      return box.top >= title.bottom && box.left === 0 && Math.abs(box.width - innerWidth) < 1
    })).toBe(true)
    const input = await frame.locator('#username').evaluate(e => e.getBoundingClientRect().toJSON())
    expect(input.right).toBeLessThanOrEqual(390)
    if (style === 'carbon') {
      const files = await downloadJar(page, 'split-test')
      const css = readZipText(files, 'theme/split-test/login/resources/css/styles.css')
      expect(css).toContain('--kte-split-surface')
      expect(css).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)')
    }
  })
}
