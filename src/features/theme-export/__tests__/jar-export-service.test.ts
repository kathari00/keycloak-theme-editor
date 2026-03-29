import type { AssembleThemeFilesParams } from '../types'
import { describe, expect, it } from 'vitest'
import { assembleThemeFiles } from '../theme-file-assembler'

const decoder = new TextDecoder()

function makeParams(overrides?: Partial<AssembleThemeFilesParams>): AssembleThemeFilesParams {
  return {
    themeName: 'test-theme',
    properties: 'parent=keycloak\nstyles=css/styles.css',
    templateFtl: '<html></html>',
    footerFtl: null,
    quickStartCss: '',
    stylesCss: '.test { color: red; }',
    messagesContent: 'loginTitle=Hello',
    payload: {
      generatedCss: '',
      uploadedFonts: [],
      uploadedBackgrounds: [],
      uploadedLogos: [],
      uploadedImages: [],
      appliedFavicon: undefined,
    },
    editorMetadata: { sourceThemeId: 'keycloak/login' },
    ...overrides,
  }
}

describe('assembleThemeFiles JAR layout', () => {
  it('keycloak-themes.json has no editor field', async () => {
    const files = await assembleThemeFiles(makeParams(), 'theme/test-theme', 'META-INF/')
    const themesJson = JSON.parse(decoder.decode(files['META-INF/keycloak-themes.json']))

    expect(themesJson).toEqual({ themes: [{ name: 'test-theme', types: ['login'] }] })
    expect(themesJson.themes[0]).not.toHaveProperty('editor')
  })

  it('keycloak-theme-editor.json contains editor metadata', async () => {
    const files = await assembleThemeFiles(makeParams(), 'theme/test-theme', 'META-INF/')
    const editorJson = JSON.parse(decoder.decode(files['META-INF/keycloak-theme-editor.json']))

    expect(editorJson).toEqual({ sourceThemeId: 'keycloak/login' })
  })
})

describe('assembleThemeFiles folder layout', () => {
  it('keycloak-themes.json has no editor field', async () => {
    const files = await assembleThemeFiles(makeParams({ themeName: 'myfolder' }), 'myfolder', 'myfolder/META-INF/')
    const themesJson = JSON.parse(decoder.decode(files['myfolder/META-INF/keycloak-themes.json']))

    expect(themesJson.themes[0]).not.toHaveProperty('editor')
  })

  it('keycloak-theme-editor.json contains editor metadata', async () => {
    const files = await assembleThemeFiles(makeParams({ themeName: 'myfolder' }), 'myfolder', 'myfolder/META-INF/')
    const editorJson = JSON.parse(decoder.decode(files['myfolder/META-INF/keycloak-theme-editor.json']))

    expect(editorJson).toEqual({ sourceThemeId: 'keycloak/login' })
  })
})
