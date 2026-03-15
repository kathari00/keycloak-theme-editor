import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadThemes } from '../preset-manager'

describe('loadThemes', () => {
  const fetchMock = vi.fn<typeof fetch>()

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('derives dark mode classes from theme.properties', async () => {
    vi.stubGlobal('fetch', fetchMock)

    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = String(input)

      if (url.endsWith('/keycloak-dev-resources/themes/themes.json')) {
        return new Response(JSON.stringify({
          themes: [
            {
              id: 'modern-card',
              name: 'Modern Card',
              description: 'Modern',
              defaultAssets: [],
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      if (url.endsWith('/keycloak-dev-resources/themes/modern-card/login/theme.properties')) {
        return new Response('kcDarkModeClass=kcDarkModeClass pf-v5-theme-dark\nstyles=css/styles.css', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const config = await loadThemes()

    expect(config.themes[0]?.darkModeClasses).toEqual(['kcDarkModeClass', 'pf-v5-theme-dark'])
    expect(fetchMock).not.toHaveBeenCalledWith('/api/pages.json')
  })
})
