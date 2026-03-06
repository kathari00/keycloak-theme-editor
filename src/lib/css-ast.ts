import * as csstree from 'css-tree'
import type { CssLocation, CssNode, Rule, StyleSheet } from 'css-tree'

type CssLocatable = {
  loc?: CssLocation | null
}

export interface CssRuleBlock {
  selector: string
  raw: string
}

export interface CssMediaBlock {
  type: 'media'
  mediaQuery: string
  raw: string
  innerRules: CssRuleBlock[]
}

export interface CssAtRuleBlock {
  type: 'at-rule'
  raw: string
}

export interface CssPlainRuleBlock {
  type: 'rule'
  selector: string
  raw: string
}

export type CssTopLevelBlock = CssMediaBlock | CssAtRuleBlock | CssPlainRuleBlock

function parseStyleSheet(cssText: string): StyleSheet {
  return csstree.parse(cssText, {
    context: 'stylesheet',
    parseValue: false,
    positions: true,
  }) as StyleSheet
}

function generateNode(node: CssNode | null | undefined): string {
  return node ? csstree.generate(node) : ''
}

function extractSource(cssText: string, node: CssLocatable | CssNode | null | undefined): string {
  const location = (node as CssLocatable | null | undefined)?.loc
  if (!location) {
    return generateNode(node as CssNode | null | undefined)
  }

  return cssText.slice(location.start.offset, location.end.offset)
}

function getDirectDeclarationEntries(rule: Rule): Array<[string, string]> {
  const entries: Array<[string, string]> = []

  rule.block?.children?.forEach((node) => {
    if (node.type !== 'Declaration') {
      return
    }

    entries.push([node.property, generateNode(node.value).trim()])
  })

  return entries
}

function toRuleBlock(cssText: string, node: Rule): CssRuleBlock {
  return {
    selector: extractSource(cssText, node.prelude).trim(),
    raw: extractSource(cssText, node),
  }
}

export function parseCssTopLevelBlocks(cssText: string): CssTopLevelBlock[] {
  const blocks: CssTopLevelBlock[] = []

  parseStyleSheet(cssText).children?.forEach((node) => {
    if (node.type === 'Rule') {
      blocks.push({
        type: 'rule',
        ...toRuleBlock(cssText, node),
      })
      return
    }

    if (node.type !== 'Atrule') {
      return
    }

    if (node.name === 'media') {
      const innerRules: CssRuleBlock[] = []

      node.block?.children?.forEach((childNode) => {
        if (childNode.type === 'Rule') {
          innerRules.push(toRuleBlock(cssText, childNode))
        }
      })

      blocks.push({
        type: 'media',
        mediaQuery: extractSource(cssText, node.prelude).trim(),
        raw: extractSource(cssText, node),
        innerRules,
      })
      return
    }

    blocks.push({
      type: 'at-rule',
      raw: extractSource(cssText, node),
    })
  })

  return blocks
}

export function findFirstDeclarationValue(cssText: string, propertyName: string): string {
  const searchName = propertyName.trim()
  if (!searchName) {
    return ''
  }

  let result = ''

  csstree.walk(parseStyleSheet(cssText), {
    visit: 'Declaration',
    enter(node) {
      if (result || node.type !== 'Declaration' || node.property !== searchName) {
        return
      }

      result = generateNode(node.value).trim()
    },
  })

  return result
}

export function collectDeclarationsBySelector(cssText: string): Map<string, Record<string, string>> {
  const declarationsBySelector = new Map<string, Record<string, string>>()

  csstree.walk(parseStyleSheet(cssText), {
    visit: 'Rule',
    enter(node) {
      if (node.type !== 'Rule') {
        return
      }

      const selector = generateNode(node.prelude)
      const declarations = declarationsBySelector.get(selector) ?? {}

      for (const [property, value] of getDirectDeclarationEntries(node)) {
        declarations[property] = value
      }

      declarationsBySelector.set(selector, declarations)
    },
  })

  return declarationsBySelector
}
