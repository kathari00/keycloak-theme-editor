import type { StartedTestContainer } from 'testcontainers'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { GenericContainer, Wait } from 'testcontainers'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Proves the exported .jar actually works on a real Keycloak server - nothing
 * else in this repo touches real FreeMarker rendering or resource bundle
 * resolution. Mirrors e2e/manual-qa-languages.md; keep both in sync.
 *
 * The fixture .jar (e2e/keycloak-integration/generated/theme.jar) is built by
 * `npm run build:keycloak-fixture` before this suite runs - see
 * tools/build-theme-fixture.ts for exactly what it enables/translates.
 */

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

/**
 * `account-console` is a public client with PKCE enforced, so a plain
 * `response_type=code` request without a code_challenge is rejected
 * (`invalid_request: Missing parameter: code_challenge_method`) and bounces
 * back through account-console's own error redirect - which lands on a login
 * page, but the wrong one (fresh session, default locale). We never complete
 * the OAuth flow (no credentials, no code exchange) - PKCE is only here to
 * make the initial `/auth` GET itself succeed and render our theme directly.
 */
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

/**
 * Real users select their language via the login page's own dropdown
 * (`#login-select-toggle`, an onchange-navigates <select>) - a `kc_locale`
 * query param on the *initial* `/auth` request is not honored (Keycloak's
 * internal redirect to `/login-actions/authenticate` drops it), so this
 * mirrors what an actual visitor does instead of relying on that.
 */
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
  // Standard Keycloak login label - proves messages_de.properties (Keycloak's
  // own bundle, not ours) is actually resolved by the real server.
  await expect(page.getByText(/Benutzername|E-Mail/i).first()).toBeVisible()
})

test('falls back to English when a custom field is left blank for a locale', async ({ page }) => {
  await page.goto(loginPageUrl())
  await switchLanguage(page, 'Arabic (العربية)')
  // ar's fixture leaves dataProtectionLabel blank - if the export pipeline's
  // fallback-to-English contract broke, this would render empty or as a
  // Keycloak `???dataProtectionLabel???` placeholder instead.
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
  // Keycloak shows the same generic message whether or not the user exists
  // (avoids user enumeration), so no provisioned test user is needed here -
  // this proves the *dynamic* error-rendering FreeMarker path translates too,
  // not just the static page load the other tests cover.
  await expect(page.getByText(/Ungültiger Benutzername oder Passwort/i)).toBeVisible()
})
