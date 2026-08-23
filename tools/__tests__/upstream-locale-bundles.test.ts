import { describe, expect, it } from 'vitest'
import {
  isLoginMessagesEntry,
  parseLoginMessagesEntry,
  selectLocaleBundles,
} from '../upstream-locale-bundles'

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

describe('parseLoginMessagesEntry', () => {
  it('reads the theme id and bundle suffix out of a jar entry path', () => {
    expect(parseLoginMessagesEntry('theme/keycloak.v2/login/messages/messages_de.properties')).toEqual({
      upstreamThemeId: 'keycloak.v2',
      suffix: 'de',
      localeTag: 'de',
    })
  })

  it('maps Keycloak bundle suffixes back to the tags it declares in locales=', () => {
    expect(parseLoginMessagesEntry('theme/base/login/messages/messages_zh_Hans.properties')?.localeTag).toBe('zh-CN')
    expect(parseLoginMessagesEntry('theme/base/login/messages/messages_pt_BR.properties')?.localeTag).toBe('pt-BR')
  })

  it('ignores entries outside a login messages directory', () => {
    const nonMatches = [
      'theme/base/account/messages/messages_de.properties',
      'theme/base/login/theme.properties',
      'theme/base/login/messages/',
      'theme/base/login/resources/css/login.css',
    ]

    for (const entryName of nonMatches) {
      expect(isLoginMessagesEntry(entryName)).toBe(false)
      expect(parseLoginMessagesEntry(entryName)).toBeNull()
    }
  })
})

describe('selectLocaleBundles', () => {
  const entries: Record<string, Uint8Array> = {
    'theme/base/login/messages/messages_en.properties': bytes('doLogIn=Sign in'),
    'theme/base/login/messages/messages_de.properties': bytes('doLogIn=Anmelden'),
    'theme/base/login/messages/messages_zh_Hans.properties': bytes('doLogIn=登录'),
    'theme/keycloak.v2/login/messages/messages_sv.properties': bytes('doLogIn=Logga in'),
    'theme/admin/login/messages/messages_de.properties': bytes('unused=1'),
  }

  it('groups bundles per theme and drops themes that are not synced', () => {
    const result = selectLocaleBundles(entries, ['base', 'keycloak.v2'])

    expect([...result.keys()].sort()).toEqual(['base', 'keycloak.v2'])
    expect(result.get('keycloak.v2')?.get('sv')).toBe('doLogIn=Logga in')
  })

  it('excludes the base language, which is synced from the tagged sources', () => {
    const result = selectLocaleBundles(entries, ['base'])

    expect([...(result.get('base')?.keys() ?? [])].sort()).toEqual(['de', 'zh_Hans'])
  })

  it('decodes bundle contents as UTF-8', () => {
    const result = selectLocaleBundles(entries, ['base'])

    expect(result.get('base')?.get('zh_Hans')).toBe('doLogIn=登录')
  })
})
