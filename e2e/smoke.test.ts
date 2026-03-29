import { expect, test } from '@playwright/test'

test('app loads without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))

  await page.goto('/')
  await expect(page.locator('#root')).not.toBeEmpty()
  await expect(page.locator('body')).not.toHaveText(/Cannot read properties/)

  expect(errors).toEqual([])
})
