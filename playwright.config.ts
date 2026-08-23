import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Has its own playwright.config.ts (no webServer - it targets a real
  // Keycloak container, not the editor dev server) and its own npm script.
  testIgnore: ['**/keycloak-integration/**'],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
