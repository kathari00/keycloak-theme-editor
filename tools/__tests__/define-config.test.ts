import { describe, expect, it } from 'vitest'
import { defineConfig, defineStates } from '../../bin/kc-mocks.src.ts'

describe('defineConfig', () => {
  it('returns the input unchanged', () => {
    const config = { pages: { 'login.ftl': { realm: { displayName: 'Test' } } } }
    expect(defineConfig(config)).toBe(config)
  })

  it('accepts known page ids', () => {
    const config = defineConfig({
      pages: {
        'login.ftl': {
          realm: { displayName: 'Test', rememberMe: true },
          login: { username: 'john.doe' },
          social: {
            providers: [{ alias: 'github', displayName: 'GitHub' }],
          },
        },
        'register.ftl': {
          passwordRequired: true,
          profile: {
            attributesByName: {
              email: {
                validators: {
                  email: { 'ignore.empty.value': true },
                },
              },
            },
          },
        },
      },
    })
    expect(config.pages).toBeDefined()
  })

  it('accepts arbitrary custom page ids', () => {
    const config = defineConfig({
      pages: {
        'my-custom-page.ftl': { myField: 'value' },
      },
    })
    expect(config.pages?.['my-custom-page.ftl']).toEqual({ myField: 'value' })
  })
})

describe('defineStates', () => {
  it('returns the input unchanged', () => {
    const states = { 'login.ftl': { 'my-state': { custom: true } } }
    expect(defineStates(states)).toBe(states)
  })

  it('accepts known page ids with state variants', () => {
    const states = defineStates({
      'login.ftl': {
        'with-error': {
          message: { type: 'error', summary: 'fail' },
          realm: { resetPasswordAllowed: false },
        },
      },
    })
    expect(states['login.ftl']).toBeDefined()
  })

  it('accepts arbitrary custom page ids', () => {
    const states = defineStates({
      'my-custom-page.ftl': {
        'variant-a': { extra: 'data' },
      },
    })
    expect(states['my-custom-page.ftl']).toBeDefined()
  })
})
