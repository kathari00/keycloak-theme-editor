import { expect, test } from '@playwright/test'
import { openApp, prepareAppTest } from './helpers/app'
import { getPreviewFrame } from './helpers/preview'

async function headerStyles(page: import('@playwright/test').Page) {
  const frame = await getPreviewFrame(page)
  return frame.locator('body').evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element)
        return { size: 0, color: '' }
      const style = getComputedStyle(element)
      return { size: Number.parseFloat(style.fontSize), color: style.color }
    }
    return { realm: read('#kc-realm-name'), client: read('#kc-client-name'), title: read('#kc-page-title') }
  })
}

test('the custom theme ranks realm, client and page title as three distinct headings', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 })
  await prepareAppTest(page)
  await openApp(page)
  await page.getByLabel('Select a style').selectOption('custom')
  await expect(page.frameLocator('iframe').locator('#kc-page-title')).toBeVisible()
  await page.getByLabel('Show client name').check()
  await expect(page.frameLocator('iframe').locator('#kc-client-name')).toBeVisible()

  const light = await headerStyles(page)
  // The realm is the brand heading, the client a subtitle under it, the page title the action.
  expect(light.realm.size).toBeGreaterThan(light.title.size)
  expect(light.client.size).toBeLessThan(light.title.size)
  // A blanket `p { color: ... !important }` used to force the client to the realm's colour, and a
  // rule written for `.subtitle` used to paint the realm in the accent colour at 2:1 contrast.
  expect(light.client.color).not.toBe(light.realm.color)
  expect(light.realm.color).toBe(light.title.color)

  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(page.frameLocator('iframe').locator('html')).toHaveClass(/kcDarkModeClass/)
  const dark = await headerStyles(page)
  expect(dark.client.color).not.toBe(dark.realm.color)
  expect(dark.realm.color).not.toBe(light.realm.color)
})
