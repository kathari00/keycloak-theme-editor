import { describe, expect, it } from 'vitest'
import { isValidExternalLegalLinkUrl, normalizeExternalLegalLinkUrl, resolveOpenableLegalLinkUrl } from '../legal-link-url'

describe('legal-link-url', () => {
  it('keeps absolute http/https links unchanged', () => {
    expect(normalizeExternalLegalLinkUrl('https://example.com/imprint')).toBe('https://example.com/imprint')
    expect(normalizeExternalLegalLinkUrl('http://example.com/privacy')).toBe('http://example.com/privacy')
  })

  it('rejects non-absolute or unsupported schemes', () => {
    expect(normalizeExternalLegalLinkUrl('example.com/imprint')).toBe('')
    expect(normalizeExternalLegalLinkUrl('/internal')).toBe('')
    expect(normalizeExternalLegalLinkUrl('mailto:legal@example.com')).toBe('')
    expect(normalizeExternalLegalLinkUrl('javascript:alert(1)')).toBe('')
  })

  it('exposes strict boolean validation helper', () => {
    expect(isValidExternalLegalLinkUrl('https://example.com/imprint')).toBe(true)
    expect(isValidExternalLegalLinkUrl('http://example.com/imprint')).toBe(true)
    expect(isValidExternalLegalLinkUrl('example.com/imprint')).toBe(false)
    expect(isValidExternalLegalLinkUrl('')).toBe(false)
  })

  it('returns null for invalid open targets', () => {
    expect(resolveOpenableLegalLinkUrl('/internal')).toBeNull()
    expect(resolveOpenableLegalLinkUrl('#')).toBeNull()
    expect(resolveOpenableLegalLinkUrl('javascript:alert(1)')).toBeNull()
  })

  it('returns external target for valid values', () => {
    expect(resolveOpenableLegalLinkUrl('https://example.com/imprint')).toBe('https://example.com/imprint')
  })
})
