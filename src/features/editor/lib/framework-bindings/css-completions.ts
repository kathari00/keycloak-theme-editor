import type { CssEditorVariable } from '../quickstart-variable-registry'
import type { FrameworkBinding } from './types'
import { parse, walk } from 'css-tree'

export interface FrameworkCssCompletions {
  identifiers: string[]
  variables: CssEditorVariable[]
}

/** Read the selected framework's actual vocabulary, including Bootswatch additions. */
export function getFrameworkCssCompletions(binding: FrameworkBinding): FrameworkCssCompletions {
  if (binding.id === 'native')
    return { identifiers: [], variables: [] }

  const identifiers = new Set<string>()
  const variables = new Set<string>()
  walk(parse(binding.frameworkCss, { parseValue: false }), (node) => {
    if (node.type === 'ClassSelector')
      identifiers.add(`.${node.name}`)
    if (node.type === 'Declaration' && binding.cssVariablePrefix && node.property.startsWith(binding.cssVariablePrefix))
      variables.add(node.property)
  })
  return {
    identifiers: [...identifiers].sort(),
    variables: [...variables].sort().map(name => ({ name, detail: `${binding.label} variable` })),
  }
}
