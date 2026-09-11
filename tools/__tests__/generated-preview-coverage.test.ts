// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { CURATED_LOCALES, DEFAULT_LOCALE_TAG } from '../../src/features/i18n/locale-catalog'

describe('generated login preview coverage', () => {
  it.each(CURATED_LOCALES)('keeps authentication pages for $tag after upstream updates', ({ tag }) => {
    const filename = tag === DEFAULT_LOCALE_TAG ? 'pages.json' : `pages.${tag}.json`
    const artifact = JSON.parse(readFileSync(path.join(process.cwd(), 'src/features/preview/generated', filename), 'utf8'))
    for (const variant of ['base', 'v2', 'custom']) {
      for (const page of ['login.html', 'login-password.html']) {
        const html = artifact.variants[variant]?.[page]?.default
        expect(html, `${filename}: ${variant}/${page}`).toContain('id="kc-form-login"')
      }
      expect(artifact.variants[variant]?.['webauthn-register.html']?.default, `${filename}: ${variant}/webauthn-register.html`)
        .toContain('id="register"')
    }
  })
})
