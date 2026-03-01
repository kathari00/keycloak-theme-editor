import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import type { EditorState, Extension } from '@codemirror/state'
import type { KeyBinding } from '@codemirror/view'
import type { CssEditorVariable } from './quickstart-variable-registry'
import { autocompletion } from '@codemirror/autocomplete'
import { css } from '@codemirror/lang-css'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Prec } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { GOOGLE_FONTS } from '../assets/google-fonts'
import { QUICK_START_EDITOR_CSS_VARIABLES } from './quickstart-variable-registry'

// CSS properties with descriptions for autocomplete
const cssProperties = [
  { label: 'display', type: 'keyword', info: 'Sets how an element is displayed' },
  { label: 'position', type: 'keyword', info: 'Specifies positioning method' },
  { label: 'color', type: 'keyword', info: 'Sets text color' },
  { label: 'background', type: 'keyword', info: 'Sets background properties' },
  { label: 'background-color', type: 'keyword', info: 'Sets background color' },
  { label: 'background-image', type: 'keyword', info: 'Sets background image' },
  { label: 'background-size', type: 'keyword', info: 'Sets background image size' },
  { label: 'border', type: 'keyword', info: 'Sets border properties' },
  { label: 'border-radius', type: 'keyword', info: 'Rounds corners' },
  { label: 'border-color', type: 'keyword', info: 'Sets border color' },
  { label: 'border-width', type: 'keyword', info: 'Sets border width' },
  { label: 'border-style', type: 'keyword', info: 'Sets border style' },
  { label: 'padding', type: 'keyword', info: 'Sets internal spacing' },
  { label: 'padding-top', type: 'keyword', info: 'Sets top padding' },
  { label: 'padding-right', type: 'keyword', info: 'Sets right padding' },
  { label: 'padding-bottom', type: 'keyword', info: 'Sets bottom padding' },
  { label: 'padding-left', type: 'keyword', info: 'Sets left padding' },
  { label: 'margin', type: 'keyword', info: 'Sets external spacing' },
  { label: 'margin-top', type: 'keyword', info: 'Sets top margin' },
  { label: 'margin-right', type: 'keyword', info: 'Sets right margin' },
  { label: 'margin-bottom', type: 'keyword', info: 'Sets bottom margin' },
  { label: 'margin-left', type: 'keyword', info: 'Sets left margin' },
  { label: 'font-family', type: 'keyword', info: 'Sets font face' },
  { label: 'font-size', type: 'keyword', info: 'Sets text size' },
  { label: 'font-weight', type: 'keyword', info: 'Sets text weight' },
  { label: 'font-style', type: 'keyword', info: 'Sets text style' },
  { label: 'text-align', type: 'keyword', info: 'Aligns text' },
  { label: 'text-decoration', type: 'keyword', info: 'Sets text decoration' },
  { label: 'text-transform', type: 'keyword', info: 'Transforms text case' },
  { label: 'line-height', type: 'keyword', info: 'Sets line height' },
  { label: 'letter-spacing', type: 'keyword', info: 'Sets letter spacing' },
  { label: 'width', type: 'keyword', info: 'Sets element width' },
  { label: 'height', type: 'keyword', info: 'Sets element height' },
  { label: 'min-width', type: 'keyword', info: 'Sets minimum width' },
  { label: 'min-height', type: 'keyword', info: 'Sets minimum height' },
  { label: 'max-width', type: 'keyword', info: 'Sets maximum width' },
  { label: 'max-height', type: 'keyword', info: 'Sets maximum height' },
  { label: 'flex', type: 'keyword', info: 'Flexbox shorthand' },
  { label: 'flex-direction', type: 'keyword', info: 'Sets flex direction' },
  { label: 'flex-wrap', type: 'keyword', info: 'Sets flex wrapping' },
  { label: 'justify-content', type: 'keyword', info: 'Aligns flex items horizontally' },
  { label: 'align-items', type: 'keyword', info: 'Aligns flex items vertically' },
  { label: 'align-content', type: 'keyword', info: 'Aligns flex lines' },
  { label: 'gap', type: 'keyword', info: 'Sets gap between flex/grid items' },
  { label: 'grid', type: 'keyword', info: 'Grid shorthand' },
  { label: 'grid-template-columns', type: 'keyword', info: 'Defines grid columns' },
  { label: 'grid-template-rows', type: 'keyword', info: 'Defines grid rows' },
  { label: 'grid-gap', type: 'keyword', info: 'Sets grid gap' },
  { label: 'opacity', type: 'keyword', info: 'Sets element opacity' },
  { label: 'visibility', type: 'keyword', info: 'Sets element visibility' },
  { label: 'overflow', type: 'keyword', info: 'Sets overflow behavior' },
  { label: 'overflow-x', type: 'keyword', info: 'Sets horizontal overflow' },
  { label: 'overflow-y', type: 'keyword', info: 'Sets vertical overflow' },
  { label: 'z-index', type: 'keyword', info: 'Sets stacking order' },
  { label: 'cursor', type: 'keyword', info: 'Sets cursor style' },
  { label: 'transition', type: 'keyword', info: 'Sets transition properties' },
  { label: 'transform', type: 'keyword', info: 'Applies transformations' },
  { label: 'box-shadow', type: 'keyword', info: 'Adds box shadow' },
  { label: 'text-shadow', type: 'keyword', info: 'Adds text shadow' },
]

