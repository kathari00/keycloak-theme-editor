import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { getEventElement } from '../lib/event-target-utils'

describe('getEventElement', () => {
  it('returns a local element target directly', () => {
    const button = document.createElement('button')

    expect(getEventElement(button)).toBe(button)
  })

  it('returns iframe-like foreign realm elements without relying on instanceof', () => {
    const foreignDom = new JSDOM('<!doctype html><html><body><button id="target">Click</button></body></html>')
    const button = foreignDom.window.document.getElementById('target')

    expect(button).not.toBeNull()
    expect(button instanceof Element).toBe(false)
    expect(getEventElement(button)).toBe(button)
  })

  it('resolves foreign realm text nodes to their parent element', () => {
    const foreignDom = new JSDOM('<!doctype html><html><body><button id="target">Click</button></body></html>')
    const textNode = foreignDom.window.document.getElementById('target')?.firstChild

    expect(textNode).not.toBeNull()
    expect(textNode instanceof Node).toBe(false)
    expect(getEventElement(textNode)).toBe(textNode?.parentElement ?? null)
  })
})
