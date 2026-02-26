interface ParsedRule {
  selector: string
  raw: string
}

interface ParsedBlock {
  type: 'rule' | 'media' | 'at-rule'
  raw: string
  selector?: string
  mediaQuery?: string
  innerRules?: ParsedRule[]
}

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

      if (block.type === 'media' && block.innerRules) {
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

      if (block.type === 'media' && block.innerRules) {
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

      if (block.type === 'media' && block.innerRules) {
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

  private renderMediaBlock(mediaQuery: string, rules: ParsedRule[]): string {
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

      if (block.type === 'media' && block.innerRules) {
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

  private parseBlocks(cssText: string): ParsedBlock[] {
    const text = cssText.trim()
    if (!text) {
      return []
    }

    const blocks: ParsedBlock[] = []
    let index = 0
    while (index < text.length) {
      index = this.skipWhitespaceAndComments(text, index)
      if (index >= text.length) {
        break
      }

      const result = this.parseBlock(text, index)
      if (result) {
        blocks.push(result.block)
        index = result.endIndex
      }
      else {
        index++
      }
    }

    return blocks
  }

  private parseBlock(text: string, start: number): { block: ParsedBlock, endIndex: number } | null {
    // At-rule terminated by ; (e.g. @import url(...);)
    const semiIdx = this.findTopLevelSemicolon(text, start)
    const braceIdx = text.indexOf('{', start)
    if (text[start] === '@' && semiIdx !== -1 && (braceIdx === -1 || semiIdx < braceIdx)) {
      return {
        block: { type: 'at-rule', raw: text.substring(start, semiIdx + 1).trim() },
        endIndex: semiIdx + 1,
      }
    }

    if (braceIdx === -1) {
      return null
    }

    const prelude = text.substring(start, braceIdx).trim()
    if (!prelude) {
      return null
    }

    // Find matching closing brace
    let depth = 1
    let i = braceIdx + 1
    while (i < text.length && depth > 0) {
      if (text[i] === '{') {
        depth++
      }
      else if (text[i] === '}') {
        depth--
      }
      i++
    }

    const raw = text.substring(start, i).trim()

    // @media → parse inner rules recursively
    if (/^@media\b/i.test(prelude)) {
      const mediaQuery = prelude.slice(6).trim()
      const innerText = text.substring(braceIdx + 1, i - 1).trim()
      const innerRules = this.parseBlocks(innerText)
        .filter((block): block is ParsedBlock & { selector: string } => block.type === 'rule' && Boolean(block.selector))
        .map(block => ({ selector: block.selector, raw: block.raw }))

      return { block: { type: 'media', raw, mediaQuery, innerRules }, endIndex: i }
    }

    // Other @-rules (@font-face, @keyframes, etc.)
    if (prelude.startsWith('@')) {
      return { block: { type: 'at-rule', raw }, endIndex: i }
    }

    // Regular rule
    return { block: { type: 'rule', selector: prelude, raw }, endIndex: i }
  }

  private findTopLevelSemicolon(text: string, start: number): number {
    let quote: '"' | '\'' | null = null
    let parenDepth = 0

    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      const prev = i > start ? text[i - 1] : ''

      if (quote) {
        if (ch === quote && prev !== '\\') {
          quote = null
        }
        continue
      }

      if (ch === '"' || ch === '\'') {
        quote = ch
        continue
      }
      if (ch === '(') {
        parenDepth++
        continue
      }
      if (ch === ')' && parenDepth > 0) {
        parenDepth--
        continue
      }
      if (ch === ';' && parenDepth === 0) {
        return i
      }
    }

    return -1
  }

  private skipWhitespaceAndComments(text: string, start: number): number {
    let index = start
    while (index < text.length) {
      const ch = text.charCodeAt(index)
      if (ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 12) {
        index++
        continue
      }
      if (ch === 47 && text.charCodeAt(index + 1) === 42) {
        const end = text.indexOf('*/', index + 2)
        index = end === -1 ? text.length : end + 2
        continue
      }
      break
    }
    return index
  }
}

export const userCssStore = new UserCssStore()