// Common CSS values mapped by property
const commonValues: Record<string, string[]> = {
  'display': ['block', 'inline', 'inline-block', 'flex', 'grid', 'none'],
  'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  'text-align': ['left', 'center', 'right', 'justify'],
  'font-weight': ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
  'font-style': ['normal', 'italic', 'oblique'],
  'text-decoration': ['none', 'underline', 'overline', 'line-through'],
  'text-transform': ['none', 'capitalize', 'uppercase', 'lowercase'],
  'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
  'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
  'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
  'align-items': ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'],
  'align-content': ['stretch', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around'],
  'visibility': ['visible', 'hidden', 'collapse'],
  'overflow': ['visible', 'hidden', 'scroll', 'auto'],
  'overflow-x': ['visible', 'hidden', 'scroll', 'auto'],
  'overflow-y': ['visible', 'hidden', 'scroll', 'auto'],
  'cursor': ['auto', 'default', 'pointer', 'move', 'text', 'wait', 'help', 'not-allowed'],
  'border-style': ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'],
  'background-size': ['auto', 'cover', 'contain'],
}

const THEME_CSS_VARS: CssEditorVariable[] = [
  { name: '--keycloak-logo-url', detail: 'Theme var' },
  { name: '--keycloak-bg-logo-url', detail: 'Theme var' },
  { name: '--keycloak-logo-height', detail: 'Theme var' },
  { name: '--keycloak-logo-width', detail: 'Theme var' },
]

const CSS_EDITOR_CSS_VARS = [...QUICK_START_EDITOR_CSS_VARIABLES, ...THEME_CSS_VARS]

export const COLOR_CSS_VARIABLE_NAMES = CSS_EDITOR_CSS_VARS
  .filter(v => v.isColor)
  .map(v => v.name)

const SELECTOR_SNIPPETS: Array<{ label: string, apply: string, info: string }> = [
  {
    label: 'dark-mode only',
    apply: 'html.pf-v5-theme-dark ',
    info: 'Scope rule to dark mode only',
  },
  {
    label: 'light-mode only',
    apply: 'html:not(.pf-v5-theme-dark) ',
    info: 'Scope rule to light mode only',
  },
]

type CssAutocompleteScope = 'selector' | 'property' | 'value'
interface CompletionWordRange {
  from: number
  to: number
}

interface CssEditorCustomHistory {
  undo?: () => void
  redo?: () => void
}

const NESTED_SELECTOR_AT_RULES = new Set([
  '@media',
  '@supports',
  '@container',
  '@layer',
  '@scope',
])

function getCssAutocompleteScope(context: CompletionContext): CssAutocompleteScope {
  const before = context.state.doc.sliceString(0, context.pos)
  const lastOpenBrace = before.lastIndexOf('{')
  const lastCloseBrace = before.lastIndexOf('}')

  if (lastOpenBrace <= lastCloseBrace) {
    return 'selector'
  }

  const declarationStart = Math.max(before.lastIndexOf(';'), lastOpenBrace)
  const declarationText = before.slice(declarationStart + 1)

  if (declarationText.includes(':')) {
    return 'value'
  }

  const beforeOpenBrace = before.slice(0, lastOpenBrace)
  const preludeStart = Math.max(
    beforeOpenBrace.lastIndexOf('{'),
    beforeOpenBrace.lastIndexOf('}'),
    beforeOpenBrace.lastIndexOf(';'),
  )
  const blockPrelude = beforeOpenBrace.slice(preludeStart + 1).trim()
  const atRule = blockPrelude.split(/\s+/)[0]

  if (NESTED_SELECTOR_AT_RULES.has(atRule)) {
    return 'selector'
  }

  return 'property'
}

function getWordOrCursor(context: CompletionContext, pattern: RegExp): CompletionWordRange {
  const word = context.matchBefore(pattern)
  return word ?? { from: context.pos, to: context.pos }
}

function buildSelectorCompletions(availableIdentifiers: string[], uniqueSelector: string | null) {
  const uniqueSelectorOptions: Completion[] = uniqueSelector && uniqueSelector.trim()
    ? [{
        label: uniqueSelector.trim(),
        apply: uniqueSelector.trim(),
        type: 'keyword',
        detail: 'Selected element (unique selector)',
        boost: 320,
      }]
    : []

  const identifierOptions: Completion[] = availableIdentifiers.map((identifier) => {
    const isId = identifier.startsWith('#')
    const isClass = identifier.startsWith('.')
    return {
      label: identifier,
      type: isId ? 'property' : isClass ? 'class' : 'type',
      detail: isId ? 'Available id' : isClass ? 'Available class' : 'Element type',
      boost: 220,
    }
  })

  const selectorSnippetOptions: Completion[] = SELECTOR_SNIPPETS.map(snippet => ({
    label: snippet.label,
    apply: snippet.apply,
    type: 'keyword',
    info: snippet.info,
    detail: 'Selector helper',
    boost: 120,
  }))

  return function selectorCompletions(context: CompletionContext): CompletionResult | null {
    if (getCssAutocompleteScope(context) !== 'selector') {
      return null
    }

    const word = getWordOrCursor(context, /[^\s,{;]*/)
    // Only auto-show when user has typed a prefix; Ctrl+Space or startCompletion() sets explicit
    if (word.from === word.to && !context.explicit) {
      return null
    }
    const options = [...uniqueSelectorOptions, ...identifierOptions, ...selectorSnippetOptions]
    if (options.length === 0) {
      return null
    }

    return {
      from: word.from,
      options,
      validFor: /^[^\s,{;]*$/,
    }
  }
}

// Custom CSS property autocomplete
function cssPropertyCompletions(context: CompletionContext): CompletionResult | null {
  if (getCssAutocompleteScope(context) !== 'property')
    return null

  const word = getWordOrCursor(context, /[\w-]*/)
  if (word.from === word.to && !context.explicit)
    return null

  return {
    from: word.from,
    options: cssProperties,
    validFor: /^[\w-]*$/,
  }
}

// Custom CSS value autocomplete
function cssValueCompletions(context: CompletionContext): CompletionResult | null {
  if (getCssAutocompleteScope(context) !== 'value')
    return null

  // Detect which property we're completing values for
  const before = context.state.doc.sliceString(0, context.pos)
  const propertyMatch = before.match(/([\w-]+)\s*:\s*[\w-]*$/)

  if (!propertyMatch)
    return null

  const property = propertyMatch[1]
  const values = commonValues[property]

  if (!values)
    return null

  const word = context.matchBefore(/[\w-]*/)
  if (!word)
    return null

  return {
    from: word.from,
    options: values.map(v => ({ label: v, type: 'keyword' })),
    validFor: /^[\w-]*$/,
  }
}

// Dark theme syntax highlighting (VSCode-like)
const darkThemeHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#569cd6' },
  { tag: tags.propertyName, color: '#9cdcfe' },
  { tag: tags.string, color: '#ce9178' },
  { tag: tags.number, color: '#b5cea8' },
  { tag: tags.color, color: '#ce9178' },
  { tag: tags.unit, color: '#b5cea8' },
  { tag: tags.className, color: '#4ec9b0' },
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.tagName, color: '#4ec9b0' },
  { tag: tags.operator, color: '#d4d4d4' },
  { tag: tags.punctuation, color: '#d4d4d4' },
])

