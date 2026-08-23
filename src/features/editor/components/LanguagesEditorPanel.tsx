import { Stack, StackItem } from '@patternfly/react-core'
import SidebarPanel from '../../../components/SidebarPanel'
import { LanguagesPanel, useQuickStartSettings } from './quickstart'

const sectionPanelStyle = {
  padding: 'var(--pf-t--global--spacer--md)',
  backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
  borderRadius: 'var(--pf-t--global--border--radius--medium)',
} as const

export default function LanguagesEditorPanel() {
  const settings = useQuickStartSettings()

  return (
    <SidebarPanel title="Languages">
      <Stack hasGutter>
        <StackItem>
          <section style={sectionPanelStyle}>
            <LanguagesPanel
              enabledLocales={settings.enabledLocales}
              quickStartContentByLocale={settings.quickStartContentByLocale}
              infoMessage={settings.infoMessage}
              imprintLabel={settings.imprintLabel}
              dataProtectionLabel={settings.dataProtectionLabel}
            />
          </section>
        </StackItem>
      </Stack>
    </SidebarPanel>
  )
}
