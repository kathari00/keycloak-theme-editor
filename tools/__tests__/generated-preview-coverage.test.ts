// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { CURATED_LOCALES, DEFAULT_LOCALE_TAG } from '../../src/features/i18n/locale-catalog'

const generatedDir = path.join(process.cwd(), 'src/features/preview/generated')
const fileFor = (tag: string) => tag === DEFAULT_LOCALE_TAG ? 'pages.json' : `pages.${tag}.json`
// Local runs render the base language; CI renders every curated one (see AGENTS.md).
const renderedLocales = CURATED_LOCALES.filter(({ tag }) => existsSync(path.join(generatedDir, fileFor(tag))))

describe('generated login preview coverage', () => {
  it('has rendered the base language', () => {
    expect(renderedLocales.map(({ tag }) => tag)).toContain(DEFAULT_LOCALE_TAG)
  })

  it.each(renderedLocales)('keeps authentication pages for $tag after upstream updates', ({ tag }) => {
    const filename = fileFor(tag)
    const artifact = JSON.parse(readFileSync(path.join(generatedDir, filename), 'utf8'))
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
