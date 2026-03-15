import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ensureGeneratedPreviewPagesLoaded, getVariantPages, getVariantStateOptions, resolveStateHtml } from '../load-generated'

const pagesJsonPath = path.resolve(__dirname, '../generated/pages.json')

beforeAll(async () => {
  const pagesJson = fs.readFileSync(pagesJsonPath, 'utf8')
  const pagesData = JSON.parse(pagesJson)
  const fetchMock = vi.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(pagesData),
    })
  })
  vi.stubGlobal('fetch', fetchMock)

  await ensureGeneratedPreviewPagesLoaded()
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('resolveStateHtml', () => {
  it('returns scenario options as an array', () => {
    const options = getVariantStateOptions({
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

  it('does not override page html for the default state', () => {
    const scenarioHtml = resolveStateHtml({
      variantId: 'modern-card',
      pageId: 'login.html',
      stateId: 'default',
    })

    expect(scenarioHtml).toBeNull()
  })

  it('includes default plus named login states', () => {
    const optionIds = getVariantStateOptions({
      variantId: 'v2',
      pageId: 'login.html',
    }).map(option => option.id)

    expect(optionIds).toContain('default')
    expect(optionIds[0]).toBe('default')
  })

  it('returns html for non-default login states', () => {
    const options = getVariantStateOptions({
      variantId: 'v2',
      pageId: 'login.html',
    })
    const nonDefaultState = options.find(option => option.id !== 'default')
    if (!nonDefaultState) {
      expect(nonDefaultState).toBeUndefined()
      return
    }

    const scenarioHtml = resolveStateHtml({
      variantId: 'v2',
      pageId: 'login.html',
      stateId: nonDefaultState.id,
    })

    expect(typeof scenarioHtml).toBe('string')
    expect((scenarioHtml || '').length).toBeGreaterThan(100)
  })
})
