import { describe, expect, it } from 'vitest'
import {
  createQuickSettings,
  createThemeDocument,
  themeDocumentToExportQuickSettingsByMode,
  themeDocumentToPreviewCss,
} from '..'
import { buildModeAwareQuickStartCssParts } from '../../theme-export/css-export-utils'

const colorSettings = {
  colorPresetId: 'custom',
  colorPresetPrimaryColor: '#112233',
  colorPresetSecondaryColor: '#445566',
  colorPresetFontFamily: 'Inter, sans-serif',
  colorPresetBgColor: '#ffffff',
  colorPresetBorderRadius: 'rounded' as const,
  colorPresetCardShadow: 'subtle' as const,
  colorPresetHeadingFontFamily: 'Inter, sans-serif',
}

const contentSettings = {
  showClientName: true,
  showRealmName: false,
  infoMessage: 'Contact support.',
  imprintUrl: 'https://example.com/imprint',
  dataProtectionUrl: 'https://example.com/privacy',
  imprintLabel: 'Imprint',
  dataProtectionLabel: 'Data Protection',
}

function makeDocument(overrides: Partial<Parameters<typeof createThemeDocument>[0]> = {}) {
  return createThemeDocument({
    themeId: 'v2',
    isPresetTheme: true,
    stylesCss: '.custom {}',
    stylesCssFiles: { 'css/styles.css': '.custom {}' },
    quickStartCss: '',
    quickSettings: createQuickSettings(colorSettings, contentSettings),
    uploadedAssets: [],
    appliedAssets: {},
    ...overrides,
  })
}

describe('themeDocument projections', () => {
  it('projects preset theme quick settings into preview CSS', () => {
    const previewCss = themeDocumentToPreviewCss(makeDocument())

    expect(previewCss.quickStartCss).toContain('--quickstart-primary-color-light: #112233;')
    expect(previewCss.quickStartCss).toContain('#kc-realm-name')
    expect(previewCss.googleFontUrls).toHaveLength(1)
  })

  it('keeps imported themes from generating quick-start preview overrides', () => {
    const previewCss = themeDocumentToPreviewCss(makeDocument({ isPresetTheme: false }))

    expect(previewCss.quickStartCss).toBe('')
    expect(previewCss.googleFontUrls).toEqual([])
  })

  it('keeps background asset CSS out of preview when quick-start background color is set', () => {
    const previewCss = themeDocumentToPreviewCss(makeDocument({
      uploadedAssets: [{
        id: 'default-bg',
        name: 'keycloak-bg-darken.svg',
        category: 'background',
        mimeType: 'image/svg+xml',
        base64Data: 'abc123',
        size: 0,
        createdAt: 0,
        isDefault: true,
      }],
      appliedAssets: { background: 'default-bg' },
    }))

    expect(previewCss.quickStartCss).toContain('--quickstart-bg-color-light: #ffffff;')
    expect(previewCss.appliedAssetsCss).not.toContain('--keycloak-bg-logo-url')
    expect(previewCss.appliedAssetsCss).not.toContain('--quickstart-bg-image')
    expect(previewCss.appliedAssetsCss).not.toContain('background: url(')
  })

  it('derives export quick settings by mode from theme quick-start CSS', () => {
    const settingsByMode = themeDocumentToExportQuickSettingsByMode(
      makeDocument(),
      `
:root {
  --quickstart-primary-color-light: #111111;
  --quickstart-secondary-color-light: #222222;
  --quickstart-bg-color-light: #ffffff;
}
html.kcDarkModeClass {
  --quickstart-primary-color-dark: #aaaaaa;
  --quickstart-secondary-color-dark: #bbbbbb;
  --quickstart-bg-color-dark: #000000;
}
`,
    )

    expect(settingsByMode.light?.colorPresetPrimaryColor).toBe('#111111')
    expect(settingsByMode.dark?.colorPresetPrimaryColor).toBe('#aaaaaa')
    expect(settingsByMode.light?.showClientName).toBe(true)
    expect(settingsByMode.dark?.dataProtectionUrl).toBe('https://example.com/privacy')
  })

  it('prefers explicit mode settings over theme quick-start CSS for export', () => {
    const settingsByMode = themeDocumentToExportQuickSettingsByMode(
      makeDocument({
        quickSettingsStylesByMode: {
          light: {
            ...colorSettings,
            colorPresetPrimaryColor: '#101010',
            colorPresetSecondaryColor: '#202020',
            colorPresetFontFamily: 'Light Body, sans-serif',
            colorPresetBorderRadius: 'pill',
            colorPresetCardShadow: 'none',
            colorPresetHeadingFontFamily: 'Light Heading, serif',
          },
          dark: {
            ...colorSettings,
            colorPresetPrimaryColor: '#f0f0f0',
            colorPresetSecondaryColor: '#e0e0e0',
            colorPresetFontFamily: 'Dark Body, sans-serif',
            colorPresetBgColor: '#050505',
            colorPresetBorderRadius: 'sharp',
            colorPresetCardShadow: 'strong',
            colorPresetHeadingFontFamily: 'Dark Heading, serif',
          },
        },
      }),
      `:root { --quickstart-primary-color-light: #111111; }`,
    )

    expect(settingsByMode.light?.colorPresetPrimaryColor).toBe('#101010')
    expect(settingsByMode.dark?.colorPresetPrimaryColor).toBe('#f0f0f0')
    expect(settingsByMode.dark?.colorPresetBgColor).toBe('#050505')
    expect(settingsByMode.light?.colorPresetFontFamily).toBe('Light Body, sans-serif')
    expect(settingsByMode.dark?.colorPresetFontFamily).toBe('Dark Body, sans-serif')
    expect(settingsByMode.light?.colorPresetBorderRadius).toBe('pill')
    expect(settingsByMode.dark?.colorPresetBorderRadius).toBe('sharp')
    expect(settingsByMode.light?.colorPresetCardShadow).toBe('none')
    expect(settingsByMode.dark?.colorPresetCardShadow).toBe('strong')
    expect(settingsByMode.light?.colorPresetHeadingFontFamily).toBe('Light Heading, serif')
    expect(settingsByMode.dark?.colorPresetHeadingFontFamily).toBe('Dark Heading, serif')
  })

  it('keeps preview and export quick-start projections aligned for core settings', () => {
    const document = makeDocument()
    const previewCss = themeDocumentToPreviewCss(document)
    const exportQuickSettings = themeDocumentToExportQuickSettingsByMode(
      document,
      previewCss.quickStartCss,
    )
    const exportCss = buildModeAwareQuickStartCssParts(exportQuickSettings)

    expect(previewCss.quickStartCss).toContain('--quickstart-primary-color-light: #112233;')
    expect(exportCss.variablesCss).toContain('--quickstart-primary-color: #112233;')
    expect(previewCss.quickStartCss).toContain('--quickstart-secondary-color-light: #445566;')
    expect(exportCss.variablesCss).toContain('--quickstart-secondary-color: #445566;')
    expect(previewCss.quickStartCss).toContain('--quickstart-font-family: Inter, sans-serif;')
    expect(exportCss.variablesCss).toContain('--quickstart-font-family: Inter, sans-serif;')
    expect(previewCss.quickStartCss).toContain('#kc-realm-name')
    expect(exportCss.sharedCss).toContain('#kc-realm-name')
  })
})
