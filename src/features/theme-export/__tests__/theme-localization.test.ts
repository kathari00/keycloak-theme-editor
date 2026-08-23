import type { Zippable } from 'fflate'
import { zipSync } from 'fflate'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isCuratedLocale,
  localeTagForPropertiesSuffix,
  propertiesSuffixForLocale,
} from '../../i18n/locale-catalog'
import { createQuickSettings, createThemeDocument } from '../../theme-document'
import { importJarFile } from '../jar-import-service'
import {
  buildLocaleOverrideMessages,
  prepareThemeExportFiles,
  withDeclaredLocales,
} from '../prepare-theme-export-files'
import { assembleThemeFiles } from '../theme-file-assembler'

const colorSettings = {
  colorPresetId: 'custom',
  colorPresetPrimaryColor: '#112233',
  colorPresetSecondaryColor: '#445566',
  colorPresetFontFamily: 'custom',
  colorPresetBgColor: '',
  colorPresetBorderRadius: 'rounded' as const,
  colorPresetCardShadow: 'subtle' as const,
  colorPresetHeadingFontFamily: 'custom',
}

const contentSettings = {
  showClientName: false,
  showRealmName: false,
  infoMessage: 'Welcome',
  imprintUrl: 'https://example.com/imprint',
  dataProtectionUrl: 'https://example.com/privacy',
  imprintLabel: 'Imprint',
  dataProtectionLabel: 'Data Protection',
}

function makeThemeDocument(overrides: Partial<Parameters<typeof createThemeDocument>[0]> = {}) {
  return createThemeDocument({
    themeId: 'v2',
    isPresetTheme: true,
    stylesCss: '.custom { color: red; }',
    stylesCssFiles: { 'css/styles.css': '.custom { color: red; }' },
    quickStartCss: ':root { --quickstart-primary-color-light: #112233; }',
    quickSettings: createQuickSettings(colorSettings, contentSettings),
    uploadedAssets: [],
    appliedAssets: {},
    ...overrides,
  })
}

function stubThemeFetch(existingLocaleBundles: Record<string, string> = {}) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/theme.properties')) {
      return new Response('parent=keycloak.v2\nstyles=css/styles.css')
    }
    if (url.endsWith('/messages/messages_en.properties')) {
      return new Response('doLogIn=Sign in')
    }
    const localeMatch = url.match(/messages_([A-Z_]+)\.properties$/i)
    if (localeMatch && existingLocaleBundles[localeMatch[1]]) {
      return new Response(existingLocaleBundles[localeMatch[1]])
    }
    if (url.endsWith('/template.ftl') || url.endsWith('/footer.ftl')) {
      return new Response('<main data-kc-state="preview">x</main>')
    }
    return new Response('', { status: 404 })
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('locale catalog', () => {
  it('maps Keycloak locale tags to the bundle filenames it actually ships', () => {
    expect(propertiesSuffixForLocale('de')).toBe('de')
    expect(propertiesSuffixForLocale('pt-BR')).toBe('pt_BR')
    // Keycloak declares region tags but ships script-based Chinese bundles.
    expect(propertiesSuffixForLocale('zh-CN')).toBe('zh_Hans')
    expect(propertiesSuffixForLocale('zh-TW')).toBe('zh_Hant')
  })

  it('round-trips every curated tag through its bundle suffix', () => {
    for (const tag of ['de', 'pt-BR', 'zh-CN', 'zh-TW', 'fa']) {
      expect(localeTagForPropertiesSuffix(propertiesSuffixForLocale(tag))).toBe(tag)
    }
  })

  it('rejects locales Keycloak does not ship translations for', () => {
    expect(isCuratedLocale('de')).toBe(true)
    expect(isCuratedLocale('kl')).toBe(false)
    expect(isCuratedLocale('zh_Hans')).toBe(false)
  })
})

