import { expect, test } from '@playwright/test'
import { openApp, prepareAppTest } from './helpers/app'
import { getPreviewFrame } from './helpers/preview'

/** Null while the preview iframe is being re-created, so callers can poll instead of failing. */
async function headerStyles(page: import('@playwright/test').Page) {
  try {
    return await readHeaderStyles(page)
  }
  catch {
    return null
  }
}

async function readHeaderStyles(page: import('@playwright/test').Page) {
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

  // Polled: the preview reinjects its stylesheets asynchronously after the toggle.
  // The realm is the brand heading, the client a subtitle under it, the page title the action.
  // A blanket `p { color: ... !important }` used to force the client to the realm's colour, and a
  // rule written for `.subtitle` used to paint the realm in the accent colour at 2:1 contrast.
  await expect.poll(async () => {
    const light = await headerStyles(page)
    return light !== null
      && light.realm.size > light.title.size
      && light.client.size < light.title.size
      && light.client.color !== light.realm.color
      && light.realm.color === light.title.color
  }).toBe(true)
  const light = (await headerStyles(page))!

  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(page.frameLocator('iframe').locator('html')).toHaveClass(/kcDarkModeClass/)
  await expect.poll(async () => {
    const dark = await headerStyles(page)
    return dark !== null && dark.client.color !== dark.realm.color && dark.realm.color !== light.realm.color
  }).toBe(true)
})

for (const layout of ['card', 'horizontal', 'split'] as const) {
  // Bulma stands in for the styles that left-aligned the names through their own CSS rather than
  // through the layout: base and Carbon did the same.
  for (const style of ['custom', 'bulma'] as const) {
    test(`realm and client stay centred in the ${layout} layout on ${style}`, async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 1000 })
      await prepareAppTest(page)
      await openApp(page)
      await page.getByLabel('Select a style').selectOption(style)
      await expect(page.frameLocator('iframe').locator('#kc-page-title')).toBeVisible()
      await page.getByLabel('Show realm name').check()
      await page.getByLabel('Show client name').check()
      await page.getByLabel('Select a layout').selectOption(layout)
      await expect(page.frameLocator('iframe').locator('#kc-client-name')).toBeVisible()

      // Assert the text alignment, not the box midpoint: these boxes span the full rail, so their
      // midpoints matched the centre even while the text inside them sat hard left.
      await expect.poll(async () => {
        try {
          const frame = await getPreviewFrame(page)
          return await frame.locator('body').evaluate(() => {
            const align = (selector: string) => {
              const el = document.querySelector(selector)
              return el ? getComputedStyle(el).textAlign : 'missing'
            }
            const mid = (selector: string) => {
              const r = document.querySelector(selector)?.getBoundingClientRect()
              return r ? Math.round(r.left + r.width / 2) : -1
            }
            return `${align('#kc-realm-name')}/${align('#kc-client-name')}/${mid('#kc-realm-name') === mid('#kc-client-name')}`
          })
        }
        catch {
          return 'retry'
        }
      }).toBe('center/center/true')
    })
  }
}

test('a Bootstrap card taller than the viewport keeps its header on screen', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 })
  await prepareAppTest(page)
  await openApp(page)
  await page.getByLabel('Select a style').selectOption('bootstrap')
  await expect(page.frameLocator('iframe').locator('#kc-page-title')).toBeVisible()
  await page.getByLabel('Show realm name').check()
  await page.getByLabel('Show client name').check()
  await page.setViewportSize({ width: 1400, height: 620 })

  // Plain `align-items: center` centred the overflow, putting the realm name above the top edge
  // where it could not be scrolled back into view.
  await expect.poll(async () => {
    try {
      const frame = await getPreviewFrame(page)
      return await frame.locator('#kc-header').evaluate(el => Math.round(el.getBoundingClientRect().top))
    }
    catch {
      return -1
    }
  }).toBeGreaterThanOrEqual(0)
})
