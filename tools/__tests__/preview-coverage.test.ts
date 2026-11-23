/* eslint-disable no-template-curly-in-string -- FreeMarker interpolations in test templates */
import { describe, expect, it } from 'vitest'
import kcBaseMocks from '../kc-base-mocks'
import { kcPageStates } from '../kc-page-states'
import { instrument } from '../preview-coverage'

describe('instrument', () => {
  it('records each branch of an if/elseif/else chain', () => {
    const { text, branches } = instrument('<#if a>A<#elseif b>B<#else>C</#if>', 't.ftl')
    expect(branches.map(branch => branch.kind)).toEqual(['if', 'elseif', 'else'])
    expect(branches.map(branch => branch.condition)).toEqual(['a', 'b', 'not (a)'])
    expect(text).toBe(
      '<#if a><#global __kcCov=(__kcCov!"")+"t.ftl:1:if;">A'
      + '<#elseif b><#global __kcCov=(__kcCov!"")+"t.ftl:1:elseif;">B'
      + '<#else><#global __kcCov=(__kcCov!"")+"t.ftl:1:else;">C</#if>',
    )
  })

  it('adds an else branch to an if without one, so "condition false" is measured too', () => {
    const { text, branches } = instrument('<#if a>A</#if>', 't.ftl')
    expect(branches.map(branch => branch.kind)).toEqual(['if', 'implicit-else'])
    expect(text).toContain('<#else><#global __kcCov=(__kcCov!"")+"t.ftl:1:if:implicit-else;"></#if>')
  })

  it('leaves the else of a list alone', () => {
    const { text, branches } = instrument('<#list xs as x>${x}<#else>none</#list>', 't.ftl')
    expect(branches).toEqual([])
    expect(text).toBe('<#list xs as x>${x}<#else>none</#list>')
  })

  it('reads conditions containing ">" inside parentheses and quotes', () => {
    const { branches } = instrument('<#if (a > 1) && b == ">">x</#if>', 't.ftl')
    expect(branches[0].condition).toBe('(a > 1) && b == ">"')
  })

  it('ignores directives inside FreeMarker comments', () => {
    const { branches } = instrument('<#-- <#if a>x</#if> --><#if b>y</#if>', 't.ftl')
    expect(branches.map(branch => branch.condition)).toEqual(['b', 'not (b)'])
  })
})

describe('kcPageStates', () => {
  it('only defines states for pages that have a base mock, since others are ignored', () => {
    const pagesWithMocks = new Set(Object.keys(kcBaseMocks))
    expect(Object.keys(kcPageStates).filter(pageId => !pagesWithMocks.has(pageId))).toEqual([])
  })
})
