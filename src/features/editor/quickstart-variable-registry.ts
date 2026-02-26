export interface CssEditorVariable {
  name: string
  detail: string
}

interface QuickStartVariableDefinition extends CssEditorVariable {
  includeInGeneratedRoot: boolean
}

const QUICK_START_VARIABLE_DEFINITIONS: QuickStartVariableDefinition[] = [
  { name: '--quickstart-primary-color', detail: 'Quick Start var', includeInGeneratedRoot: true },
  { name: '--quickstart-secondary-color', detail: 'Quick Start var', includeInGeneratedRoot: true },
  { name: '--quickstart-font-family', detail: 'Quick Start var', includeInGeneratedRoot: true },
  { name: '--quickstart-heading-font-family', detail: 'Quick Start var', includeInGeneratedRoot: true },
  { name: '--quickstart-bg-color', detail: 'Quick Start var', includeInGeneratedRoot: true },
  { name: '--quickstart-bg-image', detail: 'Quick Start var', includeInGeneratedRoot: true },
  { name: '--quickstart-logo-url', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
  { name: '--quickstart-bg-logo-url', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
  { name: '--quickstart-logo-height', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
  { name: '--quickstart-logo-width', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
  { name: '--quickstart-text-primary-light', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
  { name: '--quickstart-text-primary-dark', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
  { name: '--quickstart-text-secondary-light', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
  { name: '--quickstart-text-secondary-dark', detail: 'Quick Start var (theme token)', includeInGeneratedRoot: true },
  { name: '--quickstart-border-radius', detail: 'Quick Start var', includeInGeneratedRoot: true },
  { name: '--quickstart-card-shadow', detail: 'Quick Start var', includeInGeneratedRoot: true },
  { name: '--quickstart-surface-color', detail: 'Quick Start var (advanced)', includeInGeneratedRoot: false },
  { name: '--quickstart-text-color', detail: 'Quick Start var (advanced)', includeInGeneratedRoot: false },
  { name: '--quickstart-muted-text-color', detail: 'Quick Start var (advanced)', includeInGeneratedRoot: false },
  { name: '--quickstart-input-border-color', detail: 'Quick Start var (advanced)', includeInGeneratedRoot: false },
  { name: '--quickstart-focus-ring-color', detail: 'Quick Start var (advanced)', includeInGeneratedRoot: false },
  { name: '--quickstart-danger-color', detail: 'Quick Start var (advanced)', includeInGeneratedRoot: false },
]

export const QUICK_START_EDITOR_CSS_VARIABLES: CssEditorVariable[] = QUICK_START_VARIABLE_DEFINITIONS.map(
  ({ name, detail }) => ({ name, detail }),
)

export const QUICK_START_GENERATED_ROOT_VARIABLE_NAMES = QUICK_START_VARIABLE_DEFINITIONS
  .filter(definition => definition.includeInGeneratedRoot)
  .map(definition => definition.name)
