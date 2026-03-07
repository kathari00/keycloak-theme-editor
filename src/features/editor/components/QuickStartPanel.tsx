import { Alert, Stack, StackItem } from '@patternfly/react-core'
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

  if (isExternal) {
    return (
      <Stack hasGutter style={{ padding: 'var(--pf-t--global--spacer--sm)' }}>
        <StackItem>
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
        </StackItem>
        <StackItem>
          <Alert
            isInline
            variant="info"
            title="Quick-start settings and template content are not available for imported themes."
          >
            Switch to a built-in preset to use these controls.
          </Alert>
        </StackItem>
      </Stack>
    )
  }

  return (
    <Stack hasGutter style={{ padding: 'var(--pf-t--global--spacer--sm)' }}>
      <StackItem>
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
      </StackItem>

      <StackItem>
        <TemplateContentPanel
          showClientName={settings.showClientName}
          showRealmName={settings.showRealmName}
          infoMessage={settings.infoMessage}
          imprintUrl={settings.imprintUrl}
          dataProtectionUrl={settings.dataProtectionUrl}
        />
      </StackItem>

      <StackItem>
        <AssetsPanel />
      </StackItem>
    </Stack>
  )
}
