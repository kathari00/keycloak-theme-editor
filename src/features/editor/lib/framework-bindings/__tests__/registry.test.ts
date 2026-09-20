import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BOOTSTRAP_BINDING } from '../bootstrap'
import { BULMA_BINDING } from '../bulma'
import { extractBootstrapDarkModeBinding, extractBootstrapDefaultColors, getFrameworkBindingMetadata, loadFrameworkBinding } from '../registry'
import { buildFrameworkThemeProperties } from '../types'

describe('buildFrameworkThemeProperties', () => {
  it('appends framework classes to bare kc*Class hooks it has a mapping for', () => {
    const baseProperties = [
      'parent=base',
      'kcButtonClass=kcButtonClass',
      'kcButtonPrimaryClass=kcButtonPrimaryClass',
      'kcInputClass=kcInputClass',
    ].join('\n')

    const result = buildFrameworkThemeProperties(baseProperties, BOOTSTRAP_BINDING)

    expect(result).toContain('kcButtonClass=kcButtonClass btn')
    expect(result).toContain('kcButtonPrimaryClass=kcButtonPrimaryClass btn btn-primary')
    expect(result).toContain('kcInputClass=kcInputClass form-control')
    expect(result).toContain('parent=base')
  })

  it('leaves keys with no mapping untouched', () => {
    const baseProperties = 'kcDarkModeClass=kcDarkModeClass pf-v5-theme-dark'
    const result = buildFrameworkThemeProperties(baseProperties, BOOTSTRAP_BINDING)
    expect(result).toBe(baseProperties)
  })

  it('is a no-op for the native binding', () => {
    const baseProperties = 'kcButtonClass=kcButtonClass'
    const result = buildFrameworkThemeProperties(baseProperties, getFrameworkBindingMetadata('native'))
    expect(result).toBe(baseProperties)
  })

  it('layers onto values a preset theme already appended (e.g. PatternFly), rather than replacing them', () => {
    const baseProperties = 'kcButtonClass=kcButtonClass pf-v5-c-button'
    const result = buildFrameworkThemeProperties(baseProperties, BOOTSTRAP_BINDING)
    expect(result).toBe('kcButtonClass=kcButtonClass pf-v5-c-button btn')
  })
})

