import { Alert, FormGroup, FormSelect, FormSelectOption, Stack, StackItem } from '@patternfly/react-core'
import SidebarPanel from '../../../components/SidebarPanel'
import { useThemeConfig } from '../../presets/queries'
import { editorActions } from '../actions'
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
  const selectedTheme = themeConfig.themes.find(theme => theme.id === settings.selectedThemeId)
  const isImported = selectedTheme?.type === 'imported'

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
              themes={themeConfig.themes}
              selectedThemeId={settings.selectedThemeId}
              effectivePrimaryColor={settings.effectivePrimaryColor}
              effectiveSecondaryColor={settings.effectiveSecondaryColor}
              effectiveFontFamily={settings.effectiveFontFamily}
              effectiveBgColor={settings.effectiveBgColor}
              effectiveBorderRadius={settings.effectiveBorderRadius}
              effectiveCardShadow={settings.effectiveCardShadow}
              effectiveHeadingFontFamily={settings.effectiveHeadingFontFamily}
              fontOptions={settings.fontOptions}
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
