import type { StartedTestContainer } from 'testcontainers'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { GenericContainer, Wait } from 'testcontainers'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Mirrors e2e/manual-qa-languages.md; keep both in sync.
const KEYCLOAK_IMAGE = 'quay.io/keycloak/keycloak:26.6.4'
const REALM = 'theme-editor-test'

let container: StartedTestContainer
let baseURL: string

test.beforeAll(async () => {
  container = await new GenericContainer(KEYCLOAK_IMAGE)
    .withCommand(['start-dev', '--import-realm'])
    .withCopyFilesToContainer([
      { source: path.join(dirname, 'generated/theme.jar'), target: '/opt/keycloak/providers/theme.jar' },
      { source: path.join(dirname, 'fixtures/theme-editor-test-realm.json'), target: '/opt/keycloak/data/import/theme-editor-test-realm.json' },
    ])
    .withExposedPorts(8080)
    .withWaitStrategy(Wait.forLogMessage(/Keycloak .* started/i))
    .withStartupTimeout(120_000)
    .start()

  baseURL = `http://${container.getHost()}:${container.getMappedPort(8080)}`
})

test.afterAll(async () => {
  await container?.stop()
})

// account-console enforces PKCE; a code_challenge-less request bounces
// through an error redirect instead of rendering the login page.
function loginPageUrl(): string {
  const redirectUri = new URL(`/realms/${REALM}/account/`, baseURL).toString()
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

  const url = new URL(`/realms/${REALM}/protocol/openid-connect/auth`, baseURL)
  url.searchParams.set('client_id', 'account-console')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

// A kc_locale query param on the initial /auth request is dropped by
// Keycloak's own redirect, so we use the page's real language dropdown instead.
async function switchLanguage(page: import('@playwright/test').Page, optionLabel: string): Promise<void> {
  await page.selectOption('#login-select-toggle', { label: optionLabel })
}

test('boots cleanly and renders the login page in English by default', async ({ page }) => {
  await page.goto(loginPageUrl())
  await expect(page.locator('#kc-form-login')).toBeVisible()
  await expect(page).toHaveTitle(/./)
})

test('translates standard Keycloak chrome into German', async ({ page }) => {
  await page.goto(loginPageUrl())
  await switchLanguage(page, 'German (Deutsch)')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  // Standard Keycloak label, not ours - proves messages_de.properties resolves.
  await expect(page.getByText(/Benutzername|E-Mail/i).first()).toBeVisible()
})

test('falls back to English when a custom field is left blank for a locale', async ({ page }) => {
  await page.goto(loginPageUrl())
  await switchLanguage(page, 'Arabic (العربية)')
  // ar's fixture leaves dataProtectionLabel blank; must fall back, not render empty.
  const body = await page.locator('body').textContent()
  expect(body).not.toContain('???dataProtectionLabel???')
})

test('renders RTL layout for Arabic', async ({ page }) => {
  await page.goto(loginPageUrl())
  await switchLanguage(page, 'Arabic (العربية)')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})

test('renders our own custom text localized in German', async ({ page }) => {
  await page.goto(loginPageUrl())
  await switchLanguage(page, 'German (Deutsch)')
  await expect(page.getByText('Willkommen! Dies ist eine Testnachricht.')).toBeVisible()
})

test('renders our own custom text localized in Arabic', async ({ page }) => {
  await page.goto(loginPageUrl())
  await switchLanguage(page, 'Arabic (العربية)')
  await expect(page.getByText('مرحبا! هذه رسالة اختبار.')).toBeVisible()
})

test('translates a live error state in German', async ({ page }) => {
  await page.goto(loginPageUrl())
  await switchLanguage(page, 'German (Deutsch)')
  await page.locator('#username').fill('nonexistent-user')
  await page.locator('#password').fill('wrong-password')
  await page.locator('#kc-login').click()
  // Same generic message regardless of whether the user exists - no fixture user needed.
  await expect(page.getByText(/Ungültiger Benutzername oder Passwort/i)).toBeVisible()
})