// Light theme syntax highlighting
const lightThemeHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#0000ff' },
  { tag: tags.propertyName, color: '#001080' },
  { tag: tags.string, color: '#a31515' },
  { tag: tags.number, color: '#098658' },
  { tag: tags.color, color: '#a31515' },
  { tag: tags.unit, color: '#098658' },
  { tag: tags.className, color: '#267f99' },
  { tag: tags.comment, color: '#008000', fontStyle: 'italic' },
  { tag: tags.tagName, color: '#800000' },
  { tag: tags.operator, color: '#000000' },
  { tag: tags.punctuation, color: '#000000' },
])

// Font family completions: Google fonts + system fonts + uploaded custom fonts
function buildFontFamilyCompletions(customFontFamilies: string[]) {
  const googleOptions = GOOGLE_FONTS.map(f => ({
    label: f.family,
    apply: `'${f.family}', sans-serif`,
    type: 'variable' as const,
    info: 'Google Font',
  }))

  const systemOptions = [
    { label: 'sans-serif', apply: 'sans-serif', type: 'keyword' as const, info: 'Generic sans-serif' },
    { label: 'serif', apply: 'serif', type: 'keyword' as const, info: 'Generic serif' },
    { label: 'monospace', apply: 'monospace', type: 'keyword' as const, info: 'Generic monospace' },
    { label: 'system-ui', apply: 'system-ui, sans-serif', type: 'keyword' as const, info: 'System UI font' },
    { label: 'inherit', apply: 'inherit', type: 'keyword' as const, info: 'Inherit from parent' },
  ]

  return function fontFamilyCompletions(context: CompletionContext): CompletionResult | null {
    const before = context.state.doc.sliceString(0, context.pos)
    // Only activate when inside a font-family value
    if (!/font-family\s*:\s*['"]?[\w-]*$/.test(before))
      return null

    const word = context.matchBefore(/[\w-]*/)
    if (!word || (word.from === word.to && !context.explicit))
      return null

    const customOptions = customFontFamilies.map(f => ({
      label: f,
      apply: `'${f}', sans-serif`,
      type: 'variable' as const,
      info: 'Uploaded Font',
    }))

    return {
      from: word.from,
      options: [...customOptions, ...googleOptions, ...systemOptions],
      validFor: /^[\w-]*$/,
    }
  }
}

function buildCssVariableCompletions(cssVars: CssEditorVariable[]) {
  return function cssVariableCompletions(context: CompletionContext): CompletionResult | null {
    if (getCssAutocompleteScope(context) !== 'value') {
      return null
    }

    const varToken = context.matchBefore(/var\(\s*--[\w-]*/)
    if (varToken) {
      const replaceFrom = varToken.from
      const options: Completion[] = cssVars.map((cssVar) => {
        const insertText = `var(${cssVar.name})`
        return {
          label: cssVar.name,
          apply: (view: EditorView, _c: Completion, _from: number, to: number) => {
            view.dispatch({
              changes: { from: replaceFrom, to, insert: insertText },
              selection: { anchor: replaceFrom + insertText.length },
            })
          },
          type: 'variable',
          detail: cssVar.detail,
          boost: 170,
        }
      })
      return { from: context.pos, options }
    }

    const word = context.matchBefore(/--[\w-]*/)
    if (!word || (word.from === word.to && !context.explicit)) {
      return null
    }

    return {
      from: word.from,
      options: cssVars.map(cssVar => ({
        label: cssVar.name,
        type: 'variable',
        detail: cssVar.detail,
        boost: 170,
      })),
      validFor: /^--[\w-]*$/,
    }
  }
}

const COLOR_PROPERTIES = new Set([
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'accent-color',
  'fill',
  'stroke',
  'column-rule-color',
  'flood-color',
  'lighting-color',
  'stop-color',
])

// Map from variable name to resolved color value, used for swatch rendering
let colorSwatchMap: Map<string, string> = new Map()

function buildColorVariableCompletions(colorVars: CssEditorVariable[], colorValues: Map<string, string>) {
  colorSwatchMap = colorValues

  return function colorVariableCompletions(context: CompletionContext): CompletionResult | null {
    if (getCssAutocompleteScope(context) !== 'value') {
      return null
    }

    const before = context.state.doc.sliceString(0, context.pos)
    const propertyMatch = before.match(/([\w-]+)\s*:[^;{}]*$/)
    if (!propertyMatch || !COLOR_PROPERTIES.has(propertyMatch[1])) {
      return null
    }

    // Don't activate if already inside var() or -- prefix (handled by buildCssVariableCompletions)
    if (context.matchBefore(/var\(\s*--[\w-]*/)) {
      return null
    }

    const word = context.matchBefore(/[\w(-]*/)
    const from = word ? word.from : context.pos

    const options: Completion[] = colorVars.map((cssVar) => {
      const insertText = `var(${cssVar.name})`
      return {
        label: `var(${cssVar.name})`,
        displayLabel: cssVar.name,
        type: 'variable',
        detail: cssVar.detail,
        boost: 200,
        apply: (view: EditorView, _c: Completion, _from: number, to: number) => {
          view.dispatch({
            changes: { from, to, insert: insertText },
            selection: { anchor: from + insertText.length },
          })
        },
      }
    })

    return { from: context.pos, options }
  }
}

function renderColorSwatch(completion: Completion, _state: EditorState, _view: EditorView): HTMLElement | null {
  const varNameMatch = completion.label.match(/var\((--[\w-]+)\)/)
  const varName = varNameMatch ? varNameMatch[1] : completion.label
  const colorValue = colorSwatchMap.get(varName)
  if (!colorValue) {
    return null
  }

  const swatch = document.createElement('span')
  swatch.style.display = 'inline-block'
  swatch.style.width = '12px'
  swatch.style.height = '12px'
  swatch.style.borderRadius = '2px'
  swatch.style.border = '1px solid rgba(128, 128, 128, 0.4)'
  swatch.style.backgroundColor = colorValue
  swatch.style.marginRight = '4px'
  swatch.style.verticalAlign = 'middle'
  swatch.style.flexShrink = '0'
  return swatch
}

// Image URL completions for uploaded assets (var-only, no inline data URL suggestions)
function buildImageCompletions(uploadedImages: Array<{ name: string, dataUrl: string, category: string, cssVar?: string }>) {
  const IMAGE_PROPS_REGEX
    = /\b(?:background-image|background|mask-image|mask|-webkit-mask-image|list-style-image|content)\s*:[^;{}]*$/

  return function imageCompletions(context: CompletionContext): CompletionResult | null {
    const variableImages = uploadedImages.filter(img => Boolean(img.cssVar))
    if (variableImages.length === 0)
      return null

    const before = context.state.doc.sliceString(0, context.pos)
    if (!IMAGE_PROPS_REGEX.test(before))
      return null

    // Case 0: typing var(...) -> replace the entire token.
    const varToken = context.matchBefore(/var\(\s*--[\w-]*/)
    if (varToken) {
      const replaceFrom = varToken.from
      const options: Completion[] = variableImages.map((img) => {
        const insertText = `var(${img.cssVar})`
        return {
          label: img.name,
          apply: (view: EditorView, _c: Completion, _from: number, to: number) => {
            view.dispatch({
              changes: { from: replaceFrom, to, insert: insertText },
              selection: { anchor: replaceFrom + insertText.length },
            })
          },
          type: 'variable',
          detail: `${img.category} • var`,
          boost: 180,
        }
      })
      return { from: context.pos, options }
    }

    // Case 1: typing url(...) -> replace the entire token with a variable.
    // We must use from:context.pos so CodeMirror does NOT filter completions against
    // "url(" (which matches no variable prefix). The apply function does replacement.
    const urlToken = context.matchBefore(/url\(['"]?[^'")\n]*/)
    if (urlToken) {
      const replaceFrom = urlToken.from
      const options: Completion[] = variableImages.map((img) => {
        const insertText = `var(${img.cssVar})`
        return {
          label: img.name,
          apply: (view: EditorView, _c: Completion, _from: number, to: number) => {
            view.dispatch({
              changes: { from: replaceFrom, to, insert: insertText },
              selection: { anchor: replaceFrom + insertText.length },
            })
          },
          type: 'variable',
          detail: `${img.category} • var`,
          boost: 180,
        }
      })
      // from:context.pos = no typed prefix -> all completions shown, none filtered out
      return { from: context.pos, options }
    }

    // Case 2: typing a variable prefix (e.g. --uploaded-img...) or explicit Ctrl+Space.
    const word = context.matchBefore(/[\w.-]*/)
    if (!word || (word.from === word.to && !context.explicit))
      return null

    const options: Completion[] = variableImages.map(img => ({
      label: img.name,
      apply: `var(${img.cssVar})`,
      type: 'variable',
      detail: `${img.category} • var`,
      boost: 180,
    }))
    return { from: word.from, options }
  }
}
/**
 * Create CodeMirror extensions for CSS editing
 * @param isDarkMode - Whether to apply dark theme
 * @param customFontFamilies - Uploaded font family names to include in autocomplete
 * @param uploadedImages - Uploaded image assets to include in url() autocomplete
 * @param availableIdentifiers - Available id/class identifiers from the current preview
 * @param uniqueSelector - Unique selector for currently selected element
 * @param customHistory - Custom undo/redo handlers
 * @param colorValues - Map of CSS variable name to resolved color value for swatch rendering
 */
export function createCssEditorExtensions(
  isDarkMode: boolean,
  customFontFamilies: string[] = [],
  uploadedImages: Array<{ name: string, dataUrl: string, category: string, cssVar?: string }> = [],
  availableIdentifiers: string[] = [],
  uniqueSelector: string | null = null,
  customHistory?: CssEditorCustomHistory,
  colorValues: Map<string, string> = new Map(),
): Extension[] {
  const customHistoryKeymap: KeyBinding[] = []
  if (customHistory?.undo) {
    customHistoryKeymap.push({
      key: 'Mod-z',
      run: () => {
        customHistory.undo?.()
        return true
      },
    })
  }
  if (customHistory?.redo) {
    customHistoryKeymap.push(
      {
        key: 'Mod-Shift-z',
        run: () => {
          customHistory.redo?.()
          return true
        },
      },
      {
        key: 'Mod-y',
        run: () => {
          customHistory.redo?.()
          return true
        },
      },
    )
  }

  const extensions: Extension[] = [
    css(),
    autocompletion({
      activateOnTyping: true,
      override: [
        buildSelectorCompletions(availableIdentifiers, uniqueSelector),
        cssPropertyCompletions,
        cssValueCompletions,
        buildCssVariableCompletions(CSS_EDITOR_CSS_VARS),
        buildColorVariableCompletions(
          CSS_EDITOR_CSS_VARS.filter(v => v.isColor),
          colorValues,
        ),
        buildFontFamilyCompletions(customFontFamilies),
        buildImageCompletions(uploadedImages),
      ],
      addToOptions: [
        {
          render: renderColorSwatch,
          position: 20,
        },
      ],
    }),
  ]

  if (customHistoryKeymap.length > 0) {
    extensions.push(Prec.highest(keymap.of(customHistoryKeymap)))
  }

  extensions.push(...buildThemeExtensions(isDarkMode))

  return extensions
}

function buildThemeExtensions(isDarkMode: boolean): Extension[] {
  if (isDarkMode) {
    return [
      syntaxHighlighting(darkThemeHighlight),
      EditorView.theme(
        {
          '&': {
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            fontSize: '13px',
            fontFamily: '\'JetBrains Mono\', \'Fira Code\', \'Consolas\', \'Monaco\', monospace',
          },
          '.cm-scroller': {
            backgroundColor: '#1e1e1e',
          },
          '.cm-content': {
            caretColor: '#ffffff',
            padding: '12px',
          },
          '.cm-gutters': {
            backgroundColor: '#1e1e1e',
            color: '#858585',
            borderRight: '1px solid #3e3e3e',
          },
          '.cm-activeLineGutter': {
            backgroundColor: '#2a2d2e',
            color: '#c6c6c6',
          },
          '.cm-activeLine': {
            backgroundColor: '#2a2d2e40',
          },
          '.cm-selectionBackground': {
            backgroundColor: '#264f78 !important',
          },
          '&.cm-focused .cm-selectionBackground': {
            backgroundColor: '#3a6da8 !important',
          },
          '.cm-cursor': {
            borderLeftColor: '#ffffff',
          },
        },
        { dark: true },
      ),
    ]
  }

  return [
    syntaxHighlighting(lightThemeHighlight),
    EditorView.theme(
      {
        '&': {
          backgroundColor: '#ffffff',
          color: '#000000',
          fontSize: '13px',
          fontFamily: '\'JetBrains Mono\', \'Fira Code\', \'Consolas\', \'Monaco\', monospace',
        },
        '.cm-scroller': {
          backgroundColor: '#ffffff',
        },
        '.cm-content': {
          caretColor: '#000000',
          padding: '12px',
        },
        '.cm-gutters': {
          backgroundColor: '#f5f5f5',
          color: '#237893',
          borderRight: '1px solid #e0e0e0',
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#e8e8e8',
          color: '#0b216f',
        },
        '.cm-activeLine': {
          backgroundColor: '#f0f0f0',
        },
        '.cm-selectionBackground': {
          backgroundColor: '#add6ff !important',
        },
        '&.cm-focused .cm-selectionBackground': {
          backgroundColor: '#79c0ff !important',
        },
        '.cm-cursor': {
          borderLeftColor: '#000000',
        },
      },
      { dark: false },
    ),
  ]
}

