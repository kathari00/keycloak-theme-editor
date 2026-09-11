import { describe, expect, it } from 'vitest'
import { deriveStyleOptionId, styleOptionFrameworkId, styleOptionThemeId } from '../style-options'

describe('deriveStyleOptionId', () => {
  it('recognizes base, v2, and custom by their themeId', () => {
    expect(deriveStyleOptionId('base', 'native')).toBe('base')
    expect(deriveStyleOptionId('v2', 'native')).toBe('v2')
    expect(deriveStyleOptionId('custom', 'native')).toBe('custom')
  })

  it('recognizes bootstrap by frameworkId regardless of the backing theme', () => {
    expect(deriveStyleOptionId('base', 'bootstrap')).toBe('bootstrap')
    expect(deriveStyleOptionId('custom', 'bootstrap')).toBe('bootstrap')
  })

  it('falls back to base for an unrecognized themeId', () => {
    expect(deriveStyleOptionId('some-imported-theme', 'native')).toBe('base')
  })
})

describe('styleOptionThemeId', () => {
  it('backs bootstrap onto base', () => {
    expect(styleOptionThemeId('bootstrap')).toBe('base')
  })

  it('maps every other option onto its own themeId', () => {
    expect(styleOptionThemeId('base')).toBe('base')
    expect(styleOptionThemeId('v2')).toBe('v2')
    expect(styleOptionThemeId('custom')).toBe('custom')
  })
})

describe('styleOptionFrameworkId', () => {
  it('is bootstrap only for the bootstrap option', () => {
    expect(styleOptionFrameworkId('bootstrap')).toBe('bootstrap')
    expect(styleOptionFrameworkId('base')).toBe('native')
    expect(styleOptionFrameworkId('v2')).toBe('native')
    expect(styleOptionFrameworkId('custom')).toBe('native')
  })
})
