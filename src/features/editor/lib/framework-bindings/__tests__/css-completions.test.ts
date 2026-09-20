import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BOOTSTRAP_BINDING } from '../bootstrap'
import { BULMA_BINDING } from '../bulma'
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

  it('offers each framework only its own variable namespace, under its own name', () => {
    const css = '.button { --bulma-primary-l: 41%; --bs-btn-bg: red; }'
    const bulma = getFrameworkCssCompletions({ ...BULMA_BINDING, frameworkCss: css })

    expect(bulma.variables.map(variable => variable.name)).toEqual(['--bulma-primary-l'])
    expect(bulma.identifiers).toEqual(['.button'])
    // Suggestions are attributed to the framework that contributed them, not always Bootstrap.
    expect(bulma.label).toBe('Bulma')
    expect(bulma.variables[0].detail).toBe('Bulma variable')
  })

  it('does not suggest Bootstrap vocabulary for native themes', () => {
    const native = getFrameworkCssCompletions({ ...NATIVE_BINDING, frameworkCss: '.btn { --bs-btn-bg: red; }' })

    expect(native.identifiers).toEqual([])
    expect(native.variables).toEqual([])
  })
})
