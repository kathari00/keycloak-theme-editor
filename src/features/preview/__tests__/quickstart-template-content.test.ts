import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyQuickStartTemplateContent } from '../quickstart-template-content'
import { sanitizePreviewHtml } from '../sanitize-preview-html'

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

function applyLegalLinkContentTwice(doc: Document) {
  const options = {
    showClientName: true,
    showRealmName: true,
    infoMessage: '',
    imprintUrl: 'https://example.com/imprint',
    dataProtectionUrl: 'https://example.com/privacy',
  }
  applyQuickStartTemplateContent(doc, options)
  applyQuickStartTemplateContent(doc, options)
}

describe('applyQuickStartTemplateContent', () => {
  it('wraps plain header text into realm/client nodes', () => {
    const doc = makeDoc(`
      <!doctype html>
      <html><body>
        <div id="kc-header-wrapper">myrealm</div>
      </body></html>
    `)

    applyQuickStartTemplateContent(doc, {
      showClientName: false,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: '',
      dataProtectionUrl: '',
    })

    const realm = doc.querySelector('#kc-header-wrapper #kc-realm-name')
    const client = doc.querySelector('#kc-header-wrapper #kc-client-name')
    expect(realm?.textContent).toBe('myrealm')
    expect(client?.textContent).toBeTruthy()
  })

  it('creates and syncs info message node and text', () => {
    const doc = makeDoc(`
      <!doctype html>
      <html><body>
        <div id="kc-content-wrapper"><div id="kc-form"></div></div>
      </body></html>
    `)

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: 'Hello world',
      imprintUrl: '',
      dataProtectionUrl: '',
    })

    const message = doc.getElementById('kc-info-message')
    expect(message).toBeTruthy()
    expect(message?.style.display).toBe('')
    expect(message?.textContent).toContain('Hello world')
  })

  it('overrides registration prompt and label from message properties', () => {
    const doc = makeDoc(`
      <!doctype html>
      <html><body>
        <div id="kc-registration">
          <span>New user? <a href="#">Register</a></span>
        </div>
      </body></html>
    `)

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: '',
      dataProtectionUrl: '',
      noAccountMessage: 'No account?',
      doRegisterLabel: 'Create account',
    })

    const span = doc.querySelector('#kc-registration > span')
    const link = doc.querySelector('#kc-registration > span > a')
    expect(span?.textContent?.trim()).toBe('No account? Create account')
    expect(link?.textContent).toBe('Create account')
  })

  it('supports empty noAccount message while keeping register label', () => {
    const doc = makeDoc(`
      <!doctype html>
      <html><body>
        <div id="kc-registration">
          <span>New user? <a href="#">Register</a></span>
        </div>
      </body></html>
    `)

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: '',
      dataProtectionUrl: '',
      noAccountMessage: '',
      doRegisterLabel: 'Register',
    })

    const span = doc.querySelector('#kc-registration > span')
    expect(span?.textContent?.trim()).toBe('Register')
  })

  it('does not throw when preview document body is unavailable', () => {
    const doc = makeDoc('<!doctype html><html><head></head><body></body></html>')
    doc.body.remove()

    expect(() => applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: 'Hello world',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: 'https://example.com/privacy',
    })).not.toThrow()
  })

  it('hides v2 info message by default and clears key placeholder', () => {
    const pagesPath = path.resolve(process.cwd(), 'src/features/preview/generated/pages.json')
    const pages = JSON.parse(readFileSync(pagesPath, 'utf8'))
    const html = pages.variants.v2['login.html']?.default as string
    const doc = makeDoc(sanitizePreviewHtml(html))

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: '',
      dataProtectionUrl: '',
    })

    const message = doc.getElementById('kc-info-message') as HTMLElement | null
    const textTarget = message?.querySelector('[data-kc-state="info-message-text"], .kcAlertTitleClass, .kc-feedback-text') as HTMLElement | null

    expect(message).toBeTruthy()
    expect(message?.style.display).toBe('none')
    expect(textTarget?.textContent?.trim()).toBe('')
    expect(message?.getAttribute('data-kc-i18n-key')).toBeNull()
  })

  it('renders custom v2 info message text instead of key placeholder', () => {
    const pagesPath = path.resolve(process.cwd(), 'src/features/preview/generated/pages.json')
    const pages = JSON.parse(readFileSync(pagesPath, 'utf8'))
    const html = pages.variants.v2['login.html']?.default as string
    const doc = makeDoc(sanitizePreviewHtml(html))

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: 'Please contact support before continuing.',
      imprintUrl: '',
      dataProtectionUrl: '',
    })

    const message = doc.getElementById('kc-info-message') as HTMLElement | null
    const textTarget = message?.querySelector('[data-kc-state="info-message-text"], .kcAlertTitleClass, .kc-feedback-text') as HTMLElement | null

    expect(message).toBeTruthy()
    expect(message?.style.display).toBe('')
    expect(textTarget?.textContent?.trim()).toBe('Please contact support before continuing.')
    expect(message?.getAttribute('data-kc-i18n-key')).toBeNull()
  })

  it('creates legal links and syncs href visibility', () => {
    const doc = makeDoc(`
      <!doctype html>
      <html><body>
        <div class="kcFormCardClass"></div>
      </body></html>
    `)

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: '',
    })

    const imprint = doc.querySelector('a[data-kc-state="imprint-link"]') as HTMLAnchorElement | null
    const dataProtection = doc.querySelector('a[data-kc-state="data-protection-link"]') as HTMLAnchorElement | null

    expect(imprint?.href).toBe('https://example.com/imprint')
    expect(imprint?.style.display).toBe('')
    expect(imprint?.target).toBe('_blank')
    expect(imprint?.rel).toContain('noopener')
    expect(imprint?.rel).toContain('noreferrer')
    expect(dataProtection).toBeTruthy()
    expect(dataProtection?.style.display).toBe('none')
  })

  it('hides legal links when inputs are not absolute urls with scheme', () => {
    const doc = makeDoc(`
      <!doctype html>
      <html><body>
        <div class="kcFormCardClass"></div>
      </body></html>
    `)

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: 'example.com/imprint',
      dataProtectionUrl: 'www.example.com/privacy',
    })

    const imprint = doc.querySelector('a[data-kc-state="imprint-link"]') as HTMLAnchorElement | null
    const dataProtection = doc.querySelector('a[data-kc-state="data-protection-link"]') as HTMLAnchorElement | null

    expect(imprint?.getAttribute('href')).toBe('#')
    expect(dataProtection?.getAttribute('href')).toBe('#')
    expect(imprint?.style.display).toBe('none')
    expect(dataProtection?.style.display).toBe('none')
  })

  it('updates existing legal links to open in a new tab', () => {
    const doc = makeDoc(`
      <!doctype html>
      <html><body>
        <div class="kcFormCardClass">
          <a data-kc-state="imprint-link" href="#">Imprint</a>
          <a data-kc-state="data-protection-link" href="#">Data Protection</a>
        </div>
      </body></html>
    `)

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: 'https://example.com/privacy',
    })

    const imprint = doc.querySelector('a[data-kc-state="imprint-link"]') as HTMLAnchorElement | null
    const dataProtection = doc.querySelector('a[data-kc-state="data-protection-link"]') as HTMLAnchorElement | null

    expect(imprint?.target).toBe('_blank')
    expect(imprint?.rel).toContain('noopener')
    expect(imprint?.rel).toContain('noreferrer')
    expect(dataProtection?.target).toBe('_blank')
    expect(dataProtection?.rel).toContain('noopener')
    expect(dataProtection?.rel).toContain('noreferrer')
  })

  it('reuses placeholder footer legal links without creating duplicates', () => {
    const doc = makeDoc(`
      <!doctype html>
      <html><body>
        <div class="kc-footer-legal-links">
          <a href="imprintUrl">imprintLabel</a>
          <a href="dataProtectionUrl">dataProtectionLabel</a>
        </div>
      </body></html>
    `)

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: 'https://example.com/privacy',
    })

    const imprintLinks = doc.querySelectorAll('a[data-kc-state="imprint-link"], a#kc-imprint-link')
    const dataProtectionLinks = doc.querySelectorAll('a[data-kc-state="data-protection-link"], a#kc-data-protection-link')
    const legalLinks = doc.querySelectorAll('.kc-footer-legal-links a')

    expect(imprintLinks).toHaveLength(1)
    expect(dataProtectionLinks).toHaveLength(1)
    expect(legalLinks).toHaveLength(2)

    const imprint = imprintLinks[0] as HTMLAnchorElement
    const dataProtection = dataProtectionLinks[0] as HTMLAnchorElement
    expect(imprint.href).toBe('https://example.com/imprint')
    expect(imprint.textContent).toBe('Imprint')
    expect(dataProtection.href).toBe('https://example.com/privacy')
    expect(dataProtection.textContent).toBe('Data Protection')
  })

  it('reuses placeholder legal links even without a footer wrapper', () => {
    const doc = makeDoc(`
      <!doctype html>
      <html><body>
        <div>
          <a href="imprintUrl">imprintLabel</a>
          <a href="dataProtectionUrl">dataProtectionLabel</a>
        </div>
      </body></html>
    `)

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: 'https://example.com/privacy',
    })

    const imprintLinks = doc.querySelectorAll('a[data-kc-state="imprint-link"], a#kc-imprint-link')
    const dataProtectionLinks = doc.querySelectorAll('a[data-kc-state="data-protection-link"], a#kc-data-protection-link')

    expect(imprintLinks).toHaveLength(1)
    expect(dataProtectionLinks).toHaveLength(1)
    expect(doc.body.textContent).not.toContain('imprintLabel')
    expect(doc.body.textContent).not.toContain('dataProtectionLabel')
  })

  it('deduplicates placeholder and already-normalized legal links', () => {
    const doc = makeDoc(`
      <!doctype html>
      <html><body>
        <div class="kc-footer-legal-links">
          <a href="imprintUrl">imprintLabel</a>
          <a href="dataProtectionUrl">dataProtectionLabel</a>
        </div>
        <div class="kc-footer-legal-links">
          <a data-kc-state="imprint-link" id="kc-imprint-link" href="https://example.com/imprint">Imprint</a>
          <a data-kc-state="data-protection-link" id="kc-data-protection-link" href="https://example.com/privacy">Data Protection</a>
        </div>
      </body></html>
    `)

    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: 'https://example.com/privacy',
    })

    const imprintLinks = doc.querySelectorAll('a[data-kc-state="imprint-link"], a#kc-imprint-link')
    const dataProtectionLinks = doc.querySelectorAll('a[data-kc-state="data-protection-link"], a#kc-data-protection-link')

    expect(imprintLinks).toHaveLength(1)
    expect(dataProtectionLinks).toHaveLength(1)
  })

  it('normalizes legal links in generated preview base page html', () => {
    const pagesPath = path.resolve(process.cwd(), 'src/features/preview/generated/pages.json')
    const pages = JSON.parse(readFileSync(pagesPath, 'utf8'))
    const html = pages.variants.base['login.html']?.default as string
    const doc = makeDoc(sanitizePreviewHtml(html))

    applyLegalLinkContentTwice(doc)

    const imprintLinks = doc.querySelectorAll('a[data-kc-state="imprint-link"], a#kc-imprint-link')
    const dataProtectionLinks = doc.querySelectorAll('a[data-kc-state="data-protection-link"], a#kc-data-protection-link')

    expect(imprintLinks).toHaveLength(1)
    expect(dataProtectionLinks).toHaveLength(1)
    expect(doc.body.textContent).not.toContain('imprintLabel')
    expect(doc.body.textContent).not.toContain('dataProtectionLabel')
  })

  it('keeps v2 legal links in dedicated main footer from loginFooter', () => {
    const pagesPath = path.resolve(process.cwd(), 'src/features/preview/generated/pages.json')
    const pages = JSON.parse(readFileSync(pagesPath, 'utf8'))
    const html = pages.variants.v2['login.html']?.default as string
    const doc = makeDoc(sanitizePreviewHtml(html))

    applyLegalLinkContentTwice(doc)

    const footerLinks = doc.querySelectorAll('.kc-footer-legal-links a[data-kc-state]')
    const kcInfoLinks = doc.querySelectorAll('#kc-info a[data-kc-state=\"imprint-link\"], #kc-info a[data-kc-state=\"data-protection-link\"]')
    const wrapper = doc.querySelector('.kc-footer-legal-links') as HTMLElement | null
    const kcInfo = doc.querySelector('#kc-info') as HTMLElement | null
    const legalFooter = doc.querySelector('.kc-legal-footer') as HTMLElement | null
    const loginMain = doc.querySelector('.pf-v5-c-login__main') as HTMLElement | null

    expect(footerLinks).toHaveLength(2)
    expect(kcInfoLinks).toHaveLength(0)
    expect(wrapper).toBeTruthy()
    expect(kcInfo).toBeTruthy()
    expect(legalFooter).toBeTruthy()
    expect(wrapper?.parentElement).toBe(legalFooter)
    expect(legalFooter?.parentElement).toBe(loginMain)
    expect(loginMain?.lastElementChild).toBe(legalFooter)
  })
})
