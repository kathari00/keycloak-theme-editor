import type { AppliedAssets, UploadedAsset } from '../../assets/types'
import { describe, expect, it } from 'vitest'
import { REMOVED_ASSET_ID } from '../../assets/types'
import { buildQuickStartCss } from '../../editor/quick-start-css'
import { assembleExportPayload, getEffectiveAppliedAssets, parseAppliedAssetsFromCss } from '../css-export-utils'

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

  it('auto-applies default background for v2 base when no background set', () => {
    const applied: AppliedAssets = {}
    const result = getEffectiveAppliedAssets(applied, uploadedAssets, 'v2')
    expect(result.background).toBe('default-bg')
  })

  it('auto-applies default background when baseId is omitted (defaults to v2)', () => {
    const applied: AppliedAssets = {}
    const result = getEffectiveAppliedAssets(applied, uploadedAssets)
    expect(result.background).toBe('default-bg')
  })

  it('explicitly suppresses default background for base presets (REMOVED_ASSET_ID)', () => {
    const applied: AppliedAssets = {}
    const result = getEffectiveAppliedAssets(applied, uploadedAssets, 'base')
    expect(result.background).toBe(REMOVED_ASSET_ID)
  })

  it('preserves explicitly set background for v2', () => {
    const applied: AppliedAssets = { background: 'custom-bg' }
    const result = getEffectiveAppliedAssets(applied, uploadedAssets, 'v2')
    expect(result.background).toBe('custom-bg')
  })

  it('preserves explicitly set background for base', () => {
    const applied: AppliedAssets = { background: 'custom-bg' }
    const result = getEffectiveAppliedAssets(applied, uploadedAssets, 'base')
    expect(result.background).toBe('custom-bg')
  })

  it('does not mutate the input appliedAssets', () => {
    const applied: AppliedAssets = {}
    getEffectiveAppliedAssets(applied, uploadedAssets, 'v2')
    expect(applied.background).toBeUndefined()
  })

  it('returns unchanged assets when no default background exists', () => {
    const applied: AppliedAssets = {}
    const assetsWithoutDefault: UploadedAsset[] = [
      makeAsset({ id: 'non-default-bg', isDefault: false }),
    ]
    const result = getEffectiveAppliedAssets(applied, assetsWithoutDefault, 'v2')
    expect(result.background).toBeUndefined()
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
      baseId: 'base',
    })

    expect(payload.generatedCss).toContain('--quickstart-font-family: \'Inter\', sans-serif;')
  })
})
