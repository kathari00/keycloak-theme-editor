import { describe, expect, it } from 'vitest'
import { sanitizePreviewHtml } from '../sanitize-preview-html'

describe('sanitizePreviewHtml', () => {
  it('removes script tags', () => {
    const html = `
      <html>
        <head>
          <script type="module" src="/keycloak-dev-resources/js/passwordVisibility.js"></script>
        </head>
        <body>
          <script>window.test = true;</script>
          <div id="app">content</div>
        </body>
      </html>
    `

    const result = sanitizePreviewHtml(html)
    expect(result).not.toContain('<script')
    expect(result).toContain('<div id="app">content</div>')
  })

  it('removes inline event handlers', () => {
    const html = `
      <form action="#" onsubmit="return true;">
        <a href="#" onclick="alert('x')">Link</a>
        <select onchange="window.location.href=this.value"></select>
      </form>
    `

    const result = sanitizePreviewHtml(html)
    expect(result).not.toContain('onsubmit=')
    expect(result).not.toContain('onclick=')
    expect(result).not.toContain('onchange=')
    expect(result).toContain('action="#"')
  })

  it('returns fallback html for empty input', () => {
    expect(sanitizePreviewHtml('')).toBe('<!doctype html><html><body></body></html>')
  })

  it('removes stylesheet links', () => {
    const html = `
      <head>
        <link href="/keycloak-dev-resources/vendor/patternfly-v5/patternfly.min.css" rel="stylesheet" />
        <link rel="icon" href="/keycloak-dev-resources/img/favicon.ico" />
      </head>
    `

    const result = sanitizePreviewHtml(html)
    expect(result).not.toContain('rel="stylesheet"')
    expect(result).toContain('rel="icon"')
  })

  it('preserves body data-page-id attributes from full documents', () => {
    const html = `
      <!doctype html>
      <html>
        <head></head>
        <body data-page-id="login-oauth2-device-verify-user-code">
          <form id="kc-user-verify-device-user-code-form"></form>
        </body>
      </html>
    `

    const result = sanitizePreviewHtml(html)
    expect(result).toContain('<body data-page-id="login-oauth2-device-verify-user-code">')
  })
})
