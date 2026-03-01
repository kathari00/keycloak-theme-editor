import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ensureGeneratedPreviewPagesLoaded, getVariantPages, getVariantScenarioOptions, resolveScenarioHtml } from '../load-generated'

const pagesJsonPath = path.resolve(__dirname, '../generated/pages.json')

beforeAll(async () => {
  const pagesJson = fs.readFileSync(pagesJsonPath, 'utf8')
  const pagesData = JSON.parse(pagesJson)

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: () => Promise.resolve(pagesData),
  }))

  await ensureGeneratedPreviewPagesLoaded()
})

afterAll(() => {
  vi.restoreAllMocks()
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
    expect(optionIds[0]).toBe('default')
  })

  it('returns html for non-default login stories', () => {
    const options = getVariantScenarioOptions({
      variantId: 'v2',
      pageId: 'login.html',
    })
    const nonDefaultStory = options.find(option => option.id !== 'default')
    if (!nonDefaultStory) {
      expect(nonDefaultStory).toBeUndefined()
      return
    }

    const scenarioHtml = resolveScenarioHtml({
      variantId: 'v2',
      pageId: 'login.html',
      storyId: nonDefaultStory.id,
    })

    expect(typeof scenarioHtml).toBe('string')
    expect((scenarioHtml || '').length).toBeGreaterThan(100)
  })
})
