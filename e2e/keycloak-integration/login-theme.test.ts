import type { StartedTestContainer } from 'testcontainers'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { GenericContainer, Wait } from 'testcontainers'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Tag tracks tools/sync-keycloak-config.json - the theme's exported templates are
// adapted against that version, so testing against a different one is meaningless.
// Override with KEYCLOAK_IMAGE for local debugging against another version.
const syncConfig = JSON.parse(fs.readFileSync(path.join(dirname, '../../tools/sync-keycloak-config.json'), 'utf8')) as { tag: string }
const KEYCLOAK_IMAGE = process.env.KEYCLOAK_IMAGE ?? `quay.io/keycloak/keycloak:${syncConfig.tag}`

// Mirrors e2e/manual-qa-languages.md; keep both in sync.
const REALM = 'theme-editor-test'
const BOOTSTRAP_THEMES = ['bootstrap-base', 'bootstrap-custom', 'bootstrap-v2']
const FRAMEWORK_THEMES = [...BOOTSTRAP_THEMES, 'carbon-split']

let container: StartedTestContainer
let baseURL: string

test.beforeAll(async () => {
  container = await new GenericContainer(KEYCLOAK_IMAGE)
    .withCommand(['start-dev', '--import-realm'])
    .withCopyFilesToContainer([
      { source: path.join(dirname, 'generated/theme.jar'), target: '/opt/keycloak/providers/theme.jar' },
      { source: path.join(dirname, 'fixtures/theme-editor-test-realm.json'), target: '/opt/keycloak/data/import/theme-editor-test-realm.json' },
      ...FRAMEWORK_THEMES.map(themeName => ({
        source: path.join(dirname, `generated/${themeName}.jar`),
        target: `/opt/keycloak/providers/${themeName}.jar`,
      })),
    ])
    .withCopyContentToContainer(FRAMEWORK_THEMES.map(themeName => ({
      content: JSON.stringify({
        ...JSON.parse(fs.readFileSync(path.join(dirname, 'fixtures/theme-editor-test-realm.json'), 'utf8')),
        realm: themeName,
        loginTheme: themeName,
      }),
      target: `/opt/keycloak/data/import/${themeName}.json`,
    })))
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
function loginPageUrl(realm = REALM): string {
  const redirectUri = new URL(`/realms/${realm}/account/`, baseURL).toString()
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

  const url = new URL(`/realms/${realm}/protocol/openid-connect/auth`, baseURL)
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

test('Carbon split preserves native password controls and responds to dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 })
  await page.goto(loginPageUrl('carbon-split'))
  await expect(page.locator('#username')).toHaveCSS('height', '40px')
  await expect(page.locator('#kc-login')).toHaveClass(/cds--btn--primary/)
  await page.locator('#password').fill('example-password')
  await page.locator('.kcFormPasswordVisibilityButtonClass').click()
  await expect(page.locator('#password')).toHaveAttribute('type', 'text')
  const content = await page.locator('#kc-content').boundingBox()
  expect(content!.x).toBe(0)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('#kc-content')).toHaveCSS('background-color', 'rgb(22, 22, 22)')
})

for (const themeName of BOOTSTRAP_THEMES) {
  test(`${themeName} follows the browser color scheme after export`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(loginPageUrl(themeName))
    await expect(page.locator('html')).toHaveClass(/kcDarkModeClass/)
    const card = page.locator('.kcFormCardClass')
    const darkBackground = await card.evaluate(element => getComputedStyle(element).backgroundColor)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).not.toHaveClass(/kcDarkModeClass/)
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(darkBackground)
  })

  test(`${themeName} renders login and invalid-credentials feedback`, async ({ page }) => {
    let fontImportRequested = false
    await page.route('https://fonts.googleapis.com/**', async (route) => {
      fontImportRequested = true
      await route.fulfill({ contentType: 'text/css', body: '' })
    })
    const response = await page.goto(loginPageUrl(themeName))
    expect(response?.status()).toBe(200)
    await expect(page.locator('#kc-form-login')).toBeVisible()
    await expect(page.locator('#kc-login')).toHaveClass(/btn-primary/)
    const stylesheetUrl = await page.locator('link[href$="/css/styles.css"]').evaluate((link: HTMLLinkElement) => link.href)
    const stylesheet = await page.request.get(stylesheetUrl)
    expect(stylesheet.status()).toBe(200)
    expect(await stylesheet.text()).toContain('--bs-primary')
    await expect.poll(() => fontImportRequested).toBe(true)
    await expect(page.locator('body')).toHaveCSS('font-family', /Lato/)
    await expect(page.locator('#kc-login')).toHaveCSS('background-color', 'rgb(18, 52, 86)')
    await page.locator('#kc-login').hover()
    await expect(page.locator('#kc-login')).toHaveCSS('background-color', 'rgb(35, 69, 103)')
    await page.locator('#username').fill('nonexistent-user')
    await page.locator('#password').fill('wrong-password')
    await page.locator('#kc-login').click()
    await expect(page.getByText('Invalid username or password.')).toBeVisible()
  })
}

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
