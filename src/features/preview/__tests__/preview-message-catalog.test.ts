import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  annotatePreviewMessageKeys,
  findPreviewMessageElement,
} from '../lib/preview-message-catalog'

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('preview message catalog', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const text = url.includes('messages_tr.properties')
        ? 'password=Parola\ninvalidUserMessage=Geçersiz kullanıcı adı veya şifre.\n'
        : [
            'password=Password',
            'password-display-name=Password',
            'invalidUserMessage=Invalid username or password.',
            'accountTemporarilyDisabledMessage=Invalid username or password.',
          ].join('\n')
      return new Response(text)
    }))
  })

  it('resolves a parent with exactly one translated descendant', async () => {
    const doc = makeDoc('<div id="field"><label for="password"><span>Parola</span></label><input id="password" type="password"></div>')
    await annotatePreviewMessageKeys(doc, 'tr')

    const labelText = doc.querySelector('label span')!
    expect(labelText.getAttribute('data-kc-i18n-key')).toBe('password')
    expect(findPreviewMessageElement(doc.getElementById('field'))).toBe(labelText)
    expect(findPreviewMessageElement(doc.getElementById('password'))).toBeNull()
  })

  it('does not guess when a parent contains multiple translated messages', async () => {
    const doc = makeDoc('<div id="field"><span>Password</span><span>Invalid username or password.</span></div>')
    await annotatePreviewMessageKeys(doc, 'tr')

    expect(findPreviewMessageElement(doc.getElementById('field'))).toBeNull()
  })

  it('recognizes an English fallback error in a localized preview', async () => {
    const doc = makeDoc('<span id="input-error">Invalid username or password.</span>')
    await annotatePreviewMessageKeys(doc, 'tr')

    expect(doc.getElementById('input-error')?.getAttribute('data-kc-i18n-key')).toBe('invalidUserMessage')
  })
})
