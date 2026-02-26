import { useThemeConfig } from '../features/presets/queries'
import {
  AssetsPanel,
  ColorSettingsPanel,
  TemplateContentPanel,
  useQuickStartSettings,
} from './quickstart'

export default function QuickStartPanel() {
  const themeConfig = useThemeConfig()
  const settings = useQuickStartSettings()

  return (
    <div className="p-2 space-y-4">
      <ColorSettingsPanel
        themes={themeConfig.themes}
        selectedThemeId={settings.selectedThemeId}
        effectivePresetId={settings.effectivePresetId}
        effectivePrimaryColor={settings.effectivePrimaryColor}
        effectiveSecondaryColor={settings.effectiveSecondaryColor}
        effectiveFontFamily={settings.effectiveFontFamily}
        effectiveBgColor={settings.effectiveBgColor}
        effectiveBorderRadius={settings.effectiveBorderRadius}
        effectiveCardShadow={settings.effectiveCardShadow}
        effectiveHeadingFontFamily={settings.effectiveHeadingFontFamily}
        fontOptions={settings.fontOptions}
      />

      <TemplateContentPanel
        showClientName={settings.showClientName}
        showRealmName={settings.showRealmName}
        infoMessage={settings.infoMessage}
        imprintUrl={settings.imprintUrl}
        dataProtectionUrl={settings.dataProtectionUrl}
      />

      <AssetsPanel />
    </div>
  )
}
