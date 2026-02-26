import { describe, expect, it } from 'vitest'
import { generateAppliedAssetsCSS, generateExportAppliedCSS } from '../font-css-generator'
import type { UploadedAsset } from '../types'

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
    expect(css).toContain('html.login-pf #kc-header-wrapper::before {')
    expect(css).toContain('content: none;')
    expect(css).toContain('display: none;')
    expect(css).not.toContain('text-indent: -9999px;')
    expect(css).not.toContain('color: transparent;')
  })
})

describe('generateAppliedAssetsCSS', () => {
  it('does not suppress the header-wrapper logo fallback in preview css', () => {
    const css = generateAppliedAssetsCSS({ logo: 'logo-1' }, [makeLogoAsset()])

    expect(css).toContain('#kc-header-wrapper::before {')
    expect(css).not.toContain('html.login-pf #kc-header-wrapper::before {')
  })
})
