import type { AssembleThemeFilesParams } from '../types'
import { describe, expect, it } from 'vitest'
import { writeToDirectory } from '../jar-export-service'
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

describe('writeToDirectory', () => {
  it('removes obsolete template overrides when re-exporting with a different parent', async () => {
    const files = new Map<string, unknown>()
    const directory = (prefix: string): FileSystemDirectoryHandle => ({
      getDirectoryHandle: async (name: string) => directory(`${prefix}${name}/`),
      getFileHandle: async (name: string) => ({
        createWritable: async () => ({
          write: async (data: unknown) => { files.set(`${prefix}${name}`, data) },
          close: async () => {},
        }),
      }),
      removeEntry: async (name: string) => {
        if (!files.delete(`${prefix}${name}`))
          throw new DOMException('Missing file', 'NotFoundError')
      },
    }) as unknown as FileSystemDirectoryHandle
    const root = directory('')

    await writeToDirectory(root, makeParams({ footerFtl: '<#macro content></#macro>' }))
    files.set('test-theme/login/my-custom-page.ftl', 'User content')
    // Custom projects keep templates outside the editor's ownership.
    await writeToDirectory(root, makeParams({ templateFtl: '', footerFtl: null }))
    expect(files.has('test-theme/login/template.ftl')).toBe(true)
    expect(files.has('test-theme/login/footer.ftl')).toBe(true)
    await writeToDirectory(root, makeParams({ properties: 'parent=base', templateFtl: '', footerFtl: null, replaceTemplateOverrides: true }))
    // A second export also succeeds when the inherited files are already absent.
    await writeToDirectory(root, makeParams({ properties: 'parent=base', templateFtl: '', footerFtl: null, replaceTemplateOverrides: true }))

    expect(files.has('test-theme/login/template.ftl')).toBe(false)
    expect(files.has('test-theme/login/footer.ftl')).toBe(false)
    expect(files.get('test-theme/login/my-custom-page.ftl')).toBe('User content')
  })
})
