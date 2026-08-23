import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQuickSettings, createThemeDocument } from '../../theme-document'
import { fetchDefaultAssetBlobs } from '../default-asset-blobs'
import {
  buildExportCssFiles,
  buildOverriddenMessages,
  prepareThemeExportFiles,
} from '../prepare-theme-export-files'
import { parseQuickSettingsFromImportedTheme } from '../quick-settings-import'

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
  showClientName: true,
  showRealmName: false,
  infoMessage: 'Line one\nLine two',
  imprintUrl: 'https://example.com/imprint',
  dataProtectionUrl: 'invalid-url',
  imprintLabel: 'Imprint',
  dataProtectionLabel: 'Data Protection',
}

const defaultBackgroundAsset = {
  id: 'default-bg',
  name: 'keycloak-bg-darken.svg',
  category: 'background' as const,
  mimeType: 'image/svg+xml',
  base64Data: '',
  size: 0,
  createdAt: 0,
  isDefault: true,
}

function makeThemeDocument() {
  return createThemeDocument({
    themeId: 'v2',
    isPresetTheme: true,
    stylesCss: '.custom { color: red; }',
    stylesCssFiles: {
      'css/quick-start.css': ':root {}',
      'css/styles.css': '.custom { color: red; }',
    },
    quickStartCss: `
:root {
  --quickstart-primary-color-light: #112233;
  --quickstart-secondary-color-light: #445566;
}
html.kcDarkModeClass {
  --quickstart-primary-color-dark: #223344;
  --quickstart-secondary-color-dark: #556677;
}
`,
    quickSettings: createQuickSettings(colorSettings, contentSettings),
    uploadedAssets: [],
    appliedAssets: {},
  })
}

function makeThemeDocumentWithModeStyles() {
  return createThemeDocument({
    themeId: 'modern-card',
    isPresetTheme: true,
    stylesCss: '.custom { color: red; }',
    stylesCssFiles: {
      'css/quick-start.css': ':root { --quickstart-primary-color-light: #000000; }',
      'css/styles.css': '.custom { color: red; }',
    },
    quickStartCss: ':root { --quickstart-primary-color-light: #000000; }',
    quickSettings: createQuickSettings(colorSettings, contentSettings),
    quickSettingsStylesByMode: {
      light: {
        ...colorSettings,
        colorPresetPrimaryColor: '#123456',
        colorPresetSecondaryColor: '#234567',
        colorPresetFontFamily: 'Light Body, sans-serif',
        colorPresetBgColor: '#f0f4f9',
        colorPresetBorderRadius: 'pill',
        colorPresetCardShadow: 'none',
        colorPresetHeadingFontFamily: 'Light Heading, serif',
      },
      dark: {
        ...colorSettings,
        colorPresetPrimaryColor: '#abcdef',
        colorPresetSecondaryColor: '#bcdef0',
        colorPresetFontFamily: 'Dark Body, sans-serif',
        colorPresetBgColor: '#1e1f20',
        colorPresetBorderRadius: 'sharp',
        colorPresetCardShadow: 'strong',
        colorPresetHeadingFontFamily: 'Dark Heading, serif',
      },
    },
    uploadedAssets: [defaultBackgroundAsset],
    appliedAssets: {},
  })
}

function response(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: init.headers,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buildExportCssFiles', () => {
  it('writes generated CSS to the first non quick-start file and omits quick-start.css', () => {
    const files = buildExportCssFiles({
      'css/quick-start.css': ':root {}',
      'css/styles.css': '.old {}',
      'css/extra.css': '.extra {}',
    }, '@import url("font.css");', '.generated {}')

    expect(files['css/quick-start.css']).toBeUndefined()
    expect(files['css/styles.css']).toBe('@import url("font.css");\n\n.generated {}')
    expect(files['css/extra.css']).toBe('.extra {}')
  })
})

describe('buildOverriddenMessages', () => {
  it('overrides legal links and escapes multiline info messages', () => {
    const messages = buildOverriddenMessages({
      baseMessagesContent: 'infoMessage=Old\nimprintUrl=https://old.example\n',
      infoMessage: 'Line one\nLine two',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: '',
    })

    expect(messages).toContain('infoMessage=Line one\\nLine two')
    expect(messages).toContain('imprintUrl=https://example.com/imprint')
    expect(messages).toContain('dataProtectionUrl=')
    expect(messages).toContain('imprintLabel=Imprint')
    expect(messages).toContain('dataProtectionLabel=Data Protection')
  })
})

