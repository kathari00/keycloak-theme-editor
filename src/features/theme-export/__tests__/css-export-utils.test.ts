import type { AppliedAssets, UploadedAsset } from '../../assets/types'
import { describe, expect, it } from 'vitest'
import { buildQuickStartCss } from '../../editor/lib/quick-start-css'
import { assembleExportPayload, buildModeAwareQuickStartCssParts, getEffectiveAppliedAssets, hasExplicitQuickStartBackgroundColor, parseAppliedAssetsFromCss } from '../css-export-utils'

function makeAsset(overrides: Partial<UploadedAsset>): UploadedAsset {
  return {
    id: 'asset-1',
    name: 'test-asset.png',
    category: 'background',
    mimeType: 'image/png',
    base64Data: '',
    size: 100,
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('getEffectiveAppliedAssets', () => {
  const defaultBg = makeAsset({
    id: 'default-bg',
    name: 'keycloak-bg-darken.svg',
    category: 'background',
    isDefault: true,
  })

  const uploadedAssets: UploadedAsset[] = [defaultBg]

  it('auto-applies default background when a default background exists', () => {
    const applied: AppliedAssets = {}
    const result = getEffectiveAppliedAssets(applied, uploadedAssets)
    expect(result.background).toBe('default-bg')
  })

  it('leaves background undefined when no default background exists', () => {
    const applied: AppliedAssets = {}
    const assetsWithoutDefault: UploadedAsset[] = [
      makeAsset({ id: 'non-default-bg', isDefault: false }),
    ]
    const result = getEffectiveAppliedAssets(applied, assetsWithoutDefault)
    expect(result.background).toBeUndefined()
  })

  it('preserves explicitly set background', () => {
    const applied: AppliedAssets = { background: 'custom-bg' }
    const result = getEffectiveAppliedAssets(applied, uploadedAssets)
    expect(result.background).toBe('custom-bg')
  })

  it('does not auto-apply default background when a quick-start background color is explicit', () => {
    const applied: AppliedAssets = {}
    const result = getEffectiveAppliedAssets(applied, uploadedAssets, { suppressDefaultBackground: true })
    expect(result.background).toBeUndefined()
  })

  it('removes stale applied background when quick-start background color is explicit', () => {
    const applied: AppliedAssets = { background: 'default-bg' }
    const result = getEffectiveAppliedAssets(applied, uploadedAssets, { suppressBackground: true })
    expect(result.background).toBeUndefined()
  })

  it('does not mutate the input appliedAssets', () => {
    const applied: AppliedAssets = {}
    getEffectiveAppliedAssets(applied, uploadedAssets)
    expect(applied.background).toBeUndefined()
  })
})

describe('parseAppliedAssetsFromCss', () => {
  it('removes imported body/kcLogin background image rules so editor controls can override', () => {
    const css = `
body, html {
  background-image: url("../img/keycloak-bg.png");
}
body .kcLogin {
  background: url("../img/keycloak-bg.png") no-repeat center center fixed;
}
`
    const result = parseAppliedAssetsFromCss(css, [])
    expect(result.cleanedCss).not.toMatch(/background-image\s*:\s*url\(/i)
    expect(result.cleanedCss).not.toMatch(/body\s+\.kcLogin\s*\{[^}]*background/i)
  })

  it('parses body font from quickstart font variable', () => {
    const css = `
:root {
  --quickstart-font-family: 'Inter', sans-serif;
}
`

    const result = parseAppliedAssetsFromCss(css, [])
    expect(result.applied.bodyFont).toBe('google:Inter')
  })
})

describe('assembleExportPayload', () => {
  it('includes quick start font variable in generatedCss', () => {
    const quickStartCss = buildQuickStartCss({
      primaryColor: '#123456',
      secondaryColor: '#abcdef',
      fontFamily: '\'Inter\', sans-serif',
    })

    const payload = assembleExportPayload({
      sourceCss: '',
      uploadedAssets: [],
      appliedAssets: {},
      editorCssContext: {
        presetCss: '',
        colorPresetCss: quickStartCss,
      },
    })

    expect(payload.generatedCss).toContain('--quickstart-font-family: \'Inter\', sans-serif;')
  })

  it('does not export default background overrides when quick-start background color is explicit', () => {
    const payload = assembleExportPayload({
      sourceCss: '',
      uploadedAssets: [makeAsset({
        id: 'default-bg',
        name: 'keycloak-bg-darken.svg',
        isDefault: true,
      })],
      appliedAssets: { background: 'default-bg' },
      editorCssContext: {
        presetCss: '',
        colorPresetCss: ':root { --quickstart-bg-color: #f0f4f9; --quickstart-bg-image: none; }',
      },
    })

    expect(payload.generatedCss).not.toContain('background: url("../img/backgrounds/keycloak-bg-darken.svg")')
    expect(payload.generatedCss).not.toContain('--quickstart-bg-image: url(')
    expect(payload.generatedCss).not.toContain('--quickstart-bg-logo-url: url(')
  })
})

describe('hasExplicitQuickStartBackgroundColor', () => {
  it('detects concrete quick-start background colors', () => {
    expect(hasExplicitQuickStartBackgroundColor(':root { --quickstart-bg-color: #f0f4f9; }')).toBe(true)
  })

  it('ignores transparent and var-based quick-start background colors', () => {
    expect(hasExplicitQuickStartBackgroundColor(':root { --quickstart-bg-color: transparent; }')).toBe(false)
    expect(hasExplicitQuickStartBackgroundColor(':root { --quickstart-bg-color: var(--quickstart-bg-color-light); }')).toBe(false)
  })
})

describe('buildModeAwareQuickStartCssParts', () => {
  it('includes a :root light variable scope so exported themes match preview variable resolution', () => {
    const parts = buildModeAwareQuickStartCssParts({
      light: {
        colorPresetId: 'custom',
        colorPresetPrimaryColor: '#123456',
        colorPresetSecondaryColor: '#abcdef',
        colorPresetFontFamily: 'custom',
        colorPresetBgColor: '',
        colorPresetBorderRadius: 'rounded',
        colorPresetCardShadow: 'subtle',
        colorPresetHeadingFontFamily: 'custom',
        showClientName: false,
        showRealmName: true,
        infoMessage: '',
        imprintUrl: '',
        dataProtectionUrl: '',
      },
      dark: {
        colorPresetId: 'custom',
        colorPresetPrimaryColor: '#111111',
        colorPresetSecondaryColor: '#222222',
        colorPresetFontFamily: 'custom',
        colorPresetBgColor: '',
        colorPresetBorderRadius: 'rounded',
        colorPresetCardShadow: 'subtle',
        colorPresetHeadingFontFamily: 'custom',
        showClientName: false,
        showRealmName: true,
        infoMessage: '',
        imprintUrl: '',
        dataProtectionUrl: '',
      },
    })

    expect(parts.variablesCss).toContain(':root')
    expect(parts.variablesCss).toContain('html.kcDarkModeClass')
    expect(parts.variablesCss).toContain('--quickstart-gradient-bg-default: linear-gradient(135deg, #123456 0%, #abcdef 100%);')
    expect(parts.variablesCss).toContain('--quickstart-gradient-bg-default: linear-gradient(135deg, #111111 0%, #222222 100%);')
  })

  it('neutralizes V2 background image tokens when background colors are explicit', () => {
    const parts = buildModeAwareQuickStartCssParts({
      light: {
        colorPresetId: 'custom',
        colorPresetPrimaryColor: '#123456',
        colorPresetSecondaryColor: '#abcdef',
        colorPresetFontFamily: 'custom',
        colorPresetBgColor: '#f0f4f9',
        colorPresetBorderRadius: 'rounded',
        colorPresetCardShadow: 'subtle',
        colorPresetHeadingFontFamily: 'custom',
        showClientName: false,
        showRealmName: true,
        infoMessage: '',
        imprintUrl: '',
        dataProtectionUrl: '',
      },
      dark: {
        colorPresetId: 'custom',
        colorPresetPrimaryColor: '#111111',
        colorPresetSecondaryColor: '#222222',
        colorPresetFontFamily: 'custom',
        colorPresetBgColor: '#1e1f20',
        colorPresetBorderRadius: 'rounded',
        colorPresetCardShadow: 'subtle',
        colorPresetHeadingFontFamily: 'custom',
        showClientName: false,
        showRealmName: true,
        infoMessage: '',
        imprintUrl: '',
        dataProtectionUrl: '',
      },
    })

    expect(parts.variablesCss).toContain('html:not(.kcDarkModeClass) body#keycloak-bg:not(.kcDarkModeClass)')
    expect(parts.variablesCss).toContain('--quickstart-bg-color: #f0f4f9;')
    expect(parts.variablesCss).toContain('--quickstart-bg-color: #1e1f20;')
    expect(parts.variablesCss).toContain('--quickstart-bg-image: none;')
    expect(parts.variablesCss).toContain('--quickstart-bg-logo-url: none;')
    expect(parts.variablesCss).toContain('--keycloak-bg-logo-url: none;')
  })
})
