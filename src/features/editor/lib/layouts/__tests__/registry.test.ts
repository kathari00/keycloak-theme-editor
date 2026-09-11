import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLayoutBinding, LAYOUT_OPTIONS } from '../registry'

describe('getLayoutBinding', () => {
  const fetchMock = vi.fn<typeof fetch>()

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('fetches and caches CSS from the layout\'s static file', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/keycloak-dev-resources/layouts/horizontal/layout.css')) {
        return new Response('.kcFormCardClass { display: grid; }', { status: 200 })
      }
      return new Response('', { status: 404 })
    })

    const binding = await getLayoutBinding('horizontal')

    expect(binding.id).toBe('horizontal')
    expect(binding.css).toBe('.kcFormCardClass { display: grid; }')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await getLayoutBinding('horizontal')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to empty CSS when the file is missing', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response('', { status: 404 }))

    const binding = await getLayoutBinding('card')

    expect(binding.css).toBe('')
  })
})

describe('layoutOptions', () => {
  it('lists every layout with a label', () => {
    expect(LAYOUT_OPTIONS).toEqual([
      { id: 'card', label: 'Card' },
      { id: 'horizontal', label: 'Horizontal' },
      { id: 'split', label: 'Split' },
    ])
  })

  it('keeps the horizontal panel and top utility placement consistent across preset DOM shapes', () => {
    const css = readFileSync(resolve('public/keycloak-dev-resources/layouts/horizontal/layout.css'), 'utf8')

    expect(css).toContain('.kcLoginClass:not(.kcLogin) .kcLocaleMainClass')
    expect(css).toContain('.kcFormCardClass .kc-footer-language')
    expect(css).toContain('.kcFormCardClass .kcLoginMainHeaderUtilities')
    expect(css).toContain('top: calc(100% + 0.75rem);')
    expect(css).toContain('.kc-footer-legal-links:has(a:not([style*=\'display: none\']))')
    expect(css).toContain('gap: 1.5rem;')
    expect(css).toContain('inline-size: min(1040px, calc(100vw - 2rem)) !important;')
    expect(css).toContain('font-size: 1.125rem;')
  })
})
