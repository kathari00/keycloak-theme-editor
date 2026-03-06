import { describe, expect, it, vi } from 'vitest'
import { applyQuickStartTemplateContent } from '../lib/quickstart-template-content'

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

const baseFixture = `
<!doctype html>
<html><body>
  <div id="kc-header-wrapper">
    <span id="kc-realm-name" data-kc-state="realm-name">My Realm</span>
    <span id="kc-client-name" data-kc-state="client-name">Client App</span>
  </div>
  <div id="kc-content-wrapper">
    <div id="kc-info-message" data-kc-state="info-message">
      <span data-kc-state="info-message-text"></span>
    </div>
  </div>
  <div class="kc-footer-legal-links" data-kc-state="footer-legal-links">
    <a id="kc-imprint-link" data-kc-state="imprint-link"></a>
    <a id="kc-data-protection-link" data-kc-state="data-protection-link"></a>
  </div>
  <div id="kc-registration">
    <span>New user? <a href="#">Register</a></span>
  </div>
</body></html>
`

describe('applyQuickStartTemplateContent', () => {
  it('updates existing placeholder text nodes', () => {
    const doc = makeDoc(baseFixture)
    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: 'Please contact support.',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: '',
      noAccountMessage: 'No account?',
      doRegisterLabel: 'Create account',
    })

    expect(doc.getElementById('kc-realm-name')?.textContent).toBe('My Realm')
    expect(doc.getElementById('kc-info-message')?.textContent).toContain('Please contact support.')
    expect(doc.getElementById('kc-imprint-link')?.getAttribute('href')).toBe('https://example.com/imprint')
    expect(doc.getElementById('kc-data-protection-link')?.style.display).toBe('none')
    expect(doc.querySelector('#kc-registration a')?.textContent).toBe('Create account')
  })

  it('applies noAccount message when a registration text node exists', () => {
    const doc = makeDoc(baseFixture)
    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: '',
      imprintUrl: '#',
      dataProtectionUrl: '#',
      noAccountMessage: 'No account',
      doRegisterLabel: 'Register',
    })

    const textNodes = Array.from(doc.querySelector('#kc-registration span')?.childNodes ?? []).filter(node => node.nodeType === Node.TEXT_NODE)
    expect(textNodes[0]?.textContent).toBe('No account ')
  })

  it('does not call document.createElement for placeholder updates', () => {
    const doc = makeDoc(baseFixture)
    const createElementSpy = vi.spyOn(doc, 'createElement')
    applyQuickStartTemplateContent(doc, {
      showClientName: true,
      showRealmName: true,
      infoMessage: 'Welcome',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: 'https://example.com/privacy',
    })
    expect(createElementSpy).not.toHaveBeenCalled()
    createElementSpy.mockRestore()
  })
})
