import { describe, expect, it } from 'vitest'
import { migrateThemeState } from '../stores/theme-store'

describe('theme-store migration', () => {
  it('hard-overwrites legacy edited source fields to empty styles css', () => {
    const migrated = migrateThemeState({
      baseCss: '.legacy { color: red; }',
      editedBaseSourceCss: '.legacy { color: blue; }',
      editedPresetSourceCss: '.legacy { color: green; }',
    })

    expect(migrated.stylesCss).toBe('')
  })

  it('migrates legacy customCss when stylesCss is missing', () => {
    const migrated = migrateThemeState({
      customCss: '.custom { color: rebeccapurple; }',
    })

    expect(migrated.stylesCss).toBe('.custom { color: rebeccapurple; }')
    expect('customCss' in migrated).toBe(false)
  })

  it('migrates customCss to stylesCss stripping quick-start content', () => {
    const migrated = migrateThemeState({
      customCss: '@import "./quick-start.css";\n:root {\n  --quickstart-primary-color: #0066cc;\n}\n.card { color: blue; }',
    })

    expect(migrated.stylesCss).toBe('.card { color: blue; }')
  })

  it('preserves existing stylesCss when already set', () => {
    const migrated = migrateThemeState({
      customCss: '.old { color: red; }',
      stylesCss: '.new { color: blue; }',
    })

    expect(migrated.stylesCss).toBe('.new { color: blue; }')
  })

  it('sets themeQuickStartDefaults to empty string when not present', () => {
    const migrated = migrateThemeState({
      customCss: '.card { color: blue; }',
    })

    expect(migrated.themeQuickStartDefaults).toBe('')
  })
})
