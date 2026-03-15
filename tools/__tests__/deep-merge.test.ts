import { describe, expect, it } from 'vitest'
import { deepMerge } from '../generate-preview'

describe('deepMerge', () => {
  it('merges flat objects', () => {
    const result = deepMerge({ a: 1 }, { b: 2 })
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('deep-merges nested objects', () => {
    const result = deepMerge(
      { url: { loginAction: '#', resourcesPath: '/old' } },
      { url: { resourcesPath: '/new' } },
    )
    expect(result).toEqual({ url: { loginAction: '#', resourcesPath: '/new' } })
  })

  it('overwrites non-object values', () => {
    const result = deepMerge({ a: 'old', b: 1 }, { a: 'new', b: 2 })
    expect(result).toEqual({ a: 'new', b: 2 })
  })

  it('replaces arrays instead of merging them', () => {
    const result = deepMerge(
      { items: [1, 2, 3] },
      { items: [4] },
    )
    expect(result).toEqual({ items: [4] })
  })

  it('skips undefined sources', () => {
    const result = deepMerge({ a: 1 }, undefined, { b: 2 }, undefined)
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('does not mutate the target', () => {
    const target = { a: 1, nested: { x: 10 } }
    const result = deepMerge(target, { a: 2, nested: { y: 20 } })
    expect(target).toEqual({ a: 1, nested: { x: 10 } })
    expect(result).toEqual({ a: 2, nested: { x: 10, y: 20 } })
  })

  it('handles multiple sources in order', () => {
    const result = deepMerge({ a: 1 }, { a: 2, b: 2 }, { a: 3, c: 3 })
    expect(result).toEqual({ a: 3, b: 2, c: 3 })
  })
})
