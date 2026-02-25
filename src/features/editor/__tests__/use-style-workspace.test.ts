import { describe, expect, it } from 'vitest'
import { normalizeCss } from '../style-editor-utils'

describe('style-editor-utils', () => {
  it('normalizes css line endings and trims outer whitespace', () => {
    const css = '\r\n  .foo {\r\n    color: red;\r\n  }\r\n'
    expect(normalizeCss(css)).toBe('.foo {\n    color: red;\n  }')
  })
})
