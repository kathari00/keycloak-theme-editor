import { beforeAll, describe, expect, it } from 'vitest'
import { ensureGeneratedPreviewPagesLoaded, getVariantPages, getVariantScenarioOptions, resolveScenarioHtml } from '../load-generated'

beforeAll(async () => {
  await ensureGeneratedPreviewPagesLoaded()
})

describe('resolveScenarioHtml', () => {
  it('returns scenario options as an array', () => {
    const options = getVariantScenarioOptions({
      variantId: 'v2',
      pageId: 'login.html',
    })

    expect(Array.isArray(options)).toBe(true)
  })

  it('returns stable page map references', () => {
    const first = getVariantPages('v2')
    const second = getVariantPages('v2')

    expect(first).toBe(second)
  })

  it('does not override page html for the default story', () => {
    const scenarioHtml = resolveScenarioHtml({
      variantId: 'modern-gradient',
      pageId: 'login.html',
      storyId: 'default',
    })

    expect(scenarioHtml).toBeNull()
  })

  it('includes default plus named login stories', () => {
    const optionIds = getVariantScenarioOptions({
      variantId: 'v2',
      pageId: 'login.html',
    }).map(option => option.id)

    expect(optionIds).toContain('default')
    expect(optionIds).toContain('minimal')
    expect(optionIds).toContain('invalid-state')
  })

  it('returns html for non-default login stories', () => {
    const scenarioHtml = resolveScenarioHtml({
      variantId: 'v2',
      pageId: 'login.html',
      storyId: 'minimal',
    })

    expect(typeof scenarioHtml).toBe('string')
    expect((scenarioHtml || '').length).toBeGreaterThan(100)
  })
})
