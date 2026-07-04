import { expect, test } from '@playwright/test'
import { openApp, prepareAppTest } from './helpers/app'
import { downloadJar, readZipText } from './helpers/export'

test.beforeEach(async ({ page }) => {
  await prepareAppTest(page)
})

test('exports a deployable JAR with Keycloak metadata and generated quick-start CSS', async ({ page }) => {
  await openApp(page)
  await page.getByLabel('Primary color value').fill('#13579b')

  const files = await downloadJar(page, 'e2e-theme')

  expect(JSON.parse(readZipText(files, 'META-INF/keycloak-themes.json'))).toEqual({
    themes: [{ name: 'e2e-theme', types: ['login'] }],
  })
  expect(readZipText(files, 'theme/e2e-theme/login/theme.properties')).toContain('styles=')
  expect(readZipText(files, 'theme/e2e-theme/login/resources/css/quick-start.css')).toContain('#13579b')
  expect(readZipText(files, 'theme/e2e-theme/login/messages/messages_en.properties')).toContain('imprintLabel=Imprint')
})