describe('prepareThemeExportFiles', () => {
  it('prepares preset theme files from a theme document', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/template.ftl')) {
        return response('<main data-kc-state="preview">Template</main>')
      }
      if (url.endsWith('/footer.ftl')) {
        return response('<footer data-kc-state="footer">Footer</footer>')
      }
      if (url.endsWith('/resources/css/quick-start.css')) {
        return response(':root { --quickstart-primary-color-light: #000000; }')
      }
      if (url.endsWith('/theme.properties')) {
        return response('parent=keycloak')
      }
      if (url.endsWith('/messages/messages_en.properties')) {
        return response('doLogIn=Sign in')
      }
      return response('', { status: 404 })
    }))

    const files = await prepareThemeExportFiles({
      themeDocument: makeThemeDocument(),
      themeName: 'mytheme',
    })

    expect(files.themeName).toBe('mytheme')
    expect(files.properties).toBe('parent=keycloak')
    expect(files.templateFtl).toBe('<main>Template</main>')
    expect(files.footerFtl).toBe('<footer>Footer</footer>')
    expect(files.quickStartCss).toContain('--quickstart-primary-color-light: #112233;')
    expect(files.stylesCss).toContain('.custom { color: red; }')
    expect(files.messagesContent).toContain('infoMessage=Line one\\nLine two')
    expect(files.messagesContent).toContain('imprintUrl=https://example.com/imprint')
    expect(files.messagesContent).toContain('dataProtectionUrl=')
    expect(files.editorMetadata).toEqual({ sourceThemeId: 'v2' })
  })

  it('round-trips exported mode styles including background color through the import parser', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/template.ftl')) {
        return response('<main>Template</main>')
      }
      if (url.endsWith('/footer.ftl')) {
        return response('')
      }
      if (url.endsWith('/resources/css/quick-start.css')) {
        return response(':root { --quickstart-primary-color-light: #000000; }')
      }
      if (url.endsWith('/theme.properties')) {
        return response('parent=keycloak')
      }
      if (url.endsWith('/messages/messages_en.properties')) {
        return response('')
      }
      return response('', { status: 404 })
    }))

    const files = await prepareThemeExportFiles({
      themeDocument: makeThemeDocumentWithModeStyles(),
      themeName: 'mytheme',
    })
    const imported = parseQuickSettingsFromImportedTheme({
      quickStartCss: files.quickStartCss,
      stylesCss: files.stylesCss,
      messagesPropertiesText: files.messagesContent,
    })

    expect(files.stylesCssFiles?.['css/quick-start.css']).toBeUndefined()
    expect(files.quickStartCss).toContain('--quickstart-bg-logo-url: none;')
    expect(files.quickStartCss).toContain('--keycloak-bg-logo-url: none;')
    expect(files.stylesCss).toContain('--uploaded-bg-keycloak-bg-darken: url("../img/backgrounds/keycloak-bg-darken.svg");')
    expect(files.stylesCss).not.toContain('--quickstart-bg-image: url("../img/backgrounds/keycloak-bg-darken.svg")')
    expect(files.stylesCss).not.toContain('--quickstart-bg-logo-url: url("../img/backgrounds/keycloak-bg-darken.svg")')
    expect(files.stylesCss).not.toContain('--keycloak-bg-logo-url: url("../img/backgrounds/keycloak-bg-darken.svg")')
    expect(files.stylesCss).not.toContain('background: url("../img/backgrounds/keycloak-bg-darken.svg")')
    expect(imported?.light?.colorPresetPrimaryColor).toBe('#123456')
    expect(imported?.light?.colorPresetSecondaryColor).toBe('#234567')
    expect(imported?.light?.colorPresetFontFamily).toBe('Light Body, sans-serif')
    expect(imported?.light?.colorPresetBgColor).toBe('#f0f4f9')
    expect(imported?.light?.colorPresetBorderRadius).toBe('pill')
    expect(imported?.light?.colorPresetCardShadow).toBe('none')
    expect(imported?.light?.colorPresetHeadingFontFamily).toBe('Light Heading, serif')
    expect(imported?.dark?.colorPresetPrimaryColor).toBe('#abcdef')
    expect(imported?.dark?.colorPresetSecondaryColor).toBe('#bcdef0')
    expect(imported?.dark?.colorPresetFontFamily).toBe('Dark Body, sans-serif')
    expect(imported?.dark?.colorPresetBgColor).toBe('#1e1f20')
    expect(imported?.dark?.colorPresetBorderRadius).toBe('sharp')
    expect(imported?.dark?.colorPresetCardShadow).toBe('strong')
    expect(imported?.dark?.colorPresetHeadingFontFamily).toBe('Dark Heading, serif')
  })
})

describe('fetchDefaultAssetBlobs', () => {
  it('fetches default assets under the theme resources folder', async () => {
    const fetchMock = vi.fn(async () => response('asset-bytes'))
    vi.stubGlobal('fetch', fetchMock)

    const blobs = await fetchDefaultAssetBlobs('v2', [{
      category: 'background',
      name: 'background.svg',
      path: 'img/backgrounds/background.svg',
    }])

    expect(fetchMock).toHaveBeenCalledWith('/keycloak-dev-resources/themes/v2/login/resources/img/backgrounds/background.svg')
    expect(blobs?.['img/backgrounds/background.svg']?.size).toBe(11)
    expect(await blobs?.['img/backgrounds/background.svg'].text()).toBe('asset-bytes')
  })

  it('returns undefined when there are no default assets', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchDefaultAssetBlobs('v2', [])).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
