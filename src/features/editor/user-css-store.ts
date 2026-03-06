import type { CssRuleBlock, CssTopLevelBlock } from '../../lib/css-ast'
import { parseCssTopLevelBlocks } from '../../lib/css-ast'

interface ReplaceCssOptions {
  insertPositionWhenMissing?: 'start' | 'end'
}

class UserCssStore {
  private readonly statePseudoClasses = [
    ':hover',
    ':active',
    ':focus',
    ':focus-visible',
    ':focus-within',
    ':visited',
    ':target',
    ':checked',
    ':disabled',
    ':enabled',
    ':required',
    ':optional',
    ':invalid',
    ':valid',
    ':read-only',
    ':read-write',
  ] as const

  private readonly pseudoClassRegexes: RegExp[] = this.statePseudoClasses.map(
    pseudo => new RegExp(`\\${pseudo}\\b`, 'g'),
  )

  getCssForElementFromText(cssText: string, element: Element): string {
    if (!cssText.trim()) {
      return ''
    }

    const matchesSelection = this.createSelectionMatcher(element)
    return this.extractCssByMatcher(cssText, matchesSelection)
  }

  replaceCssForElementInText(cssText: string, element: Element, newCss: string, options?: ReplaceCssOptions): string {
    if (!this.canApplyReplacementCss(newCss)) {
      return cssText || ''
    }

    const selectorsInNewCss = this.extractNormalizedSelectorsFromCss(newCss)
    return this.replaceCssByMatcher(
      cssText || '',
      newCss,
      selector =>
        this.elementMatchesSelectorList(element, selector)
        || this.selectorListOverlapsNormalizedSet(selector, selectorsInNewCss),
      options,
    )
  }

  replaceCssBySelectorInText(cssText: string, newCss: string, options?: ReplaceCssOptions): string {
    if (!this.canApplyReplacementCss(newCss)) {
      return cssText || ''
    }

    const selectorsInNewCss = this.extractNormalizedSelectorsFromCss(newCss)
    return this.replaceCssByMatcher(
      cssText || '',
      newCss,
      selector => this.selectorListOverlapsNormalizedSet(selector, selectorsInNewCss),
      options,
    )
  }

  doesCssTargetElement(cssText: string, element: Element): boolean {
    if (!cssText.trim()) {
      return false
    }

    for (const block of this.parseBlocks(cssText)) {
      if (block.type === 'rule' && block.selector) {
        if (this.elementMatchesSelectorList(element, block.selector)) {
          return true
        }
        continue
      }

      if (block.type === 'media') {
        for (const rule of block.innerRules) {
          if (this.elementMatchesSelectorList(element, rule.selector)) {
            return true
          }
        }
      }
    }

    return false
  }

  private extractCssByMatcher(cssText: string, isMatch: (selector: string) => boolean): string {
    return this.extractCssBlocksByMatcher(cssText, isMatch).join('\n\n')
  }

  private extractCssBlocksByMatcher(cssText: string, isMatch: (selector: string) => boolean): string[] {
    const matching: string[] = []
    for (const block of this.parseBlocks(cssText)) {
      if (block.type === 'rule' && block.selector) {
        if (isMatch(block.selector)) {
          matching.push(block.raw)
        }
        continue
      }

      if (block.type === 'media') {
        const matchingInner = block.innerRules.filter(rule => isMatch(rule.selector))
        if (matchingInner.length > 0) {
          matching.push(this.renderMediaBlock(block.mediaQuery || '', matchingInner))
        }
      }
    }
    return matching
  }

  private replaceCssByMatcher(
    cssText: string,
    newCss: string,
    isMatch: (selector: string) => boolean,
    options?: ReplaceCssOptions,
  ): string {
    const result: string[] = []
    const trimmedNewCss = (newCss || '').trim()
    let inserted = false

    for (const block of this.parseBlocks(cssText)) {
      if (block.type === 'rule' && block.selector) {
        if (isMatch(block.selector)) {
          // Replace the first matching block in-place; drop subsequent matches
          if (!inserted && trimmedNewCss) {
            result.push(trimmedNewCss)
            inserted = true
          }
          continue
        }
        result.push(block.raw)
        continue
      }

      if (block.type === 'media') {
        const kept = block.innerRules.filter(rule => !isMatch(rule.selector))
        if (kept.length > 0) {
          result.push(this.renderMediaBlock(block.mediaQuery || '', kept))
        }
        continue
      }

      result.push(block.raw)
    }

    // No existing block was matched: add the new block at start/end as requested.
    if (!inserted && trimmedNewCss) {
      if (options?.insertPositionWhenMissing === 'start') {
        result.unshift(trimmedNewCss)
      }
      else {
        result.push(trimmedNewCss)
      }
    }

    return result.join('\n\n')
  }

