import { describe, expect, it } from 'vitest'
import { syncPreviewDarkModeClasses } from '../lib/dark-mode-classes'

function createPreviewDocument(): Document {
  return new DOMParser().parseFromString('<!doctype html><html><body></body></html>', 'text/html')
}

describe('syncPreviewDarkModeClasses', () => {
  it('applies the dark-mode classes provided by theme config', () => {
    const doc = createPreviewDocument()

    syncPreviewDarkModeClasses(doc, ['kcDarkModeClass', 'pf-v5-theme-dark'], true)

    expect(doc.documentElement.classList.contains('kcDarkModeClass')).toBe(true)
    expect(doc.documentElement.classList.contains('pf-v5-theme-dark')).toBe(true)
    expect(doc.body.classList.contains('kcDarkModeClass')).toBe(true)
    expect(doc.body.classList.contains('pf-v5-theme-dark')).toBe(true)
  })

  it('removes all dark-mode classes when dark mode is disabled', () => {
    const doc = createPreviewDocument()
    syncPreviewDarkModeClasses(doc, ['kcDarkModeClass', 'pf-v5-theme-dark'], true)

    syncPreviewDarkModeClasses(doc, ['kcDarkModeClass', 'pf-v5-theme-dark'], false)

    expect(doc.documentElement.className).toBe('')
    expect(doc.body.className).toBe('')
  })

  it('falls back to kcDarkModeClass when theme config does not provide a class list', () => {
    const doc = createPreviewDocument()

    syncPreviewDarkModeClasses(doc, undefined, true)

    expect(doc.documentElement.classList.contains('kcDarkModeClass')).toBe(true)
    expect(doc.body.classList.contains('kcDarkModeClass')).toBe(true)
  })
})
