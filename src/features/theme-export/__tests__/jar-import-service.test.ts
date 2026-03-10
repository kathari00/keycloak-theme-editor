// @vitest-environment node
import { zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { importJarFile } from '../jar-import-service'

describe('importJarFile', () => {
  it('preserves multiple imported CSS files instead of flattening them', async () => {
    const fileEntry = (text: string) => [new TextEncoder().encode(text), { level: 0 }] as const
    const jarEntries = {
      theme: {
        demo: {
          login: {
            'theme.properties': fileEntry('styles=css/a.css css/b.css css/quick-start.css'),
            resources: {
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

    const zipped = zipSync(jarEntries)
    const file = {
      arrayBuffer: async () => zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength),
    } as File
    const result = await importJarFile(file)

    expect(result.stylesCssFiles).toEqual({
      'css/a.css': '.first { color: red; }',
      'css/b.css': '.second { color: blue; }',
    })
    expect(result.css).toBe('.first { color: red; }\n\n.second { color: blue; }')
  })
})
