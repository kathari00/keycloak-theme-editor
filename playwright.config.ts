import process from 'node:process'
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Has its own playwright.config.ts (no webServer - it targets a real
  // Keycloak container, not the editor dev server) and its own npm script.
  testIgnore: ['**/keycloak-integration/**'],
  timeout: 30_000,
  // CI runners cold-start the dev server under real resource contention; whichever
  // test's first page load lands during that window can miss the 5s app-mount
  // assertion. A real app bug fails every retry too, so this doesn't mask one.
  retries: process.env.CI ? 2 : 0,
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
