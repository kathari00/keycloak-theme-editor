import type { FrameworkBinding } from './types'
import { FRAMEWORK_BINDINGS } from './metadata'

/** Point the framework's own light/dark palette at the mode the editor is previewing. */
export function applyFrameworkColorScheme(root: Element, binding: FrameworkBinding, isDarkMode: boolean): void {
  for (const other of FRAMEWORK_BINDINGS) {
    if (other.colorSchemeAttribute && other.id !== binding.id)
      root.removeAttribute(other.colorSchemeAttribute.name)
  }
  const attribute = binding.colorSchemeAttribute
  if (attribute)
    root.setAttribute(attribute.name, isDarkMode ? attribute.dark : attribute.light)
}

/** The same switch as a statement for the exported theme's color-mode script. */
export function frameworkColorSchemeScriptLine(binding: FrameworkBinding): string {
  const attribute = binding.colorSchemeAttribute
  if (!attribute)
    return ''
  return `document.documentElement.setAttribute('${attribute.name}', media.matches ? '${attribute.dark}' : '${attribute.light}');`
}
