import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { JSDOM } from 'jsdom'

interface Output { variants: Record<string, Record<string, Record<string, string>>> }
const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '../..')

function stripResources(html: string) {
  const dom = new JSDOM(html)
  dom.window.document.querySelectorAll('link[rel="stylesheet"], script').forEach(node => node.remove())
  return dom.serialize()
}

async function main() {
  const before = JSON.parse(await readFile(path.join(root, 'generated/pr-original-pages.json'), 'utf8')) as Output
  const after = JSON.parse(await readFile(path.join(root, 'generated/pr-candidate-pages.json'), 'utf8')) as Output
  const selectedPages = process.argv.find(arg => arg.startsWith('--pages='))
  const pages = selectedPages
    ? selectedPages === '--pages=all'
      ? Object.keys(before.variants.v2)
      : selectedPages.slice('--pages='.length).split(',')
    : ['login.html', 'login-username.html', 'login-password.html', 'register.html']
  const styles = await Promise.all([
    'public/keycloak-dev-resources/resources-common/vendor/patternfly-v5/patternfly.min.css',
    'public/keycloak-dev-resources/resources-common/vendor/patternfly-v5/patternfly-addons.css',
    'public/keycloak-dev-resources/themes/v2/login/resources/css/quick-start.css',
    '../keycloak-v2-pr-validation/themes/src/main/resources/theme/keycloak.v2/login/resources/css/styles.css',
  ].map(file => readFile(path.resolve(repo, file), 'utf8')))

  const browser = await chromium.launch({ headless: true })
  let differences = 0
  try {
    for (const width of [1280, 420]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      for (const name of pages) {
        for (const state of Object.keys(before.variants.v2[name]).filter(state => after.variants.v2[name]?.[state])) {
          const boxes = []
          for (const source of [before, after]) {
            await page.setContent(stripResources(source.variants.v2[name][state]), { waitUntil: 'domcontentloaded' })
            for (const css of styles) await page.addStyleTag({ content: css })
            boxes.push(await page.evaluate(() => {
              const selectors = ['#kc-header', '#kc-page-title', 'main', 'form', '#kc-form-login', '#kc-register-form', '#kc-update-profile-form', '#kc-update-email-form', '#kc-reset-password-form', '#kc-passwd-update-form', '#kc-recovery-codes-settings-form', '#kc-recovery-code-login-form', '#kc-otp-login-form', '#kc-totp-settings-form', '#webauth', '#authn_select', '#kc-select-credential-form', '#username', '#password', '#password-confirm', '#password-new', '#recoveryCodeInput', '#otp', '#totp', '#userLabel', '#kc-totp-secret-qr-code', '#kc-recovery-codes-list', '#kc-login', '#kc-submit', '#kc-form-buttons', '#kc-info', '#kc-registration']
              return Object.fromEntries(selectors.map((selector) => {
                const element = document.querySelector(selector)
                if (!element)
                  return [selector, null]
                const rect = element.getBoundingClientRect()
                return [selector, [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 10) / 10)]
              }))
            }))
          }
          const baseline = boxes[0] as Record<string, number[] | null>
          const candidate = boxes[1] as Record<string, number[] | null>
          for (const selector of Object.keys(baseline)) {
            const first = baseline[selector]
            const second = candidate[selector]
            if (JSON.stringify(first) === JSON.stringify(second))
              continue
            differences++
            process.stdout.write(`${width}px ${name}/${state} ${selector}: ${JSON.stringify(first)} -> ${JSON.stringify(second)}\n`)
          }
        }
      }
      await page.close()
    }
  }
  finally {
    await browser.close()
  }
  process.stdout.write(`Changed measured boxes: ${differences}\n`)
  if (differences > 0)
    process.exitCode = 1
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
})
