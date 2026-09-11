import { Alert, FormGroup, FormSelect, FormSelectOption, Stack, StackItem } from '@patternfly/react-core'
import SidebarPanel from '../../../components/SidebarPanel'
import { useThemeConfig } from '../../presets/queries'
import { editorActions } from '../actions'
import { useFrameworkIdByThemeState, useLayoutIdByThemeState } from '../hooks/use-editor'
import { DEFAULT_BOOTSTRAP_VARIANT_ID, DEFAULT_FRAMEWORK_ID } from '../lib/framework-bindings/types'
import { DEFAULT_LAYOUT_ID } from '../lib/layouts/types'
import {
  AssetsPanel,
  ColorSettingsPanel,
  TemplateContentPanel,
  useQuickStartSettings,
} from './quickstart'

const sectionPanelStyle = {
  padding: 'var(--pf-t--global--spacer--md)',
  backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
  borderRadius: 'var(--pf-t--global--border--radius--medium)',
} as const

export default function QuickStartPanel() {
  const themeConfig = useThemeConfig()
  const settings = useQuickStartSettings()
  const { bootstrapVariantIdByTheme, frameworkIdByTheme } = useFrameworkIdByThemeState()
  const { layoutIdByTheme } = useLayoutIdByThemeState()
  const selectedTheme = themeConfig.themes.find(theme => theme.id === settings.selectedThemeId)
  const isImported = selectedTheme?.type === 'imported'
  const supportsFrameworkBinding = Boolean(selectedTheme?.supportsFrameworkBinding)
  const frameworkId = supportsFrameworkBinding
    ? (frameworkIdByTheme[settings.selectedThemeId] ?? DEFAULT_FRAMEWORK_ID)
    : DEFAULT_FRAMEWORK_ID
  const bootstrapVariantId = bootstrapVariantIdByTheme[settings.selectedThemeId] ?? DEFAULT_BOOTSTRAP_VARIANT_ID
  const supportsLayoutSelection = Boolean(selectedTheme?.supportsLayoutSelection)
  const layoutId = supportsLayoutSelection
    ? (layoutIdByTheme[settings.selectedThemeId] ?? DEFAULT_LAYOUT_ID)
    : DEFAULT_LAYOUT_ID

  const handleThemeChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    if (themeConfig.themes.some(t => t.id === value))
      void editorActions.applyThemeSelection(value)
  }

  const themeSelector = (
    <FormGroup label="Theme" fieldId="design-preset" style={{ marginBottom: 0 }}>
      <FormSelect
        id="design-preset"
        value={settings.selectedThemeId}
        onChange={handleThemeChange}
        aria-label="Select a theme"
      >
        {themeConfig.themes.map(theme => (
          <FormSelectOption key={theme.id} value={theme.id} label={theme.name} />
        ))}
      </FormSelect>
    </FormGroup>
  )

  if (isImported) {
    return (
      <SidebarPanel title="Quick start">
        <Stack hasGutter>
          <StackItem>
            <section style={sectionPanelStyle}>{themeSelector}</section>
          </StackItem>
          <StackItem>
            <section style={sectionPanelStyle}>
              <Alert
                isInline
                variant="info"
                title="Quick-start settings are not available for imported themes."
              >
                Switch to a built-in preset to use color, font, and content controls.
              </Alert>
            </section>
          </StackItem>
        </Stack>
      </SidebarPanel>
    )
  }

  return (
    <SidebarPanel title="Quick start">
      <Stack hasGutter>
        <StackItem>
          <section style={sectionPanelStyle}>
            <ColorSettingsPanel
              selectedThemeId={settings.selectedThemeId}
              effectivePrimaryColor={settings.effectivePrimaryColor}
              effectiveSecondaryColor={settings.effectiveSecondaryColor}
              effectiveFontFamily={settings.effectiveFontFamily}
              effectiveBgColor={settings.effectiveBgColor}
              effectiveBorderRadius={settings.effectiveBorderRadius}
              effectiveCardShadow={settings.effectiveCardShadow}
              effectiveHeadingFontFamily={settings.effectiveHeadingFontFamily}
              fontOptions={settings.fontOptions}
              frameworkId={frameworkId}
              bootstrapVariantId={bootstrapVariantId}
              supportsLayoutSelection={supportsLayoutSelection}
              layoutId={layoutId}
            />
          </section>
        </StackItem>

        <StackItem>
          <section style={sectionPanelStyle}>
            <TemplateContentPanel
              showClientName={settings.showClientName}
              showRealmName={settings.showRealmName}
              infoMessage={settings.infoMessage}
              imprintUrl={settings.imprintUrl}
              dataProtectionUrl={settings.dataProtectionUrl}
              imprintLabel={settings.imprintLabel}
              dataProtectionLabel={settings.dataProtectionLabel}
            />
          </section>
        </StackItem>

        <StackItem>
          <section style={sectionPanelStyle}>
            <AssetsPanel />
          </section>
        </StackItem>
      </Stack>
    </SidebarPanel>
  )
}
