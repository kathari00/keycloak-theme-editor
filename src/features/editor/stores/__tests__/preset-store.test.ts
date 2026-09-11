import { describe, expect, it } from 'vitest'
import { migratePresetState } from '../preset-store'

describe('migratePresetState', () => {
  it('remaps a stale modern-card selection to custom', () => {
    const result = migratePresetState({ selectedThemeId: 'modern-card', layoutIdByTheme: {} })
    expect(result.selectedThemeId).toBe('custom')
    expect(result.layoutIdByTheme).toEqual({})
  })

  it('remaps a stale horizontal-card selection to custom with the horizontal layout', () => {
    const result = migratePresetState({ selectedThemeId: 'horizontal-card', layoutIdByTheme: {} })
    expect(result.selectedThemeId).toBe('custom')
    expect(result.layoutIdByTheme).toEqual({ custom: 'horizontal' })
  })

  it('preserves other layoutIdByTheme entries when remapping horizontal-card', () => {
    const result = migratePresetState({ selectedThemeId: 'horizontal-card', layoutIdByTheme: { base: 'horizontal' } })
    expect(result.layoutIdByTheme).toEqual({ base: 'horizontal', custom: 'horizontal' })
  })

  it('leaves an unrelated selection untouched', () => {
    const state = { selectedThemeId: 'v2', layoutIdByTheme: {} }
    expect(migratePresetState(state)).toEqual(state)
  })

  it('handles a missing or malformed persisted state', () => {
    expect(migratePresetState(null)).toBeNull()
    expect(migratePresetState(undefined)).toBeUndefined()
  })
})
