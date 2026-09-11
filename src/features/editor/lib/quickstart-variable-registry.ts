export interface CssEditorVariable {
  name: string
  detail: string
  isColor?: boolean
}

export type QuickStartVariableCategory = 'color' | 'typography' | 'shape' | 'asset'

interface QuickStartVariableDefinition extends CssEditorVariable {
  category: QuickStartVariableCategory
  includeInGeneratedRoot: boolean
}

/**
 * Quick-start CSS custom properties, grouped by design-token category. This is the shared
 * vocabulary consumed by CSS generation (`quick-start-css.ts`), the CodeMirror autocomplete/color
 * swatch integration (`codemirror-config.ts`), and — going forward — the framework-binding layer,
 * which maps these same categories onto a chosen 3rd-party framework's own variables.
 */
const QUICK_START_VARIABLE_GROUPS: Record<QuickStartVariableCategory, QuickStartVariableDefinition[]> = {
  color: [
    { name: '--quickstart-primary-color', category: 'color', detail: 'Quick Start var', includeInGeneratedRoot: true, isColor: true },
    { name: '--quickstart-primary-color-light', category: 'color', detail: 'Quick Start var (light mode)', includeInGeneratedRoot: false, isColor: true },
    { name: '--quickstart-primary-color-dark', category: 'color', detail: 'Quick Start var (dark mode)', includeInGeneratedRoot: false, isColor: true },
    { name: '--quickstart-secondary-color', category: 'color', detail: 'Quick Start var', includeInGeneratedRoot: true, isColor: true },
    { name: '--quickstart-secondary-color-light', category: 'color', detail: 'Quick Start var (light mode)', includeInGeneratedRoot: false, isColor: true },
    { name: '--quickstart-secondary-color-dark', category: 'color', detail: 'Quick Start var (dark mode)', includeInGeneratedRoot: false, isColor: true },
    { name: '--quickstart-bg-color', category: 'color', detail: 'Quick Start var', includeInGeneratedRoot: true, isColor: true },
    { name: '--quickstart-bg-color-light', category: 'color', detail: 'Quick Start var (light mode)', includeInGeneratedRoot: false, isColor: true },
    { name: '--quickstart-bg-color-dark', category: 'color', detail: 'Quick Start var (dark mode)', includeInGeneratedRoot: false, isColor: true },
    { name: '--quickstart-text-primary-light', category: 'color', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true, isColor: true },
    { name: '--quickstart-text-primary-dark', category: 'color', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true, isColor: true },
    { name: '--quickstart-text-secondary-light', category: 'color', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true, isColor: true },
    { name: '--quickstart-text-secondary-dark', category: 'color', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true, isColor: true },
  ],
  typography: [
    { name: '--quickstart-font-family', category: 'typography', detail: 'Quick Start var', includeInGeneratedRoot: true },
    { name: '--quickstart-heading-font-family', category: 'typography', detail: 'Quick Start var', includeInGeneratedRoot: true },
  ],
  shape: [
    { name: '--quickstart-border-radius', category: 'shape', detail: 'Quick Start var', includeInGeneratedRoot: true },
    { name: '--quickstart-card-shadow', category: 'shape', detail: 'Quick Start var', includeInGeneratedRoot: true },
  ],
  asset: [
    { name: '--quickstart-bg-image', category: 'asset', detail: 'Quick Start var', includeInGeneratedRoot: true },
    { name: '--quickstart-logo-url', category: 'asset', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
    { name: '--quickstart-bg-logo-url', category: 'asset', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
    { name: '--keycloak-bg-logo-url', category: 'asset', detail: 'Keycloak v2 background token', includeInGeneratedRoot: true },
    { name: '--quickstart-logo-height', category: 'asset', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
    { name: '--quickstart-logo-width', category: 'asset', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
  ],
}

const QUICK_START_VARIABLE_DEFINITIONS: QuickStartVariableDefinition[] = [
  ...QUICK_START_VARIABLE_GROUPS.color,
  ...QUICK_START_VARIABLE_GROUPS.typography,
  ...QUICK_START_VARIABLE_GROUPS.shape,
  ...QUICK_START_VARIABLE_GROUPS.asset,
]

export const QUICK_START_EDITOR_CSS_VARIABLES: CssEditorVariable[] = QUICK_START_VARIABLE_DEFINITIONS.map(
  ({ name, detail, isColor }) => ({ name, detail, isColor }),
)

export const QUICK_START_GENERATED_ROOT_VARIABLE_NAMES = QUICK_START_VARIABLE_DEFINITIONS
  .filter(definition => definition.includeInGeneratedRoot)
  .map(definition => definition.name)

export function getQuickStartVariableNamesByCategory(category: QuickStartVariableCategory): string[] {
  return QUICK_START_VARIABLE_GROUPS[category].map(definition => definition.name)
}
