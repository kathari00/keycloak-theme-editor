import type { Zippable } from 'fflate'
// @vitest-environment node
import { Buffer } from 'node:buffer'
import { zipSync } from 'fflate'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

function stubFileReader() {
  vi.stubGlobal('FileReader', class {
    onerror: (() => void) | null = null
    onload: (() => void) | null = null
    result: string | null = null

    readAsDataURL(file: File) {
      void file.arrayBuffer()
        .then((buffer) => {
          this.result = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`
          this.onload?.()
        })
        .catch(() => {
          this.onerror?.()
        })
    }
  })
}

describe('importJarFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

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

  it('does not apply imported default background assets over explicit quick-start background color', async () => {
    stubFileReader()

    const result = await importZippedTheme({
      theme: {
        demo: {
          login: {
            'theme.properties': fileEntry('styles=css/quick-start.css css/styles.css'),
            'resources': {
              css: {
                'quick-start.css': fileEntry(`
:root {
  --quickstart-primary-color: #123456;
  --quickstart-bg-color: #f0f4f9;
  --quickstart-bg-image: none;
}
                `.trim()),
                'styles.css': fileEntry('.demo { color: red; }'),
              },
              img: {
                backgrounds: {
                  'keycloak-bg-darken.svg': fileEntry('<svg></svg>'),
                },
              },
            },
          },
        },
      },
    })

    expect(result.uploadedAssets.some(asset => asset.name === 'keycloak-bg-darken.svg')).toBe(true)
    expect(result.quickSettingsByMode?.light?.colorPresetBgColor).toBe('#f0f4f9')
    expect(result.appliedAssets.background).toBeUndefined()
  })

  it('removes parsed V2 background tokens when quick-start background color is explicit', async () => {
    stubFileReader()

    const result = await importZippedTheme({
      theme: {
        demo: {
          login: {
            'theme.properties': fileEntry('styles=css/quick-start.css css/styles.css'),
            'resources': {
              css: {
                'quick-start.css': fileEntry(`:root {
  --quickstart-bg-color: #f0f4f9;
  --quickstart-bg-image: none;
}`),
                'styles.css': fileEntry(`:root {
  --keycloak-bg-logo-url: url("../img/backgrounds/keycloak-bg-darken.svg");
}
.login-pf body {
  background: var(--keycloak-bg-logo-url) no-repeat center center fixed;
}`),
              },
              img: {
                backgrounds: {
                  'keycloak-bg-darken.svg': fileEntry('<svg></svg>'),
                },
              },
            },
          },
        },
      },
    })

    expect(result.quickSettingsByMode?.light?.colorPresetBgColor).toBe('#f0f4f9')
    expect(result.appliedAssets.background).toBeUndefined()
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
