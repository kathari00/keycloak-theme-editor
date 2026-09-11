import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BOOTSTRAP_BINDING } from '../bootstrap'
import { getFrameworkCssCompletions } from '../css-completions'
import { NATIVE_BINDING } from '../types'

describe('framework CSS completions', () => {
  it('offers classes and variables from the selected Bootstrap stylesheet', () => {
    const frameworkCss = readFileSync('node_modules/bootswatch/dist/flatly/bootstrap.min.css', 'utf8')
    const result = getFrameworkCssCompletions({ ...BOOTSTRAP_BINDING, frameworkCss })
    expect(result.identifiers).toEqual(expect.arrayContaining(['.btn-primary', '.form-control', '.card', '.d-flex']))
    expect(result.variables.map(variable => variable.name)).toEqual(expect.arrayContaining(['--bs-btn-bg', '--bs-card-border-color', '--bs-body-color']))
    expect(new Set(result.identifiers).size).toBe(result.identifiers.length)
  })

  it('does not suggest Bootstrap vocabulary for native themes', () => {
    expect(getFrameworkCssCompletions({ ...NATIVE_BINDING, frameworkCss: '.btn { --bs-btn-bg: red; }' })).toEqual({ identifiers: [], variables: [] })
  })
})