describe('withDeclaredLocales', () => {
  it('leaves theme.properties untouched when only the base language is present', () => {
    expect(withDeclaredLocales('parent=keycloak.v2', ['en'])).toBe('parent=keycloak.v2')
  })

  it('declares the full list once languages are enabled', () => {
    expect(withDeclaredLocales('parent=keycloak.v2', ['en', 'de', 'fr']))
      .toBe('parent=keycloak.v2\nlocales=en,de,fr\n')
  })

  it('replaces an inherited declaration rather than appending a second one', () => {
    const result = withDeclaredLocales('locales=en,es\nparent=base', ['en', 'de'])
    expect(result).toBe('locales=en,de\nparent=base')
  })
})

describe('buildLocaleOverrideMessages', () => {
  it('writes only the keys that carry a translation', () => {
    const bundle = buildLocaleOverrideMessages({
      baseMessagesContent: '',
      overrides: { infoMessage: 'Willkommen', imprintLabel: 'Impressum' },
    })

    expect(bundle).toContain('infoMessage=Willkommen')
    expect(bundle).toContain('imprintLabel=Impressum')
    // Untranslated keys must be absent so Keycloak falls back to English.
    expect(bundle).not.toContain('dataProtectionLabel')
  })

  it('treats a blank translation as untranslated instead of writing an empty value', () => {
    const bundle = buildLocaleOverrideMessages({
      baseMessagesContent: '',
      overrides: { infoMessage: '   ', imprintLabel: '' },
    })

    expect(bundle).toBe('')
  })

  it('layers overrides onto a bundle the source theme already ships', () => {
    const bundle = buildLocaleOverrideMessages({
      baseMessagesContent: 'doLogIn=Anmelden\ninfoMessage=Alt\n',
      overrides: { infoMessage: 'Neu' },
    })

    expect(bundle).toContain('doLogIn=Anmelden')
    expect(bundle).toContain('infoMessage=Neu')
    expect(bundle).not.toContain('infoMessage=Alt')
  })
})

describe('prepareThemeExportFiles localization', () => {
  it('does not declare locales or emit bundles for a theme with no languages enabled', async () => {
    stubThemeFetch()

    const files = await prepareThemeExportFiles({
      themeDocument: makeThemeDocument(),
      themeName: 'mytheme',
    })

    expect(files.properties).not.toContain('locales=')
    expect(files.localeMessages).toEqual({})
  })

  it('declares enabled languages and emits one bundle per language', async () => {
    stubThemeFetch()

    const files = await prepareThemeExportFiles({
      themeDocument: makeThemeDocument({
        enabledLocales: ['de', 'zh-CN'],
        quickStartContentByLocale: {
          'de': { infoMessage: 'Willkommen', imprintLabel: 'Impressum' },
          'zh-CN': { infoMessage: '欢迎' },
        },
      }),
      themeName: 'mytheme',
    })

    expect(files.properties).toContain('locales=en,de,zh-CN')
    expect(Object.keys(files.localeMessages ?? {}).sort()).toEqual(['de', 'zh-CN'])
    expect(files.localeMessages?.de).toContain('infoMessage=Willkommen')
    expect(files.localeMessages?.de).toContain('imprintLabel=Impressum')
    expect(files.localeMessages?.de).not.toContain('dataProtectionLabel')
    expect(files.localeMessages?.['zh-CN']).toContain('infoMessage=欢迎')
  })

  it('keeps a language declared even when nothing is translated yet', async () => {
    stubThemeFetch()

    const files = await prepareThemeExportFiles({
      themeDocument: makeThemeDocument({ enabledLocales: ['fr'] }),
      themeName: 'mytheme',
    })

    expect(files.properties).toContain('locales=en,fr')
    expect(files.localeMessages?.fr).toBe('')
  })

  it('ignores locales Keycloak does not ship translations for', async () => {
    stubThemeFetch()

    const files = await prepareThemeExportFiles({
      themeDocument: makeThemeDocument({ enabledLocales: ['de', 'kl'] }),
      themeName: 'mytheme',
    })

    expect(files.properties).toContain('locales=en,de')
    expect(Object.keys(files.localeMessages ?? {})).toEqual(['de'])
  })

  it('preserves bundles the source theme already ships for that language', async () => {
    stubThemeFetch({ de: 'doLogIn=Anmelden\n' })

    const files = await prepareThemeExportFiles({
      themeDocument: makeThemeDocument({
        enabledLocales: ['de'],
        quickStartContentByLocale: { de: { infoMessage: 'Willkommen' } },
      }),
      themeName: 'mytheme',
    })

    expect(files.localeMessages?.de).toContain('doLogIn=Anmelden')
    expect(files.localeMessages?.de).toContain('infoMessage=Willkommen')
  })
})

