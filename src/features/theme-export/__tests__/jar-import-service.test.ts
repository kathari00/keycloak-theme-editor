import type { Zippable } from 'fflate'
// @vitest-environment node
import { zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { importJarFile } from '../jar-import-service'

function fileEntry(text: string): [Uint8Array, { level: 0 }] {
  return [new TextEncoder().encode(text), { level: 0 }]
}

async function importZippedTheme(jarEntries: Zippable) {
  const zipped = zipSync(jarEntries)
  const file = {
    arrayBuffer: async () => zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength),
  } as File

  return await importJarFile(file)
}

describe('importJarFile', () => {
  it('preserves multiple imported CSS files instead of flattening them', async () => {
    const jarEntries = {
      theme: {
        demo: {
          login: {
            'theme.properties': fileEntry('styles=css/a.css css/b.css css/quick-start.css'),
            'resources': {
              css: {
                'quick-start.css': fileEntry(':root { --quickstart-primary-color: #123456; }'),
                'a.css': fileEntry('.first { color: red; }'),
                'b.css': fileEntry('.second { color: blue; }'),
              },
            },
          },
        },
      },
    }

    const result = await importZippedTheme(jarEntries)

    expect(result.stylesCssFiles).toEqual({
      'css/a.css': '.first { color: red; }',
      'css/b.css': '.second { color: blue; }',
    })
    expect(result.css).toBe('.first { color: red; }\n\n.second { color: blue; }')
  })

  it('reads editor metadata from standalone keycloak-theme-editor.json', async () => {
    const result = await importZippedTheme({
      'META-INF': {
        'keycloak-themes.json': fileEntry(JSON.stringify({
          themes: [{ name: 'test', types: ['login'] }],
        })),
        'keycloak-theme-editor.json': fileEntry(JSON.stringify({
          sourceThemeId: 'keycloak/login',
        })),
      },
      'theme': {
        test: {
          login: {
            'theme.properties': fileEntry('styles=css/styles.css'),
            'resources': {
              css: { 'styles.css': fileEntry('.test { color: red; }') },
            },
          },
        },
      },
    })

    expect(result.sourceThemeId).toBe('keycloak/login')
  })

  it('loads legacy single-file exports without quick-start css or editor metadata', async () => {
    const result = await importZippedTheme({
      theme: {
        legacy: {
          login: {
            'theme.properties': fileEntry('styles=css/styles.css'),
            'messages': {
              'messages_en.properties': fileEntry('infoMessage=Legacy import works'),
            },
            'resources': {
              css: {
                'styles.css': fileEntry('.legacy { color: red; }'),
                'custom-user-styles.css': fileEntry('.user { color: blue; }'),
              },
            },
          },
        },
      },
    })

    expect(result.themeName).toBe('legacy')
    expect(result.sourceThemeId).toBeUndefined()
    expect(result.stylesCssFiles).toEqual({
      'css/styles.css': '.legacy { color: red; }',
      'css/custom-user-styles.css': '.user { color: blue; }',
    })
    expect(result.css).toBe('.legacy { color: red; }\n\n.user { color: blue; }')
    expect(result.quickStartCss).toBe('')
    expect(result.quickSettingsByMode?.light?.infoMessage).toBe('Legacy import works')
  })

  it('still imports css files when theme.properties has no styles declaration', async () => {
    const result = await importZippedTheme({
      theme: {
        loose: {
          login: {
            'theme.properties': fileEntry('parent=base'),
            'resources': {
              css: {
                'quick-start.css': fileEntry(':root { --quickstart-primary-color-light: #123456; }'),
                'styles.css': fileEntry('.from-styles { color: green; }'),
                'layout.css': fileEntry('.from-layout { color: purple; }'),
              },
            },
          },
        },
      },
    })

    expect(result.stylesCssFiles).toEqual({
      'css/styles.css': '.from-styles { color: green; }',
      'css/layout.css': '.from-layout { color: purple; }',
    })
    expect(result.css).toBe('.from-styles { color: green; }\n\n.from-layout { color: purple; }')
    expect(result.quickStartCss).toBe(':root { --quickstart-primary-color-light: #123456; }')
  })

  it('loads even when only custom user css is present', async () => {
    const result = await importZippedTheme({
      theme: {
        minimal: {
          login: {
            resources: {
              css: {
                'custom-user-styles.css': fileEntry('.custom-only { color: orange; }'),
              },
            },
          },
        },
      },
    })

    expect(result.themeName).toBe('')
    expect(result.stylesCssFiles).toEqual({
      'css/custom-user-styles.css': '.custom-only { color: orange; }',
    })
    expect(result.css).toBe('.custom-only { color: orange; }')
    expect(result.quickSettingsByMode).toBeUndefined()
  })
})
