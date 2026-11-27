import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { injectQuickStartPlaceholders } from '../generate-preview'

function inject(body: string): Document {
  return new JSDOM(injectQuickStartPlaceholders(`<html><body>${body}</body></html>`)).window.document
}

describe('injectQuickStartPlaceholders', () => {
  it('does not take over a page body that uses #kc-info-message', () => {
    const doc = inject(`
      <div id="kc-content-wrapper">
        <div id="kc-info-message"><p class="instruction">You need to perform the following actions</p></div>
      </div>`)

    const pageBody = doc.querySelector('.instruction')!.parentElement!
    expect(pageBody.hasAttribute('data-kc-state')).toBe(false)

    const quickStart = doc.querySelector('[data-kc-state="info-message"]')!
    expect(quickStart).not.toBe(pageBody)
    expect(quickStart.contains(pageBody)).toBe(false)
    expect(doc.querySelectorAll('#kc-info-message')).toHaveLength(1)
  })

  it('reuses the template placeholder that is already tagged', () => {
    const doc = inject(`
      <div id="kc-content-wrapper">
        <div id="kc-info-message" data-kc-state="info-message"><span class="kc-feedback-text"></span></div>
      </div>`)

    const placeholders = doc.querySelectorAll('[data-kc-state="info-message"]')
    expect(placeholders).toHaveLength(1)
    expect(placeholders[0].id).toBe('kc-info-message')
  })

  it('creates the placeholder with its id when the page has none', () => {
    const doc = inject('<div id="kc-content-wrapper"><form id="kc-form-login"></form></div>')

    const placeholder = doc.querySelector('[data-kc-state="info-message"]')!
    expect(placeholder.id).toBe('kc-info-message')
    expect(placeholder.parentElement!.firstElementChild).toBe(placeholder)
  })
})
