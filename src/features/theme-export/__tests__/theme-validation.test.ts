import { describe, expect, it } from 'vitest'
import { getThemeNameError } from '../theme-validation'

describe('getThemeNameError', () => {
  it('returns error for empty string', () => {
    expect(getThemeNameError('')).toBe('Theme name is required')
  })

  it('returns error for whitespace-only string', () => {
    expect(getThemeNameError('   ')).toBe('Theme name is required')
  })

  it('accepts a simple name', () => {
    expect(getThemeNameError('mytheme')).toBe('')
  })

  it('accepts letters and numbers', () => {
    expect(getThemeNameError('theme1')).toBe('')
  })

  it('accepts hyphens', () => {
    expect(getThemeNameError('my-theme')).toBe('')
  })

  it('accepts underscores', () => {
    expect(getThemeNameError('my_theme')).toBe('')
  })

  it('rejects spaces', () => {
    expect(getThemeNameError('my theme')).not.toBe('')
  })

  it('rejects dots', () => {
    expect(getThemeNameError('my.theme')).not.toBe('')
  })

  it('rejects special characters', () => {
    expect(getThemeNameError('theme@1!')).not.toBe('')
  })
})
