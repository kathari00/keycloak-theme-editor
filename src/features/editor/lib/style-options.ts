import type { FrameworkId } from './framework-bindings/types'
import { FRAMEWORK_BINDINGS } from './framework-bindings/metadata'

export type StyleOptionId = 'base' | 'v2' | 'custom' | Exclude<FrameworkId, 'native'>

/** A framework isn't a theme of its own - it's a CSS overlay backed by `base`'s plain markup. */
const FRAMEWORK_STYLE_OPTIONS = FRAMEWORK_BINDINGS
  .filter(binding => binding.id !== 'native')
  .map(binding => ({ id: binding.id as Exclude<FrameworkId, 'native'>, label: binding.label }))

export const STYLE_OPTIONS: { id: StyleOptionId, label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'v2', label: 'v2' },
  { id: 'custom', label: 'Custom' },
  ...FRAMEWORK_STYLE_OPTIONS,
]

function frameworkStyleOptionId(styleOptionId: string): Exclude<FrameworkId, 'native'> | undefined {
  return FRAMEWORK_STYLE_OPTIONS.find(option => option.id === styleOptionId)?.id
}

export function styleOptionThemeId(styleOptionId: StyleOptionId): string {
  return frameworkStyleOptionId(styleOptionId) ? 'base' : styleOptionId
}

export function styleOptionFrameworkId(styleOptionId: StyleOptionId): FrameworkId {
  return frameworkStyleOptionId(styleOptionId) ?? 'native'
}

/**
 * Derives the "Style" dropdown's value from the two store fields it actually maps to
 * (`selectedThemeId` + the resolved `frameworkId`), since a framework isn't its own themeId.
 * Checking `frameworkId` first also covers a theme other than `base` having a framework set
 * (e.g. from before this merge), rather than only recognizing the current fixed backing.
 */
export function deriveStyleOptionId(selectedThemeId: string, frameworkId: FrameworkId): StyleOptionId {
  const frameworkOption = frameworkStyleOptionId(frameworkId)
  if (frameworkOption) {
    return frameworkOption
  }
  if (selectedThemeId === 'v2') {
    return 'v2'
  }
  if (selectedThemeId === 'custom') {
    return 'custom'
  }
  return 'base'
}
