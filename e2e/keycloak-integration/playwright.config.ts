import { defineConfig } from '@playwright/test'

/**
 * Deliberately separate from the root playwright.config.ts: that config's
 * `webServer` auto-starts the editor's own dev server, which this suite must
 * not do - it targets a real Keycloak container (managed in the spec file's
 * own `test.beforeAll`/`afterAll`), not the editor app. The root config
 * excludes this directory via `testIgnore` so `npm run test:e2e` never picks
 * these tests up by accident.
 */
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
