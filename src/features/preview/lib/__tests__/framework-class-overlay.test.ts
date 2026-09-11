import type { FrameworkBinding } from '../../../editor/lib/framework-bindings/types'
import { describe, expect, it } from 'vitest'
import { applyFrameworkClassOverlay, setThemeDesignStylesheetDisabled } from '../framework-class-overlay'

const NATIVE_BINDING: FrameworkBinding = { id: 'native', label: 'Native', frameworkCss: '', bindingCss: '', classMap: {} }
const TEST_BINDING: FrameworkBinding = {
  id: 'bootstrap',
  label: 'Bootstrap',
  frameworkCss: '',
  bindingCss: '',
  classMap: {
    kcButtonPrimaryClass: 'btn btn-primary',
    kcInputClass: 'form-control',
  },
}

function makeDoc(html: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(html, 'text/html')
}

describe('applyFrameworkClassOverlay', () => {
  it('appends bound classes to elements carrying a mapped kc*Class hook', () => {
    const doc = makeDoc('<body><button class="kcButtonClass kcButtonPrimaryClass">Sign In</button><input class="kcInputClass"></body>')
    applyFrameworkClassOverlay(doc, TEST_BINDING)

    expect(doc.querySelector('button')?.className).toBe('kcButtonClass kcButtonPrimaryClass btn btn-primary')
    expect(doc.querySelector('input')?.className).toBe('kcInputClass form-control')
  })

  it('does not duplicate classes on repeated calls', () => {
    const doc = makeDoc('<body><button class="kcButtonPrimaryClass">Sign In</button></body>')
    applyFrameworkClassOverlay(doc, TEST_BINDING)
    applyFrameworkClassOverlay(doc, TEST_BINDING)

    expect(doc.querySelector('button')?.className).toBe('kcButtonPrimaryClass btn btn-primary')
  })

  it('cleanly removes previously-added classes when switching back to native', () => {
    const doc = makeDoc('<body><button class="kcButtonPrimaryClass">Sign In</button></body>')
    applyFrameworkClassOverlay(doc, TEST_BINDING)
    expect(doc.querySelector('button')?.className).toBe('kcButtonPrimaryClass btn btn-primary')

    applyFrameworkClassOverlay(doc, NATIVE_BINDING)
    expect(doc.querySelector('button')?.className).toBe('kcButtonPrimaryClass')
    expect(doc.querySelector('button')?.hasAttribute('data-kte-framework-classes')).toBe(false)
  })

  it('cleanly swaps classes when switching between two frameworks', () => {
    const otherBinding: FrameworkBinding = {
      id: 'bootstrap',
      label: 'Other',
      frameworkCss: '',
      bindingCss: '',
      classMap: { kcButtonPrimaryClass: 'button is-primary' },
    }
    const doc = makeDoc('<body><button class="kcButtonPrimaryClass">Sign In</button></body>')
    applyFrameworkClassOverlay(doc, TEST_BINDING)
    applyFrameworkClassOverlay(doc, otherBinding)

    expect(doc.querySelector('button')?.className).toBe('kcButtonPrimaryClass button is-primary')
  })
})

describe('setThemeDesignStylesheetDisabled', () => {
  it('disables the theme\'s own styles.css link but leaves quick-start.css alone', () => {
    const doc = makeDoc(
      '<head>'
      + '<link rel="stylesheet" href="/keycloak-dev-resources/themes/custom/login/resources/css/quick-start.css">'
      + '<link rel="stylesheet" href="/keycloak-dev-resources/themes/custom/login/resources/css/styles.css">'
      + '</head><body></body>',
    )

    setThemeDesignStylesheetDisabled(doc, true)

    const [quickStartLink, stylesLink] = Array.from(doc.querySelectorAll<HTMLLinkElement>('link'))
    expect(quickStartLink.disabled).toBeFalsy()
    expect(stylesLink.disabled).toBe(true)
  })

  it('re-enables the link when switching back to native', () => {
    const doc = makeDoc('<head><link rel="stylesheet" href=".../resources/css/styles.css"></head><body></body>')

    setThemeDesignStylesheetDisabled(doc, true)
    expect(doc.querySelector<HTMLLinkElement>('link')?.disabled).toBe(true)

    setThemeDesignStylesheetDisabled(doc, false)
    expect(doc.querySelector<HTMLLinkElement>('link')?.disabled).toBe(false)
  })
})
