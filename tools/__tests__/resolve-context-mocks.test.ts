import { describe, expect, it } from 'vitest'
import { resolveContextMocks } from '../generate-preview'

describe('resolveContextMocks', () => {
  it('produces entries for all base mock pages', () => {
    const { pages } = resolveContextMocks()
    expect(pages['login.ftl']).toBeDefined()
    expect(pages['register.ftl']).toBeDefined()
    expect(pages['error.ftl']).toBeDefined()
    expect(pages['info.ftl']).toBeDefined()
  })

  it('every base page entry has a matching pageId field', () => {
    const { pages } = resolveContextMocks()
    for (const [key, context] of Object.entries(pages)) {
      const pageId = key.split('@')[0]
      expect(context.pageId).toBe(pageId)
    }
  })

  it('applies built-in states as pageId@stateName entries', () => {
    const { pages } = resolveContextMocks()
    expect(pages['login.ftl@minimal']).toBeDefined()
    expect(pages['login.ftl@invalid-state']).toBeDefined()
  })

  it('built-in states inherit from the base page context', () => {
    const { pages } = resolveContextMocks()
    const base = pages['login.ftl']
    const state = pages['login.ftl@minimal']
    expect(state.pageId).toBe('login.ftl')
    expect((state as any).url).toBeDefined()
    expect((state as any).realm).toBeDefined()
    // state overrides should differ from base
    expect((state as any).realm.rememberMe).toBe(false)
    expect((base as any).realm.rememberMe).toBe(true)
  })

  it('merges user page overrides into matching base mock pages', () => {
    const { pages } = resolveContextMocks({
      pages: { 'login.ftl': { custom: 'value' } },
      states: {},
    })
    expect((pages['login.ftl'] as any).custom).toBe('value')
    // base fields should still be present
    expect(pages['login.ftl'].pageId).toBe('login.ftl')
    expect((pages['login.ftl'] as any).url).toBeDefined()
  })

  it('user overrides deep-merge with base, not replace', () => {
    const { pages } = resolveContextMocks({
      pages: { 'login.ftl': { realm: { displayName: 'Custom Realm' } } },
      states: {},
    })
    const realm = (pages['login.ftl'] as any).realm
    expect(realm.displayName).toBe('Custom Realm')
    // other realm fields from base should survive
    expect(realm.name).toBeDefined()
    expect(realm.internationalizationEnabled).toBeDefined()
  })

  it('creates entries for user-only custom pages not in base mocks', () => {
    const { pages } = resolveContextMocks({
      pages: { 'my-custom-page.ftl': { myField: 'hello' } },
      states: {},
    })
    expect(pages['my-custom-page.ftl']).toBeDefined()
    expect((pages['my-custom-page.ftl'] as any).myField).toBe('hello')
  })

  it('custom pages are seeded from login.ftl base context', () => {
    const { pages } = resolveContextMocks({
      pages: { 'my-custom-page.ftl': {} },
      states: {},
    })
    const custom = pages['my-custom-page.ftl'] as any
    expect(custom.pageId).toBe('my-custom-page.ftl')
    expect(custom.url).toBeDefined()
    expect(custom.realm).toBeDefined()
  })

  it('applies user states to known pages', () => {
    const { pages } = resolveContextMocks({
      pages: {},
      states: { 'login.ftl': { 'my-state': { custom: 'stateValue' } } },
    })
    expect(pages['login.ftl@my-state']).toBeDefined()
    expect((pages['login.ftl@my-state'] as any).custom).toBe('stateValue')
    expect(pages['login.ftl@my-state'].pageId).toBe('login.ftl')
  })

  it('applies user states to custom pages', () => {
    const { pages } = resolveContextMocks({
      pages: { 'my-page.ftl': { base: true } },
      states: { 'my-page.ftl': { 'variant-a': { extra: 'data' } } },
    })
    expect(pages['my-page.ftl@variant-a']).toBeDefined()
    expect((pages['my-page.ftl@variant-a'] as any).base).toBe(true)
    expect((pages['my-page.ftl@variant-a'] as any).extra).toBe('data')
  })

  it('user state with same name as built-in state overwrites it', () => {
    const { pages } = resolveContextMocks({
      pages: {},
      states: { 'login.ftl': { minimal: { custom: 'override' } } },
    })
    expect((pages['login.ftl@minimal'] as any).custom).toBe('override')
  })

  it('does not mutate base mocks between calls', () => {
    const first = resolveContextMocks({
      pages: { 'login.ftl': { realm: { displayName: 'First' } } },
      states: {},
    })
    const second = resolveContextMocks()
    expect((first.pages['login.ftl'] as any).realm.displayName).toBe('First')
    expect((second.pages['login.ftl'] as any).realm.displayName).not.toBe('First')
  })

  it('preserves unknown keys without breaking known mock generation', () => {
    const { pages } = resolveContextMocks({
      pages: {
        'login.ftl': {
          completelyCustomField: { nested: true },
          anotherOne: 'value',
        },
      },
      states: {},
    })

    expect((pages['login.ftl'] as any).completelyCustomField).toEqual({ nested: true })
    expect((pages['login.ftl'] as any).anotherOne).toBe('value')
    expect((pages['login.ftl'] as any).url).toBeDefined()
    expect((pages['login.ftl'] as any).realm).toBeDefined()
  })

  it('deep-merges profile.attributesByName without replacing sibling attributes', () => {
    const { pages } = resolveContextMocks({
      pages: {
        'register.ftl': {
          profile: {
            attributesByName: {
              email: {
                readOnly: false,
                annotations: { helpText: 'custom' },
              },
            },
          },
        },
      },
      states: {},
    })

    const attributesByName = (pages['register.ftl'] as any).profile.attributesByName
    expect(attributesByName.email.readOnly).toBe(false)
    expect(attributesByName.email.annotations.helpText).toBe('custom')
    expect(attributesByName.username).toBeDefined()
    expect(attributesByName.favoritePet).toBeDefined()
  })

  it('replaces social.providers array while preserving sibling social fields', () => {
    const { pages } = resolveContextMocks({
      pages: {
        'login.ftl': {
          social: {
            providers: [{ alias: 'custom-idp', displayName: 'Custom IDP', loginUrl: '/custom' }],
          },
        },
      },
      states: {},
    })

    const social = (pages['login.ftl'] as any).social
    expect(social.displayInfo).toBe(true)
    expect(social.providers).toEqual([{ alias: 'custom-idp', displayName: 'Custom IDP', loginUrl: '/custom' }])
  })

  it('deep-merges messagesPerField by key', () => {
    const { pages } = resolveContextMocks({
      pages: {
        'login.ftl': {
          messagesPerField: {
            username: 'Wrong username',
            password: 'Wrong password',
          },
        },
      },
      states: {},
    })

    expect((pages['login.ftl'] as any).messagesPerField).toEqual({
      username: 'Wrong username',
      password: 'Wrong password',
    })
  })
})
