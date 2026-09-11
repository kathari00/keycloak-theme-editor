import type { FrameworkId } from './framework-bindings/types'

export type StyleOptionId = 'base' | 'v2' | 'custom' | 'bootstrap' | 'carbon'

export const STYLE_OPTIONS: { id: StyleOptionId, label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'v2', label: 'v2' },
  { id: 'custom', label: 'Custom' },
  { id: 'bootstrap', label: 'Bootstrap' },
  { id: 'carbon', label: 'Carbon' },
]

/** Bootstrap isn't a theme of its own - it's a CSS overlay backed by `base`'s plain markup. */
const STYLE_OPTION_THEME_ID: Record<StyleOptionId, string> = {
  base: 'base',
  v2: 'v2',
  custom: 'custom',
  bootstrap: 'base',
  carbon: 'base',
}

export function styleOptionThemeId(styleOptionId: StyleOptionId): string {
  return STYLE_OPTION_THEME_ID[styleOptionId]
}

export function styleOptionFrameworkId(styleOptionId: StyleOptionId): FrameworkId {
  return styleOptionId === 'bootstrap' || styleOptionId === 'carbon' ? styleOptionId : 'native'
}

/**
 * Derives the "Style" dropdown's value from the two store fields it actually maps to
 * (`selectedThemeId` + the resolved `frameworkId`), since Bootstrap isn't its own themeId.
 * Checking `frameworkId` first also covers a theme other than `base` having `bootstrap` set
 * (e.g. from before this merge), rather than only recognizing the current fixed backing.
 */
export function deriveStyleOptionId(selectedThemeId: string, frameworkId: FrameworkId): StyleOptionId {
  if (frameworkId === 'bootstrap' || frameworkId === 'carbon') {
    return frameworkId
  }
  if (selectedThemeId === 'v2') {
    return 'v2'
  }
  if (selectedThemeId === 'custom') {
    return 'custom'
  }
  return 'base'
}
