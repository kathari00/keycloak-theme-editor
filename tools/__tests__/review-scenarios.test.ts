import { describe, expect, it } from 'vitest'
import { resolveContextMocks } from '../generate-preview'
import { addReviewScenarios, assertReviewCoverage } from '../v2-migration-prototype/scenarios'

describe('upstream review coverage', () => {
  it('fails if a renderer silently skips a default or state', () => {
    const mocks = { pages: { 'login.ftl': {}, 'login.ftl@error': {} }, locales: [] }
    expect(() => assertReviewCoverage(mocks, { 'login.html': { default: '<html>' } })).toThrow('login.ftl@error')
    expect(() => assertReviewCoverage(mocks, { 'login.html': { default: '<html>', error: '<html>' } })).not.toThrow()
  })

  it('uses absent values for presence-based flags without changing defaults', () => {
    const mocks = resolveContextMocks()
    const defaults = JSON.stringify(mocks.pages['register.ftl'])
    addReviewScenarios(mocks)
    expect(mocks.pages['register.ftl@no-password'].passwordRequired).toBeNull()
    expect(mocks.pages['register.ftl@no-terms'].termsAcceptanceRequired).toBeNull()
    expect(JSON.stringify(mocks.pages['register.ftl'])).toBe(defaults)
    expect(mocks.pages['login.ftl@long-content']).toBeDefined()
    for (const page of Object.keys(mocks.pages).filter(key => !key.includes('@') && key !== 'login.ftl')) {
      expect(mocks.pages[`${page}@alert-error`]).toBeUndefined()
      expect(mocks.pages[`${page}@long-content`]).toBeUndefined()
    }
  })
})
