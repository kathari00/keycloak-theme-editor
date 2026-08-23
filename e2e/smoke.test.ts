import { expect, test } from '@playwright/test'
import { openApp, prepareAppTest } from './helpers/app'

test('app loads without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))

  await page.goto('/')
  await expect(page.locator('#root')).not.toBeEmpty()
  await expect(page.locator('body')).not.toHaveText(/Cannot read properties/)

  expect(errors).toEqual([])
})

test('editor options are keyboard and screen-reader accessible', async ({ page }) => {
  await prepareAppTest(page)
  await openApp(page)

  const toggle = page.getByRole('button', { name: 'Open editor menu' })
  await expect(toggle).toHaveAttribute('aria-haspopup', 'dialog')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await toggle.focus()
  await page.keyboard.press('Enter')

  const options = page.getByRole('dialog', { name: 'Editor options' })
  await expect(options).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close editor menu' })).toHaveAttribute('aria-expanded', 'true')
  await expect(options.getByLabel('Select preview device')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(options).toBeHidden()
  await expect(page.getByRole('button', { name: 'Open editor menu' })).toBeFocused()
})
