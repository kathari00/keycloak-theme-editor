import { describe, expect, it } from 'vitest'
import { userCssStore } from '../user-css-store'

function getElement(markup: string, selector: string): Element {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = markup
  const element = wrapper.querySelector(selector)
  if (!element) {
    throw new Error(`Missing element for selector: ${selector}`)
  }
  return element
}

describe('userCssStore', () => {
  describe('getCssForElementFromText', () => {
    it('returns empty string for empty css input', () => {
      const element = getElement('<div id="kc-code"><p>Demo</p></div>', '#kc-code p')
      expect(userCssStore.getCssForElementFromText('', element)).toBe('')
      expect(userCssStore.getCssForElementFromText('  \n  ', element)).toBe('')
    })

    it('extracts direct matching rules', () => {
      const css = `#kc-code p {
  color: black;
}

.other {
  color: blue;
}`
      const element = getElement('<div id="kc-code"><p>Demo</p></div>', '#kc-code p')
      const result = userCssStore.getCssForElementFromText(css, element)
      expect(result).toContain('#kc-code p')
      expect(result).not.toContain('.other')
    })

    it('extracts pseudo-class selector lists that explicitly reference the selected identity', () => {
      const css = `#demo-input:hover,
input:hover,
select:hover,
textarea:hover {
  border-color: red;
}`
      const element = getElement('<div class="kcInputClass"><input id="demo-input"></div>', '#demo-input')
      const result = userCssStore.getCssForElementFromText(css, element)
      expect(result).toContain('#demo-input:hover')
      expect(result).toContain('border-color: red;')
    })

    it('extracts structural selectors that directly match the selected element without identity tokens', () => {
      const css = `button:nth-of-type(1) {
  background-color: red;
}

.other {
  color: blue;
}`
      const element = getElement('<div><button id="first-btn">A</button><button id="second-btn">B</button></div>', '#first-btn')
      const result = userCssStore.getCssForElementFromText(css, element)
      expect(result).toContain('button:nth-of-type(1)')
      expect(result).toContain('background-color: red;')
      expect(result).not.toContain('.other')
    })

    it('keeps selector lists with commas inside :is() intact when matching', () => {
      const css = `.wrapper :is(input.kcInputClass:focus, textarea.kcInputClass:focus) {
  border-color: red;
}

.other {
  border-color: blue;
}`
      const element = getElement('<div class="wrapper"><input class="kcInputClass" id="demo-input"></div>', '#demo-input')
      const result = userCssStore.getCssForElementFromText(css, element)
      expect(result).toContain('.wrapper :is(input.kcInputClass:focus, textarea.kcInputClass:focus)')
      expect(result).toContain('border-color: red;')
      expect(result).not.toContain('.other')
    })

    it('extracts matching rules from @media blocks only', () => {
      const css = `@media (max-width: 768px) {
  #kc-code p {
    color: black;
  }

  .other {
    color: blue;
  }
}`
      const element = getElement('<div id="kc-code"><p>Demo</p></div>', '#kc-code p')
      const result = userCssStore.getCssForElementFromText(css, element)
      expect(result).toContain('@media (max-width: 768px)')
      expect(result).toContain('#kc-code p')
      expect(result).not.toContain('.other')
    })

    it('does not include ancestor rules when selected element has its own identity', () => {
      const css = `#kc-code {
  color: black;
}

#demo-p {
  font-weight: 600;
}

.other {
  color: blue;
}`
      const element = getElement('<div id="kc-code"><p id="demo-p">Demo</p></div>', '#demo-p')
      const result = userCssStore.getCssForElementFromText(css, element)
      expect(result).toContain('#demo-p')
      expect(result).toContain('font-weight: 600;')
      expect(result).not.toContain('#kc-code')
      expect(result).not.toContain('.other')
    })

    it('does not extract descendant-only rules when a container element is selected', () => {
      const css = `#kc-code pre code {
  color: black;
}

.other {
  color: blue;
}`
      const element = getElement('<div id="kc-code"><pre><code id="demo-code">123</code></pre></div>', '#kc-code')
      const result = userCssStore.getCssForElementFromText(css, element)
      expect(result).not.toContain('#kc-code pre code')
      expect(result).not.toContain('.other')
    })

    it('only includes selectors that target the selected identified container itself', () => {
      const css = `html {
  color-scheme: light;
}

body {
  margin: 0;
}

#kc-code {
  color: black;
}

#kc-code pre code {
  color: blue;
}`
      const element = getElement('<div id="kc-code"><pre><code>123</code></pre></div>', '#kc-code')
      const result = userCssStore.getCssForElementFromText(css, element)
      expect(result).toContain('#kc-code {')
      expect(result).not.toContain('#kc-code pre code {')
      expect(result).not.toContain('html {')
      expect(result).not.toContain('body {')
    })

    it('does not include plain parent self-rules when selecting an identified element', () => {
      const css = `#kc-content-wrapper {
  display: flex;
}

#kc-content-wrapper #kc-code {
  border: 1px solid red;
}`
      const element = getElement('<div id="kc-content-wrapper"><div id="kc-code"></div></div>', '#kc-code')
      const result = userCssStore.getCssForElementFromText(css, element)
      expect(result).toContain('#kc-content-wrapper #kc-code')
      expect(result).not.toContain('#kc-content-wrapper {\n  display: flex;\n}')
    })

    it('does not include ancestor rules for anonymous selected elements', () => {
      const css = `#kc-code {
  color: black;
}

body {
  margin: 0;
}`
      const element = getElement('<div id="kc-code"><span><em id="leaf">x</em></span></div>', '#leaf')
      const anonymousSelected = element.parentElement
      if (!anonymousSelected) {
        throw new Error('Expected parent element')
      }
      anonymousSelected.removeAttribute('id')
      anonymousSelected.className = ''

      const result = userCssStore.getCssForElementFromText(css, anonymousSelected)
      expect(result).not.toContain('#kc-code {')
      expect(result).not.toContain('body {')
    })

    it('includes generic element selectors when they directly target an anonymous selected element', () => {
      const css = `a {
  color: red;
}

#kc-registration > span > a {
  color: blue;
}`
      const anchor = getElement('<div id="kc-registration"><span><a href="#" id="reg-link">Register</a></span></div>', '#reg-link')
      anchor.removeAttribute('id')
      const result = userCssStore.getCssForElementFromText(css, anchor)
      expect(result).toContain('#kc-registration > span > a')
      expect(result).toContain('a {\n  color: red;\n}')
    })

    it('includes generic heading selectors for anonymous heading selection', () => {
      const css = `h2 {
  color: red;
}

.other {
  color: blue;
}`
      const heading = getElement('<div id="kc-content"><h2>Title</h2></div>', 'h2')
      const result = userCssStore.getCssForElementFromText(css, heading)
      expect(result).toContain('h2 {')
      expect(result).toContain('color: red;')
      expect(result).not.toContain('.other')
    })

    it('excludes generic focus rules for identified input selection when selector does not reference that input', () => {
      const css = `#code, input.kcInputClass, .kcInputClass input, select.kcInputClass, textarea.kcInputClass {
  border: 1px solid #d1d5db;
}

.kcInputClass input:focus, input:focus, select:focus, textarea:focus {
  border-color: red;
}`
      const element = getElement('<div class="kcInputClass"><input id="code"></div>', '#code')
      const result = userCssStore.getCssForElementFromText(css, element)
      expect(result).toContain('#code, input.kcInputClass, .kcInputClass input, select.kcInputClass, textarea.kcInputClass')
      expect(result).not.toContain('.kcInputClass input:focus, input:focus, select:focus, textarea:focus')
    })
  })

  describe('replaceCssForElementInText', () => {
    it('replaces matching rule blocks without duplicates during typing updates', () => {
      const element = getElement('<div id="kc-code"><p id="demo-p">Demo</p></div>', '#demo-p')
      let sourceCss = `#kc-code p {
  color: black;
}

.other {
  color: blue;
}`
      const steps = [
        '#kc-code p {}',
        '#kc-code p {\n  c\n}',
        '#kc-code p {\n  co\n}',
        '#kc-code p {\n  color:\n}',
        '#kc-code p {\n  color: b\n}',
        '#kc-code p {\n  color: black;\n}',
      ]

      for (const step of steps) {
        sourceCss = userCssStore.replaceCssForElementInText(sourceCss, element, step)
      }

      expect((sourceCss.match(/#kc-code p\s*\{/g) || []).length).toBe(1)
      expect(sourceCss).toContain('.other {')
      expect(sourceCss).toContain('#kc-code p {\n  color: black;\n}')
    })

    it('replaces :is() selector blocks instead of appending duplicates', () => {
      const element = getElement('<div class="wrapper"><input class="kcInputClass" id="demo-input"></div>', '#demo-input')
      const sourceCss = `.wrapper :is(input.kcInputClass:focus, textarea.kcInputClass:focus) {
  border-color: red;
}

.other {
  color: blue;
}`
      const nextCss = `.wrapper input.kcInputClass {
  border-color: green;
}`
      const next = userCssStore.replaceCssForElementInText(sourceCss, element, nextCss)

      expect(next).toContain(nextCss)
      expect(next).toContain('.other {')
      expect(next).not.toContain('.wrapper :is(input.kcInputClass:focus, textarea.kcInputClass:focus)')
      expect((next.match(/\.wrapper input\.kcInputClass\s*\{/g) || []).length).toBe(1)
    })

    it('preserves unrelated non-media at-rules', () => {
      const css = `@supports selector(.foo:has(.bar)) {
  .foo {
    border: 1px solid red;
  }
}

#kc-code p {
  color: red;
}`
      const element = getElement('<div id="kc-code"><p id="demo-p">Demo</p></div>', '#demo-p')
      const next = userCssStore.replaceCssForElementInText(css, element, `#kc-code p {
  color: black;
}`)

      expect(next).toContain('@supports selector(.foo:has(.bar)) {')
      expect(next).toContain('.foo {')
      expect(next).toContain('#kc-code p {\n  color: black;\n}')
    })

    it('preserves google fonts @import rules with semicolons inside url', () => {
      const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

#kc-code p {
  color: red;
}`
      const element = getElement('<div id="kc-code"><p id="demo-p">Demo</p></div>', '#demo-p')
      const next = userCssStore.replaceCssForElementInText(css, element, `#kc-code p {
  color: black;
}`)

      expect(next).toContain(`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');`)
      expect(next).not.toContain("wght@300;\n400;500;600;700")
      expect(next).toContain('#kc-code p {\n  color: black;\n}')
    })

    it('does not duplicate light-mode selector edits while dark mode is active', () => {
      const element = getElement('<div id="kc-code"><p id="demo-p">Demo</p></div>', '#demo-p')
      document.body.classList.add('pf-v5-theme-dark')

      try {
        let sourceCss = '#kc-code p {\n  color: black;\n}'
        const steps = [
          'body:not(.pf-v5-theme-dark) #kc-code p {\n  color: b\n}',
          'body:not(.pf-v5-theme-dark) #kc-code p {\n  color: bl\n}',
          'body:not(.pf-v5-theme-dark) #kc-code p {\n  color: bla\n}',
          'body:not(.pf-v5-theme-dark) #kc-code p {\n  color: black;\n}',
          'body:not(.pf-v5-theme-dark) #kc-code p {\n  color: var(--kc-text-primary-dark))\n}',
        ]

        for (const step of steps) {
          sourceCss = userCssStore.replaceCssForElementInText(sourceCss, element, step)
        }

        const occurrences = (sourceCss.match(/body:not\(\.pf-v5-theme-dark\) #kc-code p\s*\{/g) || []).length
        expect(occurrences).toBe(1)
      }
      finally {
        document.body.classList.remove('pf-v5-theme-dark')
      }
    })

    it('does not duplicate html dark-mode selector edits', () => {
      const element = getElement('<div id="kc-code"><p id="demo-p">Demo</p></div>', '#demo-p')
      let sourceCss = '#kc-code p {\n  color: black;\n}'
      const steps = [
        'html.pf-v5-theme-dark #kc-code p {\n  color: b\n}',
        'html.pf-v5-theme-dark #kc-code p {\n  color: bl\n}',
        'html.pf-v5-theme-dark #kc-code p {\n  color: bla\n}',
        'html.pf-v5-theme-dark #kc-code p {\n  color: black;\n}',
      ]

      for (const step of steps) {
        sourceCss = userCssStore.replaceCssForElementInText(sourceCss, element, step)
      }

      const occurrences = (sourceCss.match(/html\.pf-v5-theme-dark #kc-code p\s*\{/g) || []).length
      expect(occurrences).toBe(1)
    })

    it('replaceCssBySelectorInText upserts unrelated selector without removing selected-element rules', () => {
      const sourceCss = `#code {
  color: black;
}

.other {
  color: blue;
}`
      const next = userCssStore.replaceCssBySelectorInText(sourceCss, `.instruction {
  background-color: red !important;
}`)

      expect(next).toContain('#code {')
      expect(next).toContain('.other {')
      expect(next).toContain('.instruction {')
      expect(next).toContain('background-color: red !important;')
    })

    it('prepends a new unmatched selected-element rule when insertion-at-start is requested', () => {
      const element = getElement('<div id="kc-code"><p id="demo-p">Demo</p></div>', '#demo-p')
      const sourceCss = `.other {
  color: blue;
}`
      const next = userCssStore.replaceCssForElementInText(sourceCss, element, `#demo-p {
  color: black;
}`, { insertPositionWhenMissing: 'start' })

      expect(next.startsWith('#demo-p {')).toBe(true)
      expect(next).toContain('.other {')
    })

    it('prepends a new unmatched selector rule when insertion-at-start is requested', () => {
      const sourceCss = `.other {
  color: blue;
}`
      const next = userCssStore.replaceCssBySelectorInText(sourceCss, `.instruction {
  background-color: red !important;
}`, { insertPositionWhenMissing: 'start' })

      expect(next.startsWith('.instruction {')).toBe(true)
      expect(next).toContain('.other {')
    })

    it('ignores selector-only fragments and keeps source css unchanged', () => {
      const element = getElement('<div class="subtitle"><span id="subtitle-text">Demo</span></div>', '#subtitle-text')
      const sourceCss = `.other {
  color: blue;
}`
      const corruptedCss = `.subtitle

.subtitle

.subtitle

.s

.

.subtitle

.subtitle`

      const nextBySelector = userCssStore.replaceCssBySelectorInText(sourceCss, corruptedCss)
      const nextByElement = userCssStore.replaceCssForElementInText(sourceCss, element, corruptedCss)

      expect(nextBySelector).toBe(sourceCss)
      expect(nextByElement).toBe(sourceCss)
    })

    it('rejects malformed selector rules that contain standalone dot tokens', () => {
      const element = getElement('<div class="subtitle"><span id="subtitle-text">Demo</span></div>', '#subtitle-text')
      const sourceCss = `.other {
  color: blue;
}`
      const malformedRule = `.subtitle . {
  color: red;
}`
      const nextBySelector = userCssStore.replaceCssBySelectorInText(sourceCss, malformedRule, { insertPositionWhenMissing: 'start' })
      const nextByElement = userCssStore.replaceCssForElementInText(sourceCss, element, malformedRule, { insertPositionWhenMissing: 'start' })

      expect(nextBySelector).toBe(sourceCss)
      expect(nextByElement).toBe(sourceCss)
    })

    it('detects whether css targets the selected element', () => {
      const element = getElement('<div class="kcInputClass"><input id="code"></div>', '#code')
      expect(userCssStore.doesCssTargetElement('#code { color: red; }', element)).toBe(true)
      expect(userCssStore.doesCssTargetElement('.instruction { color: red; }', element)).toBe(false)
    })
  })
})
