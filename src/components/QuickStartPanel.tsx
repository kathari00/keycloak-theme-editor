import { useThemeConfig } from '../features/presets/queries'
import { isBuiltinTheme } from '../features/presets/types'
import {
  AssetsPanel,
  ColorSettingsPanel,
  TemplateContentPanel,
  useQuickStartSettings,
} from './quickstart'

export default function QuickStartPanel() {
  const themeConfig = useThemeConfig()
  const settings = useQuickStartSettings()
  const isExternal = !isBuiltinTheme(settings.selectedThemeId)

  if (isExternal) {
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
          isExternal
        />
        <div style={{ padding: '1rem', opacity: 0.6, fontSize: '0.85rem', fontFamily: 'var(--pf-t--global--font--family--sans-serif)' }}>
          Quick-start settings and template content are not available for imported themes.
          Switch to a built-in preset to use these controls.
        </div>
      </div>
    )
  }

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