describe('framework binding registry', () => {
  it('loads Bulma CSS and its Keycloak token bridge onto the binding', async () => {
    const binding = await loadFrameworkBinding('bulma')

    expect(binding.id).toBe('bulma')
    expect(binding.frameworkCss).toContain('.button')
    expect(binding.frameworkCss).toContain('.input')
    expect(binding.frameworkCss).toContain('[data-theme=dark]')
    expect(binding.bindingCss).toContain('--bulma-primary-h: var(--quickstart-primary-h')
    expect(binding.bindingCss).toContain('html.kcDarkModeClass')
  })

  it('ships Bulma with the Inter faces and the licences it redistributes', async () => {
    const binding = await loadFrameworkBinding('bulma')

    expect(binding.frameworkCss).toContain('font-family:"Inter"')
    expect(binding.frameworkCss).toContain('src:url("data:font/woff2;base64,')
    expect(binding.frameworkCss).toContain('Permission is hereby granted, free of charge')
    expect(binding.frameworkCss).toContain('SIL OPEN FONT LICENSE')
  })

  it('keeps Bulma to the components its class map uses', async () => {
    const binding = await loadFrameworkBinding('bulma')

    // The full build is ~2.6x this; the login page never renders a navbar, grid or pagination.
    expect(binding.frameworkCss).not.toContain('.navbar-burger')
    expect(binding.frameworkCss).not.toContain('.pagination-previous')
    for (const key of Object.keys(BULMA_BINDING.classMap)) {
      for (const token of BULMA_BINDING.classMap[key].split(/\s+/))
        expect(binding.frameworkCss, `${key} -> .${token}`).toContain(`.${token}`)
    }
  })

  it('falls back to native for an unknown id', () => {
    expect(getFrameworkBindingMetadata('unknown' as never).id).toBe('native')
  })

  it.each(['cerulean', 'sandstone'] as const)('loads %s lazily with token overrides after its framework CSS', async (variantId) => {
    const binding = await loadFrameworkBinding('bootstrap', variantId)
    const frameworkCss = readFileSync(resolve(`node_modules/bootswatch/dist/${variantId}/bootstrap.min.css`), 'utf8')
    const bindingCss = readFileSync(resolve('src/features/editor/lib/framework-bindings/bootstrap-tokens.css'), 'utf8')

    expect(binding.label.toLowerCase()).toContain(variantId)
    expect(frameworkCss).toContain('.btn-primary')
    expect(bindingCss).toContain('--bs-primary: var(--quickstart-primary-color)')
    expect(bindingCss).toContain('--bs-btn-bg: var(--quickstart-primary-color)')
    if (variantId === 'cerulean')
      expect(binding.bindingCss).toContain('color-mix(in srgb, var(--quickstart-primary-color)')
  })

  it.each(['flatly', 'darkly'] as const)('keeps the Bootstrap class-map regressions fixed for %s', async (variantId) => {
    const binding = await loadFrameworkBinding('bootstrap', variantId)

    expect(binding.classMap.kcButtonSecondaryClass).toBe('btn btn-outline-secondary')
    expect(binding.classMap.kcButtonLargeClass).toBeUndefined()
    expect(binding.classMap.kcFormSocialAccountListButtonClass).toContain('btn-outline-secondary')
    expect(binding.classMap.kcSelectAuthListItemClass).toContain('btn-outline-secondary')
    expect(binding.classMap.kcFormSocialAccountListClass.split(/\s+/).filter(token => token === 'row')).toHaveLength(1)
    const bindingCss = readFileSync(resolve('src/features/editor/lib/framework-bindings/bootstrap-tokens.css'), 'utf8')
    expect(bindingCss).toContain('--bs-body-font-family: var(--quickstart-font-family, var(--bs-font-sans-serif))')
    expect(bindingCss).toContain('.checkbox input[type=\'checkbox\']')
    expect(bindingCss).toContain('.btn-outline-secondary')
  })

  it.each([
    ['default', '#0d6efd', '#6c757d'],
    ['cerulean', '#2fa4e7', '#e9ecef'],
    ['darkly', '#375a7f', '#444'],
    ['sandstone', '#325d88', '#8e8c84'],
  ] as const)('reads the %s palette from its compiled CSS', (variantId, primaryColor, secondaryColor) => {
    const cssPath = variantId === 'default'
      ? 'node_modules/bootstrap/dist/css/bootstrap.min.css'
      : `node_modules/bootswatch/dist/${variantId}/bootstrap.min.css`
    const frameworkCss = readFileSync(resolve(cssPath), 'utf8')
    expect(extractBootstrapDefaultColors(frameworkCss)).toEqual({ primaryColor, secondaryColor })
  })

  it.each([
    ['default', '#212529'],
    ['flatly', '#212529'],
    ['darkly', '#222'],
  ] as const)('bridges the %s dark palette onto Keycloak dark mode', (variantId, bodyBackground) => {
    const cssPath = variantId === 'default'
      ? 'node_modules/bootstrap/dist/css/bootstrap.min.css'
      : `node_modules/bootswatch/dist/${variantId}/bootstrap.min.css`
    const frameworkCss = readFileSync(resolve(cssPath), 'utf8')
    const darkBinding = extractBootstrapDarkModeBinding(frameworkCss)

    expect(darkBinding).toContain('.kcDarkModeClass')
    expect(darkBinding).toContain('.kcDarkModeClass .form-select')
    expect(darkBinding).not.toContain('[data-bs-theme=dark]')
    expect(darkBinding).toContain(`--bs-body-bg:${bodyBackground}`)
  })

  it('styles and positions the configurable info message without relying on template classes', () => {
    const bindingCss = readFileSync(resolve('src/features/editor/lib/framework-bindings/bootstrap-tokens.css'), 'utf8')

    expect(bindingCss).toContain(`#kc-info-message[data-kc-state='info-message']`)
    expect(bindingCss).toContain('order: -1;')
    expect(bindingCss).toContain('var(--bs-info-bg-subtle')
    expect(bindingCss).toContain('var(--bs-info-border-subtle')
    expect(bindingCss).toContain('.kcInputGroup.input-group')
    expect(bindingCss).toContain('--kte-card-padding: clamp(1.75rem, 5vw, 3rem);')
    expect(bindingCss).toContain('padding: var(--kte-card-padding) !important;')
    expect(bindingCss).toContain('height: auto;')
    expect(bindingCss).toContain('#kc-form-login #kc-login')
    expect(bindingCss).toContain('width: 100%;')
    expect(bindingCss).toContain('#kc-content :is(ul, ol):not(')
    expect(bindingCss).toContain('padding-inline-start: 2rem;')
    expect(bindingCss).toContain('list-style-position: outside;')
    expect(bindingCss).toContain('list-style-type: disc;')
    expect(bindingCss).toContain('content: \'\\2022  \';')
    expect(bindingCss).toContain('.kcFormPasswordVisibilityIconShow::before')
    expect(bindingCss).toContain('mask-image: url(')
    expect(bindingCss).not.toContain('content: \'\\1F441\'')
    expect(bindingCss).toContain('#kc-info:has(#kc-registration)')
    expect(bindingCss).toContain('order: 10;')
  })
})
