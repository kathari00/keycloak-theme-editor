import type { QuickStartCssOptions } from '../quick-start-css'
import { describe, expect, it } from 'vitest'
import { buildQuickStartCss, COLOR_REGEX } from '../quick-start-css'

function build(overrides: Partial<QuickStartCssOptions> = {}) {
  return buildQuickStartCss({ primaryColor: '#000000', secondaryColor: '#111111', ...overrides })
}

describe('quick-start-css', () => {
  describe('cOLOR_REGEX', () => {
    it('accepts 3 and 6 char hex', () => {
      expect(COLOR_REGEX.test('#abc')).toBe(true)
      expect(COLOR_REGEX.test('#abcdef')).toBe(true)
    })

    it('rejects non-hex formats', () => {
      expect(COLOR_REGEX.test('rgb(0,0,0)')).toBe(false)
      expect(COLOR_REGEX.test('abc')).toBe(false)
      expect(COLOR_REGEX.test('#12')).toBe(false)
    })
  })

  describe('generated variables', () => {
    it('always emits primary and secondary quickstart variables', () => {
      const result = build({ primaryColor: '#ff0000', secondaryColor: '#00ff00' })
      expect(result).toContain(':root {')
      expect(result).toContain('--quickstart-primary-color: #ff0000;')
      expect(result).toContain('--quickstart-secondary-color: #00ff00;')
    })

    it('emits optional quickstart variables only when configured', () => {
      const result = build({
        fontFamily: 'Arial, sans-serif',
        headingFontFamily: 'Georgia, serif',
        bgColor: '#f0f4f9',
        borderRadius: 'rounded',
        cardShadow: 'subtle',
      })

      expect(result).toContain('--quickstart-font-family: Arial, sans-serif;')
      expect(result).toContain('--quickstart-heading-font-family: Georgia, serif;')
      expect(result).toContain('--quickstart-bg-color: #f0f4f9;')
      expect(result).toContain('--quickstart-bg-image: none;')
      expect(result).toContain('--quickstart-border-radius: 8px;')
      expect(result).toContain('--quickstart-card-shadow: 0 2px 8px rgba(0,0,0,0.10);')
      expect(result).not.toContain('--pf-v5-global--FontFamily--text:')
      expect(result).not.toContain('--pf-v5-global--FontFamily--sans-serif:')
      expect(result).not.toContain('--pf-v5-global--FontFamily--heading:')
    })

    it('does not emit bg variable for invalid color', () => {
      const result = build({ bgColor: 'invalid' })
      expect(result).not.toContain('--quickstart-bg-color:')
      expect(result).not.toContain('--quickstart-bg-image:')
    })
  })

  describe('google fonts', () => {
    it('includes Google Fonts import for recognized body font', () => {
      const result = build({ fontFamily: '\'Inter\', sans-serif' })
      expect(result).toContain('@import url(\'https://fonts.googleapis.com/css2?')
      expect(result).toContain('family=Inter:wght@300;400;500;600;700')
    })

    it('includes Google Fonts import for recognized heading font', () => {
      const result = build({ headingFontFamily: '\'Raleway\', sans-serif' })
      expect(result).toContain('@import url(\'https://fonts.googleapis.com/css2?')
      expect(result).toContain('family=Raleway:wght@300;400;500;600;700')
    })

    it('does not include Google Fonts import for unknown family', () => {
      const result = build({ fontFamily: '\'RedHatDisplay\', sans-serif' })
      expect(result).not.toContain('@import url(\'https://fonts.googleapis.com/css2?')
    })
  })

  describe('template-content and legal toggles', () => {
    it('emits realm hide rules when realm is disabled', () => {
      const result = build({ showRealmName: false, showClientName: true, infoMessage: 'x' })
      expect(result).toContain('Hide realm name')
      expect(result).toContain('#kc-realm-name')
      expect(result).not.toContain('[data-kc-state=')
      expect(result).not.toContain('Hide client name')
    })

    it('emits client hide rules when client is disabled', () => {
      const result = build({ showRealmName: true, showClientName: false, infoMessage: 'x' })
      expect(result).toContain('Hide client name')
      expect(result).toContain('#kc-client-name')
    })

    it('emits info-message hide rules when info message is empty', () => {
      const result = build({ infoMessage: '' })
      expect(result).toContain('Hide info message')
      expect(result).toContain('#kc-info-message.kcAlertClass')
      expect(result).not.toContain('[data-kc-state=')
      expect(result).not.toContain('#kc-info-message,')
    })

    it('does not emit info-message hide rules when info message is present', () => {
      const result = build({ infoMessage: 'Hello' })
      expect(result).not.toContain('Hide info message')
    })

    it('keeps output trimmed', () => {
      const result = build()
      expect(result).toBe(result.trim())
    })
  })
})
