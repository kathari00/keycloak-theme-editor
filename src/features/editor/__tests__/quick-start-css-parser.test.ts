import { describe, expect, it } from 'vitest'
import { buildQuickStartCss } from '../lib/quick-start-css'
import {
  buildQuickStartMarkerComment,
  mapQuickStartBorderRadius,
  mapQuickStartCardShadow,
} from '../lib/quick-start-css-parser'

describe('quick-start-css-parser', () => {
  describe('marker-based round-tripping', () => {
    it('generated CSS carries an exact marker for border-radius and card-shadow', () => {
      const css = buildQuickStartCss({
        primaryColor: '#000000',
        secondaryColor: '#111111',
        borderRadius: 'pill',
        cardShadow: 'strong',
      })

      expect(css).toContain(buildQuickStartMarkerComment('border-radius', 'pill'))
      expect(css).toContain(buildQuickStartMarkerComment('card-shadow', 'strong'))
    })

    it('recovers the exact enum from the marker even if the literal value is hand-edited', () => {
      const css = buildQuickStartCss({
        primaryColor: '#000000',
        secondaryColor: '#111111',
        borderRadius: 'pill',
        cardShadow: 'strong',
      })

      // Simulate a user hand-editing the literal CSS value in the CodeMirror editor
      // without touching the marker comment above it.
      const edited = css
        .replace('--quickstart-border-radius: 24px;', '--quickstart-border-radius: 99px;')
        .replace('0 8px 32px rgba(0,0,0,0.25)', '0 0px 1px rgba(0,0,0,0.99)')

      expect(mapQuickStartBorderRadius(edited, '99px')).toBe('pill')
      expect(mapQuickStartCardShadow(edited, '0 0px 1px rgba(0,0,0,0.99)')).toBe('strong')
    })

    it('falls back to literal-value heuristics when no marker is present (old exports, hand-authored CSS)', () => {
      const noMarkerCss = ':root { --quickstart-border-radius: 0px; --quickstart-card-shadow: none; }'

      expect(mapQuickStartBorderRadius(noMarkerCss, '0px')).toBe('sharp')
      expect(mapQuickStartCardShadow(noMarkerCss, 'none')).toBe('none')
      expect(mapQuickStartBorderRadius(noMarkerCss, '24px')).toBe('pill')
      expect(mapQuickStartCardShadow(noMarkerCss, '0 8px 32px rgba(0,0,0,0.25)')).toBe('strong')
    })
  })
})
