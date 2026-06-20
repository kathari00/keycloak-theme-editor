import type { AssembleThemeFilesParams, ThemeEditorMetadata } from '../types'
import { describe, expect, it } from 'vitest'
import { assembleThemeFiles, generateEditorMetadataJson, generateKeycloakThemesJson } from '../theme-file-assembler'

const decoder = new TextDecoder()

function decode(files: Record<string, Uint8Array>, path: string): string {
  return decoder.decode(files[path])
}

function makeAsset(name: string, mimeType = 'image/png') {
  return { id: name, name, category: 'image' as const, mimeType, base64Data: 'aGVsbG8=', size: 5, createdAt: 0 }
}

function makeParams(overrides?: Partial<AssembleThemeFilesParams>): AssembleThemeFilesParams {
  return {
    themeName: 'test-theme',
    properties: 'parent=keycloak',
    templateFtl: null,
    footerFtl: null,
    quickStartCss: '',
    stylesCss: '.base {}',
    messagesContent: '',
    payload: {
      generatedCss: '',
      uploadedFonts: [],
      uploadedBackgrounds: [],
      uploadedLogos: [],
      uploadedImages: [],
      appliedFavicon: undefined,
    },
    editorMetadata: { sourceThemeId: 'keycloak/login' } as ThemeEditorMetadata,
    ...overrides,
  }
}

describe('generateKeycloakThemesJson', () => {
  it('produces valid JSON with theme name and login type', () => {
    const json = JSON.parse(generateKeycloakThemesJson('my-theme'))
    expect(json).toEqual({ themes: [{ name: 'my-theme', types: ['login'] }] })
  })
})

describe('generateEditorMetadataJson', () => {
  it('serializes metadata to JSON', () => {
    const meta = { sourceThemeId: 'keycloak/login' } as ThemeEditorMetadata
    const json = JSON.parse(generateEditorMetadataJson(meta))
    expect(json).toEqual(meta)
  })
})

describe('assembleThemeFiles', () => {
  const themeRoot = 'theme/test-theme'
  const metaInf = 'META-INF/'
  const loginRoot = `${themeRoot}/login`

  it('includes theme.properties', async () => {
    const files = await assembleThemeFiles(makeParams(), themeRoot, metaInf)
    expect(decode(files, `${loginRoot}/theme.properties`)).toBe('parent=keycloak')
  })

  it('writes stylesCss to css/styles.css when no stylesCssFiles given', async () => {
    const files = await assembleThemeFiles(makeParams({ stylesCss: '.single {}' }), themeRoot, metaInf)
    expect(decode(files, `${loginRoot}/resources/css/styles.css`)).toBe('.single {}')
  })

  it('uses stylesCssFiles instead of stylesCss when provided', async () => {
    const files = await assembleThemeFiles(
      makeParams({ stylesCssFiles: { 'css/custom.css': '.custom {}', 'css/extra.css': '.extra {}' } }),
      themeRoot,
      metaInf,
    )
    expect(decode(files, `${loginRoot}/resources/css/custom.css`)).toBe('.custom {}')
    expect(decode(files, `${loginRoot}/resources/css/extra.css`)).toBe('.extra {}')
    expect(files[`${loginRoot}/resources/css/styles.css`]).toBeUndefined()
  })

  it('includes quickStartCss when provided', async () => {
    const files = await assembleThemeFiles(makeParams({ quickStartCss: ':root {}' }), themeRoot, metaInf)
    expect(decode(files, `${loginRoot}/resources/css/quick-start.css`)).toBe(':root {}')
  })

  it('omits quick-start.css when quickStartCss is empty', async () => {
    const files = await assembleThemeFiles(makeParams({ quickStartCss: '' }), themeRoot, metaInf)
    expect(files[`${loginRoot}/resources/css/quick-start.css`]).toBeUndefined()
  })

  it('includes templateFtl when provided', async () => {
    const files = await assembleThemeFiles(makeParams({ templateFtl: '<html/>' }), themeRoot, metaInf)
    expect(decode(files, `${loginRoot}/template.ftl`)).toBe('<html/>')
  })

  it('omits template.ftl when not provided', async () => {
    const files = await assembleThemeFiles(makeParams({ templateFtl: null }), themeRoot, metaInf)
    expect(files[`${loginRoot}/template.ftl`]).toBeUndefined()
  })

  it('includes footerFtl when provided', async () => {
    const files = await assembleThemeFiles(makeParams({ footerFtl: '<footer/>' }), themeRoot, metaInf)
    expect(decode(files, `${loginRoot}/footer.ftl`)).toBe('<footer/>')
  })

  it('includes customFtlFiles when provided', async () => {
    const files = await assembleThemeFiles(
      makeParams({ customFtlFiles: { 'login.ftl': '<login/>' } }),
      themeRoot,
      metaInf,
    )
    expect(decode(files, `${loginRoot}/login.ftl`)).toBe('<login/>')
  })

  it('places uploaded background in img/backgrounds/', async () => {
    const bg = makeAsset('bg.png', 'image/png')
    const params = makeParams({ payload: { ...makeParams().payload, uploadedBackgrounds: [bg] } })
    const files = await assembleThemeFiles(params, themeRoot, metaInf)
    expect(files[`${loginRoot}/resources/img/backgrounds/bg.png`]).toBeDefined()
  })

  it('deduplicates assets with the same name (last wins)', async () => {
    const a1 = { ...makeAsset('logo.png'), base64Data: 'AAAA' }
    const a2 = { ...makeAsset('logo.png'), base64Data: 'BBBB' }
    const params = makeParams({ payload: { ...makeParams().payload, uploadedLogos: [a1, a2] } })
    const files = await assembleThemeFiles(params, themeRoot, metaInf)
    const content = files[`${loginRoot}/resources/img/logos/logo.png`]
    expect(content).toBeDefined()
    // Only one file should exist (deduped)
    const logoKeys = Object.keys(files).filter(k => k.includes('img/logos'))
    expect(logoKeys).toHaveLength(1)
  })

  it('places favicon at img/favicon.ico', async () => {
    const fav = makeAsset('favicon.png', 'image/png')
    const params = makeParams({ payload: { ...makeParams().payload, appliedFavicon: fav } })
    const files = await assembleThemeFiles(params, themeRoot, metaInf)
    expect(files[`${loginRoot}/resources/img/favicon.ico`]).toBeDefined()
  })
})