  private renderMediaBlock(mediaQuery: string, rules: CssRuleBlock[]): string {
    const innerCss = rules.map(rule => `  ${rule.raw}`).join('\n\n')
    return `@media ${mediaQuery} {\n${innerCss}\n}`
  }

  private normalizeSelectorForReplacement(selector: string): string {
    return selector
      .trim()
      .replace(/\s*([>+~])\s*/g, '$1')
      .replace(/\s+/g, ' ')
  }

  private extractNormalizedSelectorsFromCss(cssText: string): Set<string> {
    const selectors = new Set<string>()
    for (const block of this.parseBlocks(cssText || '')) {
      if (block.type === 'rule' && block.selector) {
        const normalized = this.normalizeSelectorForReplacement(block.selector)
        if (this.isReplacementSelectorValid(normalized)) {
          selectors.add(normalized)
        }
        continue
      }

      if (block.type === 'media') {
        for (const rule of block.innerRules) {
          const normalized = this.normalizeSelectorForReplacement(rule.selector)
          if (this.isReplacementSelectorValid(normalized)) {
            selectors.add(normalized)
          }
        }
      }
    }
    return selectors
  }

  private canApplyReplacementCss(cssText: string): boolean {
    if (!cssText.trim()) {
      return true
    }

    return this.extractNormalizedSelectorsFromCss(cssText).size > 0
  }

  private isReplacementSelectorValid(normalizedSelector: string): boolean {
    if (!normalizedSelector) {
      return false
    }

    const tokens = normalizedSelector.split(/[\s>+~,]+/).filter(Boolean)
    if (tokens.length === 0) {
      return false
    }

    return !tokens.some(token => token === '.' || token === '#')
  }

  private selectorListOverlapsNormalizedSet(selectorList: string, normalizedSelectors: Set<string>): boolean {
    if (normalizedSelectors.size === 0) {
      return false
    }

    const normalized = this.normalizeSelectorForReplacement(selectorList)
    return Boolean(normalized) && normalizedSelectors.has(normalized)
  }

  private elementMatchesSelectorList(element: Element, selectorList: string): boolean {
    if (this.matchesSelectorSafely(element, selectorList)) {
      return true
    }

    const simplifiedSelector = this.simplifySelectorForElementMatch(selectorList)
    if (!simplifiedSelector || simplifiedSelector === selectorList) {
      return false
    }

    return this.matchesSelectorSafely(element, simplifiedSelector)
  }

  private createSelectionMatcher(element: Element): (selectorList: string) => boolean {
    const selectedIdentityTokens = this.getElementIdentityTokens(element)
    if (selectedIdentityTokens.length > 0) {
      return (selectorList: string) => {
        // Keep structural selectors (e.g. :nth-of-type) that directly match the selected element,
        // even when they don't include the selected id/class token.
        if (this.matchesSelectorSafely(element, selectorList)) {
          return true
        }

        if (!this.selectorReferencesAnyIdentityToken(selectorList, selectedIdentityTokens)) {
          return false
        }

        return this.elementMatchesSelectorList(element, selectorList)
      }
    }

    return (selectorList: string) => {
      return this.elementMatchesSelectorList(element, selectorList)
    }
  }

  private getElementIdentityTokens(element: Element): string[] {
    const tokens: string[] = []
    if (element.id) {
      tokens.push(`#${element.id}`)
    }
    element.classList.forEach((className) => {
      if (className) {
        tokens.push(`.${className}`)
      }
    })
    return tokens
  }

  private selectorReferencesAnyIdentityToken(selectorList: string, identityTokens: string[]): boolean {
    return identityTokens.some(token => selectorList.includes(token))
  }

  private matchesSelectorSafely(element: Element, selector: string): boolean {
    try {
      return element.matches(selector)
    }
    catch {
      return false
    }
  }

  private simplifySelectorForElementMatch(selector: string): string {
    let simplified = selector.trim()
    if (!simplified) {
      return ''
    }

    simplified = simplified.replace(/::[\w-]+(?:\([^)]*\))?/g, '')
    for (const regex of this.pseudoClassRegexes) {
      regex.lastIndex = 0
      simplified = simplified.replace(regex, '')
    }

    simplified = simplified
      .replace(/:not\(\s*\)/g, '')
      .replace(/:is\(\s*\)/g, '')
      .replace(/:where\(\s*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    return simplified
  }

  private parseBlocks(cssText: string): CssTopLevelBlock[] {
    return parseCssTopLevelBlocks(cssText)
  }
}

export const userCssStore = new UserCssStore()