describe('locale round-trip through a JAR', () => {
  async function exportThenImport(document: ReturnType<typeof makeThemeDocument>) {
    const files = await prepareThemeExportFiles({ themeDocument: document, themeName: 'mytheme' })
    const archive = await assembleThemeFiles(files, 'theme/mytheme', 'META-INF/')

    const entries: Zippable = Object.fromEntries(
      Object.entries(archive).map(([path, bytes]) => [path, [bytes, { level: 0 }]]),
    )
    const zipped = zipSync(entries)
    const file = {
      arrayBuffer: async () => zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength),
    } as File

    return await importJarFile(file)
  }

  it('restores enabled languages and their translations', async () => {
    stubThemeFetch()

    const result = await exportThenImport(makeThemeDocument({
      enabledLocales: ['de', 'zh-CN'],
      quickStartContentByLocale: {
        'de': { infoMessage: 'Willkommen', imprintLabel: 'Impressum' },
        'zh-CN': { infoMessage: '欢迎' },
      },
    }))

    expect(result.enabledLocales?.sort()).toEqual(['de', 'zh-CN'])
    expect(result.quickStartContentByLocale).toEqual({
      'de': { infoMessage: 'Willkommen', imprintLabel: 'Impressum' },
      'zh-CN': { infoMessage: '欢迎' },
    })
  })

  it('restores a declared language that has no translations yet', async () => {
    stubThemeFetch()

    const result = await exportThenImport(makeThemeDocument({ enabledLocales: ['fr'] }))

    expect(result.enabledLocales).toEqual(['fr'])
    expect(result.quickStartContentByLocale).toEqual({})
  })
})

describe('importJarFile localization', () => {
  async function importTheme(jarEntries: Zippable) {
    const zipped = zipSync(jarEntries)
    const file = {
      arrayBuffer: async () => zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength),
    } as File
    return await importJarFile(file)
  }

  function entry(text: string): [Uint8Array, { level: 0 }] {
    return [new TextEncoder().encode(text), { level: 0 }]
  }

  it('drops bundles for locales outside the curated set without failing the import', async () => {
    const result = await importTheme({
      theme: {
        demo: {
          login: {
            'theme.properties': entry('parent=base\nlocales=en,de,kl'),
            'messages': {
              'messages_en.properties': entry('infoMessage=Hi'),
              'messages_de.properties': entry('infoMessage=Hallo'),
              'messages_kl.properties': entry('infoMessage=Aluu'),
            },
          },
        },
      },
    })

    expect(result.enabledLocales).toEqual(['de'])
    expect(result.quickStartContentByLocale).toEqual({ de: { infoMessage: 'Hallo' } })
  })

  it('treats a hand-written bundle as an enabled language even without a locales declaration', async () => {
    const result = await importTheme({
      theme: {
        demo: {
          login: {
            'theme.properties': entry('parent=base'),
            'messages': {
              'messages_en.properties': entry('infoMessage=Hi'),
              'messages_fr.properties': entry('imprintLabel=Mentions légales'),
            },
          },
        },
      },
    })

    expect(result.enabledLocales).toEqual(['fr'])
    expect(result.quickStartContentByLocale).toEqual({
      fr: { imprintLabel: 'Mentions légales' },
    })
  })

  it('maps Chinese script bundles back to the tag Keycloak declares', async () => {
    const result = await importTheme({
      theme: {
        demo: {
          login: {
            'theme.properties': entry('parent=base\nlocales=en,zh-CN'),
            'messages': {
              'messages_en.properties': entry('infoMessage=Hi'),
              'messages_zh_Hans.properties': entry('infoMessage=欢迎'),
            },
          },
        },
      },
    })

    expect(result.enabledLocales).toEqual(['zh-CN'])
    expect(result.quickStartContentByLocale).toEqual({ 'zh-CN': { infoMessage: '欢迎' } })
  })
})
