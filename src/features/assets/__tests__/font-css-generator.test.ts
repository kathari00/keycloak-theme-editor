import type { UploadedAsset } from '../types'
import { describe, expect, it } from 'vitest'
import { generateAppliedAssetsCSS, generateExportAppliedCSS } from '../font-css-generator'
import { NONE_ASSET_ID } from '../types'

function makeLogoAsset(): UploadedAsset {
  return {
    id: 'logo-1',
    name: 'company-logo.png',
    category: 'logo',
    mimeType: 'image/png',
    base64Data: 'abc',
    size: 123,
    createdAt: 1,
  }
}

describe('generateExportAppliedCSS', () => {
  it('keeps header logo override centered for export', () => {
    const css = generateExportAppliedCSS({ logo: 'logo-1' }, [makeLogoAsset()])

    expect(css).toContain('#kc-header-wrapper::before {')
    expect(css).toContain('content: "";')
    expect(css).toContain('display: block;')
    expect(css).toContain('width: var(--quickstart-logo-width, 300px);')
    expect(css).toContain('margin: 0 auto;')
    expect(css).not.toContain('text-indent: -9999px;')
    expect(css).not.toContain('color: transparent;')
  })
})

describe('generateAppliedAssetsCSS', () => {
  it('emits header-wrapper logo override in preview css', () => {
    const css = generateAppliedAssetsCSS({ logo: 'logo-1' }, [makeLogoAsset()])

    expect(css).toContain('#kc-header-wrapper::before {')
  })

  it('suppresses the theme default background when explicitly cleared', () => {
    const css = generateAppliedAssetsCSS({ background: NONE_ASSET_ID }, [])

    expect(css).toContain('--quickstart-bg-image: none;')
    expect(css).toContain('--quickstart-bg-logo-url: none;')
    expect(css).toContain('--keycloak-bg-logo-url: none;')
    // No matching asset exists for the sentinel, so no override image URL is emitted.
    expect(css).not.toContain('url(')
  })

  it('suppresses the theme default logo when explicitly cleared', () => {
    const css = generateAppliedAssetsCSS({ logo: NONE_ASSET_ID }, [])

    expect(css).toContain('--quickstart-logo-url: none;')
    expect(css).toContain('--keycloak-logo-url: none;')
    expect(css).toContain('--kc-applied-logo-url: none;')
    expect(css).not.toContain('#kc-header-wrapper::before {')
  })

  it('emits nothing for a category that was never decided (absent key)', () => {
    const css = generateAppliedAssetsCSS({}, [])

    expect(css).toBe('')
  })
})
