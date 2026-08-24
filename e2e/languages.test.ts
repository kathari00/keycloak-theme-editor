import { expect, test } from '@playwright/test'
import { openApp, openTopbarMenuItem, prepareAppTest } from './helpers/app'
import { downloadJar, readZipText } from './helpers/export'
import { getPreviewFrame } from './helpers/preview'

test.beforeEach(async ({ page }) => {
  await prepareAppTest(page)
})

async function addLanguage(page: import('@playwright/test').Page, optionLabel: string) {
  await page.getByLabel('Add a language').selectOption({ label: optionLabel })
}

async function openLanguagesTab(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: 'Languages' }).click()
  await expect(page.getByRole('heading', { name: 'Languages', level: 2 })).toBeVisible()
}

test('translates the theme and exports one message bundle per language', async ({ page }) => {
  await openApp(page)
  await openLanguagesTab(page)

  await addLanguage(page, 'German - Deutsch (de)')
  await expect(page.getByLabel('Language to translate')).toBeVisible()

  const frame = await getPreviewFrame(page)
  await frame.locator('#kc-login').click()
  await page.getByLabel('Selected element translation').fill('Jetzt anmelden')

  const files = await downloadJar(page, 'e2e-languages-theme')

  const properties = readZipText(files, 'theme/e2e-languages-theme/login/theme.properties')
  expect(properties).toContain('locales=en,de')

  const german = readZipText(files, 'theme/e2e-languages-theme/login/messages/messages_de.properties')
  expect(german).toContain('doLogIn=Jetzt anmelden')
  // Untranslated keys stay out so Keycloak falls back to English.
  expect(german).not.toContain('dataProtectionLabel')

  const english = readZipText(files, 'theme/e2e-languages-theme/login/messages/messages_en.properties')
  expect(english).not.toContain('Jetzt anmelden')
})

test('renders the preview in the selected language', async ({ page }) => {
  await openApp(page)
  await openLanguagesTab(page)

  const frame = await getPreviewFrame(page)
  await expect(frame.locator('html')).toHaveAttribute('lang', 'en')

  await addLanguage(page, 'German - Deutsch (de)')

  const germanFrame = await getPreviewFrame(page)
  await expect(germanFrame.locator('html')).toHaveAttribute('lang', 'de')
  // Standard Keycloak chrome comes from the pre-rendered bundle, not the editor.
  await expect(germanFrame.getByText('Anmelden').first()).toBeVisible()
  // Non-ASCII locale data must survive sync, Java rendering, JSON and iframe loading.
  await expect(germanFrame.locator('option', { hasText: 'français' })).toHaveText(/français/)
})

test('keeps a translation when its language is removed and added back', async ({ page }) => {
  await openApp(page)
  await openLanguagesTab(page)

  await addLanguage(page, 'German - Deutsch (de)')
  const frame = await getPreviewFrame(page)
  await frame.locator('#kc-login').click()
  await page.getByLabel('Selected element translation').fill('Jetzt anmelden')

  await page.getByRole('button', { name: 'Remove de' }).click()
  // English is always editable now - removing the last language falls back
  // to it instead of hiding the Translate section.
  await expect(page.getByLabel('Language to translate')).toHaveValue('en')

  await addLanguage(page, 'German - Deutsch (de)')
  await expect(page.getByLabel('Selected element translation')).toHaveValue('Jetzt anmelden')
})

test('resets localization and the active preview language', async ({ page }) => {
  await openApp(page)
  await openLanguagesTab(page)
  await addLanguage(page, 'Turkish - Türkçe (tr)')

  const frame = await getPreviewFrame(page)
  await expect(frame.locator('html')).toHaveAttribute('lang', 'tr')

  await openTopbarMenuItem(page, 'Reset everything')
  const dialog = page.getByRole('dialog', { name: 'Reset Everything?' })
  await dialog.getByRole('button', { name: 'Reset everything' }).click()

  await expect(frame.locator('html')).toHaveAttribute('lang', 'en')
  // English is always editable, so the Translate section stays visible and
  // falls back to it rather than hiding once no language is enabled.
  await expect(page.getByLabel('Language to translate')).toHaveValue('en')
})

test('edits the selected Keycloak message for any enabled language', async ({ page }) => {
  await openApp(page)
  await openLanguagesTab(page)
  await addLanguage(page, 'Turkish - Türkçe (tr)')

  const frame = await getPreviewFrame(page)
  await expect(frame.locator('html')).toHaveAttribute('lang', 'tr')
  const loginButton = frame.locator('#kc-login')
  await expect(loginButton).toContainText('Giriş Yap')
  await loginButton.click()

  const translation = page.getByLabel('Selected element translation')
  await expect(translation).toBeVisible()
  await expect(page.getByText('Translate doLogIn')).toBeVisible()
  await expect(page.getByText(/Used on \d+ pages/)).toBeVisible()
  await translation.fill('Oturum aç')
  await expect(loginButton).toContainText('Oturum aç')

  await frame.locator('#kc-page-title').click()
  await expect(page.getByText('Translate loginAccountTitle')).toBeVisible()
  await expect(page.getByLabel('Selected element translation')).toHaveValue('')
  await page.getByLabel('Selected element translation').fill('Özel giriş başlığı')
  await expect(frame.locator('#kc-page-title')).toContainText('Özel giriş başlığı')

  await page.getByRole('button', { name: 'Invalid State' }).click()
  const inputError = frame.locator('[data-kc-i18n-key="invalidUserMessage"]')
  await inputError.click()
  await expect(page.getByText('Translate invalidUserMessage')).toBeVisible()
  await page.getByLabel('Selected element translation').fill('Hatalı giriş')
  await expect(frame.locator('[data-kc-i18n-key="invalidUserMessage"]')).toContainText('Hatalı giriş')

  await frame.locator('label[for="password"]').click()
  await expect(page.getByText('Translate password')).toBeVisible()
  await page.getByLabel('Selected element translation').fill('Gizli parola')
  await expect(frame.locator('label[for="password"]')).toContainText('Gizli parola')

  await loginButton.click()
  await page.getByText(/Used on \d+ pages/).click()
  await page.getByRole('button', { name: 'login password', exact: true }).click()
  await expect(frame.locator('body')).toHaveAttribute('data-page-id', 'login-login-password')
  await expect(frame.locator('[data-kc-i18n-key="doLogIn"]').first()).toContainText('Oturum aç')

  const files = await downloadJar(page, 'e2e-selected-message-theme')
  const turkish = readZipText(files, 'theme/e2e-selected-message-theme/login/messages/messages_tr.properties')
  expect(turkish).toContain('doLogIn=Oturum aç')
})
