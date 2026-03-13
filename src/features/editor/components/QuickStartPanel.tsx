import { Alert, Stack, StackItem } from '@patternfly/react-core'
import SidebarPanel from '../../../components/SidebarPanel'
import { useThemeConfig } from '../../presets/queries'
import {
  AssetsPanel,
  ColorSettingsPanel,
  TemplateContentPanel,
  useQuickStartSettings,
} from './quickstart'

export default function QuickStartPanel() {
  const themeConfig = useThemeConfig()
  const settings = useQuickStartSettings()
  const selectedTheme = themeConfig.themes.find(theme => theme.id === settings.selectedThemeId)
  const isExternal = Boolean(selectedTheme?.isImported)
  const sectionPanelStyle = {
    padding: 'var(--pf-t--global--spacer--md)',
    backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
    borderRadius: 'var(--pf-t--global--border--radius--medium)',
  } as const

  if (isExternal) {
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
                isExternal
              />
            </section>
          </StackItem>
          <StackItem>
            <section style={sectionPanelStyle}>
              <Alert
                isInline
                variant="info"
                title="Quick-start settings and template content are not available for imported themes."
              >
                Switch to a built-in preset to use these controls.
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
