import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function prepareAppTest(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear()
    delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker
    delete (window as Window & { showDirectoryPicker?: unknown }).showDirectoryPicker
  })
}

export async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.locator('#root')).not.toBeEmpty()
  await expect(page.getByRole('button', { name: 'Open editor menu' })).toBeVisible()
  await expect(page.locator('iframe')).toBeVisible()
}

export async function openTopbarMenuItem(page: Page, name: string) {
  const directlyVisibleButton = page.getByRole('button', { name, exact: true })
  if (await directlyVisibleButton.count() > 0 && await directlyVisibleButton.first().isVisible()) {
    await directlyVisibleButton.first().click()
    return
  }

  await page.getByRole('button', { name: 'Open editor menu' }).click()
  const options = page.getByRole('dialog', { name: 'Editor options' })
  await expect(options).toBeVisible()
  await options.getByRole('button', { name, exact: true }).click()
}

export async function openExportDialog(page: Page) {
  await openTopbarMenuItem(page, 'Export theme')
  await expect(page.getByRole('dialog', { name: 'Export Theme' })).toBeVisible()
}

export async function openImportDialog(page: Page) {
  await openTopbarMenuItem(page, 'Import theme')
  await expect(page.getByRole('dialog', { name: 'Import Theme' })).toBeVisible()
}
