import type { QuickSettingsStyle } from '../features/editor/stores/types'
import {
  Button,
  Checkbox,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Panel,
  PanelMain,
  PanelMainBody,
  TextInput,
  Tooltip,
} from '@patternfly/react-core'
import { InfoCircleIcon, LanguageIcon } from '@patternfly/react-icons'
import { useMemo } from 'react'
import { buildGoogleFontOptions } from '../features/assets/google-fonts'
import { editorActions } from '../features/editor/actions'
import {
  BORDER_RADIUS_OPTIONS,
  CARD_SHADOW_OPTIONS,
  COLOR_REGEX,
  CUSTOM_PRESET_ID,
} from '../features/editor/quick-start-css'
import {
  usePresetState,
  useQuickStartColorsState,
  useQuickStartContentState,
  useUploadedAssetsState,
} from '../features/editor/use-editor'
import { useThemeConfig } from '../features/presets/queries'
import { isValidExternalLegalLinkUrl } from '../features/preview/legal-link-url'
import CustomAssetUploader from './CustomAssetUploader'

const QUICK_START_PRESETS = [
  {
    id: 'keycloak-default',
    name: 'Keycloak Blue',
    primaryColor: '#0066cc',
    secondaryColor: '#c0c0c0',
    fontFamily: CUSTOM_PRESET_ID,
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    primaryColor: '#e76f51',
    secondaryColor: '#f4a261',
    fontFamily: '\'Poppins\', sans-serif',
  },
  {
    id: 'forest',
    name: 'Forest',
    primaryColor: '#2f855a',
    secondaryColor: '#3c6e71',
    fontFamily: '\'Raleway\', sans-serif',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    primaryColor: '#4f46e5',
    secondaryColor: '#06b6d4',
    fontFamily: '\'Inter\', sans-serif',
  },
] as const

function formatFontLabelFromValue(fontValue: string): string {
  const first = fontValue.split(',')[0]?.trim() || fontValue
  return first.replace(/^['"]|['"]$/g, '')
}

export default function QuickStartPanel() {
  const setQuickStartExtras = (update: Parameters<typeof editorActions.setQuickStartExtras>[0]) => {
    editorActions.setQuickStartExtras(update)
  }
  const { uploadedAssets } = useUploadedAssetsState()
  const { selectedThemeId } = usePresetState()
  const {
    colorPresetId,
    colorPresetPrimaryColor,
    colorPresetSecondaryColor,
    colorPresetFontFamily,
    colorPresetBgColor,
    colorPresetBorderRadius,
    colorPresetCardShadow,
    colorPresetHeadingFontFamily,
  } = useQuickStartColorsState()
  const {
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  } = useQuickStartContentState()

  // State for design presets
  const loadedThemeConfig = useThemeConfig()

  const fontOptions = useMemo<Array<{ value: string, label: string }>>(() => {
    const googleOptions = buildGoogleFontOptions().map(option => ({
      value: option.id,
      label: option.label,
    }))
    const uploadedOptions = uploadedAssets
      .filter(a => a.category === 'font' && a.fontFamily)
      .map(a => ({
        value: `'${a.fontFamily}', sans-serif`,
        label: `${a.fontFamily} (Uploaded)`,
      }))
    const options = [
      { value: CUSTOM_PRESET_ID, label: 'Default (Keycloak)' },
      ...uploadedOptions,
      ...googleOptions,
    ]

    const knownValues = new Set(options.map(option => option.value))
    ;[colorPresetFontFamily, colorPresetHeadingFontFamily].forEach((selectedFont) => {
      if (!selectedFont || knownValues.has(selectedFont)) {
        return
      }

      options.push({
        value: selectedFont,
        label: `${formatFontLabelFromValue(selectedFont)} (Current)`,
      })
      knownValues.add(selectedFont)
    })

    return options
  }, [uploadedAssets, colorPresetFontFamily, colorPresetHeadingFontFamily])

  const loadedThemes = loadedThemeConfig.themes

  const handleDesignPresetChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    const selectedTheme = loadedThemes.find(theme => theme.id === value)
    if (!selectedTheme) {
      return
    }
    void editorActions.applyThemeSelection(value)
  }

  const handlePresetChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    const preset = QUICK_START_PRESETS.find(item => item.id === value)
    if (!preset)
      return
    editorActions.setColorPreset(
      value,
      preset.primaryColor,
      preset.secondaryColor,
      preset.fontFamily,
      { headingFontFamily: preset.fontFamily },
    )
  }

  const updatePrimaryColor = (value: string) => {
    editorActions.setColorPreset(CUSTOM_PRESET_ID, value, colorPresetSecondaryColor, colorPresetFontFamily)
  }

  const updateSecondaryColor = (value: string) => {
    editorActions.setColorPreset(CUSTOM_PRESET_ID, colorPresetPrimaryColor, value, colorPresetFontFamily)
  }

  const handleFontChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    editorActions.setColorPreset(CUSTOM_PRESET_ID, colorPresetPrimaryColor, colorPresetSecondaryColor, value)
  }

  const updateBgColor = (value: string) => {
    setQuickStartExtras({ colorPresetBgColor: value })
  }

  const updateBorderRadius = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    setQuickStartExtras({ colorPresetBorderRadius: value as QuickSettingsStyle['colorPresetBorderRadius'] })
  }

  const updateCardShadow = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    setQuickStartExtras({ colorPresetCardShadow: value as QuickSettingsStyle['colorPresetCardShadow'] })
  }

  const handleHeadingFontChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    setQuickStartExtras({ colorPresetHeadingFontFamily: value })
  }

  const updateShowClientName = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    setQuickStartExtras({ showClientName: checked })
  }

  const updateShowRealmName = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    setQuickStartExtras({ showRealmName: checked })
  }

  const updateInfoMessage = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    setQuickStartExtras({ infoMessage: value })
  }

  const updateImprintUrl = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    setQuickStartExtras({ imprintUrl: value })
  }

  const updateDataProtectionUrl = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    setQuickStartExtras({ dataProtectionUrl: value })
  }

  const primaryValidated = colorPresetPrimaryColor && COLOR_REGEX.test(colorPresetPrimaryColor) ? 'default' : 'error'
  const secondaryValidated = colorPresetSecondaryColor && COLOR_REGEX.test(colorPresetSecondaryColor) ? 'default' : 'error'
  const bgValidated = !colorPresetBgColor || COLOR_REGEX.test(colorPresetBgColor) ? 'default' : 'error'
  const imprintUrlValidated = !imprintUrl || isValidExternalLegalLinkUrl(imprintUrl) ? 'default' : 'error'
  const dataProtectionUrlValidated = !dataProtectionUrl || isValidExternalLegalLinkUrl(dataProtectionUrl) ? 'default' : 'error'
  const formGroupTightStyle = { marginBottom: 0 }
  const quickStartFormGroupStyle = { marginBottom: 0 }
  const renderLocalizationHelp = (ariaLabel: string, tooltipContent: string) => (
    <Tooltip content={tooltipContent}>
      <Button
        type="button"
        variant="plain"
        aria-label={ariaLabel}
        icon={<LanguageIcon />}
        style={{ color: 'var(--pf-v5-global--info-color--100)' }}
      />
    </Tooltip>
  )

  return (
    <div className="p-2 space-y-4">
      <Panel>
        <PanelMain>
          <PanelMainBody>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="mb-0">Quick Start</h4>
              <Tooltip content="Pick a theme and customize colors to get started fast.">
                <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)', cursor: 'help' }} />
              </Tooltip>
            </div>

            <div className="grid gap-2">
              <FormGroup label="Theme" fieldId="design-preset" style={quickStartFormGroupStyle}>
                <FormSelect
                  id="design-preset"
                  value={selectedThemeId}
                  onChange={handleDesignPresetChange}
                  aria-label="Select a theme"
                >
                  {loadedThemes.map(theme => (
                    <FormSelectOption
                      key={theme.id}
                      value={theme.id}
                      label={theme.name}
                    />
                  ))}
                </FormSelect>
              </FormGroup>

              <FormGroup label="Preset" fieldId="quick-start-preset" style={quickStartFormGroupStyle}>
                <FormSelect
                  id="quick-start-preset"
                  value={colorPresetId}
                  onChange={handlePresetChange}
                  aria-label="Select a preset"
                >
                  {QUICK_START_PRESETS.map(preset => (
                    <FormSelectOption
                      key={preset.id}
                      value={preset.id}
                      label={preset.name}
                    />
                  ))}
                  <FormSelectOption value={CUSTOM_PRESET_ID} label="Custom" />
                </FormSelect>
              </FormGroup>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FormGroup label="Primary color" fieldId="quick-start-primary" style={quickStartFormGroupStyle}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-[28px] h-[28px] rounded border border-black/20 relative overflow-hidden"
                      style={{ backgroundColor: colorPresetPrimaryColor || '#000000' }}
                    >
                      <input
                        type="color"
                        value={COLOR_REGEX.test(colorPresetPrimaryColor) ? colorPresetPrimaryColor : '#000000'}
                        onChange={event => updatePrimaryColor(event.target.value)}
                        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                        aria-label="Pick primary color"
                      />
                    </div>
                    <TextInput
                      id="quick-start-primary"
                      value={colorPresetPrimaryColor}
                      onChange={(_event, value) => updatePrimaryColor(value)}
                      aria-label="Primary color value"
                      validated={primaryValidated}
                    />
                  </div>
                </FormGroup>

                <FormGroup label="Secondary color" fieldId="quick-start-secondary" style={quickStartFormGroupStyle}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-[28px] h-[28px] rounded border border-black/20 relative overflow-hidden"
                      style={{ backgroundColor: colorPresetSecondaryColor || '#000000' }}
                    >
                      <input
                        type="color"
                        value={COLOR_REGEX.test(colorPresetSecondaryColor) ? colorPresetSecondaryColor : '#000000'}
                        onChange={event => updateSecondaryColor(event.target.value)}
                        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                        aria-label="Pick secondary color"
                      />
                    </div>
                    <TextInput
                      id="quick-start-secondary"
                      value={colorPresetSecondaryColor}
                      onChange={(_event, value) => updateSecondaryColor(value)}
                      aria-label="Secondary color value"
                      validated={secondaryValidated}
                    />
                  </div>
                </FormGroup>

                <div className="sm:col-span-2">
                  <FormGroup label="Background color" fieldId="quick-start-bg" style={quickStartFormGroupStyle}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-[28px] h-[28px] rounded border border-black/20 relative overflow-hidden"
                        style={{ backgroundColor: colorPresetBgColor && COLOR_REGEX.test(colorPresetBgColor) ? colorPresetBgColor : 'transparent', backgroundImage: !colorPresetBgColor ? 'repeating-conic-gradient(#aaa 0% 25%, #fff 0% 50%)' : undefined, backgroundSize: '8px 8px' }}
                      >
                        <input
                          type="color"
                          value={colorPresetBgColor && COLOR_REGEX.test(colorPresetBgColor) ? colorPresetBgColor : '#ffffff'}
                          onChange={event => updateBgColor(event.target.value)}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                          aria-label="Pick background color"
                        />
                      </div>
                      <TextInput
                        id="quick-start-bg"
                        value={colorPresetBgColor}
                        onChange={(_event, value) => updateBgColor(value)}
                        placeholder="(preset default)"
                        aria-label="Background color value"
                        validated={bgValidated}
                      />
                    </div>
                  </FormGroup>
                </div>

                <FormGroup label="Border radius" fieldId="quick-start-radius" style={quickStartFormGroupStyle}>
                  <FormSelect
                    id="quick-start-radius"
                    value={colorPresetBorderRadius}
                    onChange={updateBorderRadius}
                    aria-label="Select border radius"
                  >
                    {BORDER_RADIUS_OPTIONS.map(o => (
                      <FormSelectOption key={o.value} value={o.value} label={o.label} />
                    ))}
                  </FormSelect>
                </FormGroup>

                <FormGroup label="Card shadow" fieldId="quick-start-shadow" style={quickStartFormGroupStyle}>
                  <FormSelect
                    id="quick-start-shadow"
                    value={colorPresetCardShadow}
                    onChange={updateCardShadow}
                    aria-label="Select card shadow"
                  >
                    {CARD_SHADOW_OPTIONS.map(o => (
                      <FormSelectOption key={o.value} value={o.value} label={o.label} />
                    ))}
                  </FormSelect>
                </FormGroup>

                <FormGroup label="Text font" fieldId="quick-start-font" style={quickStartFormGroupStyle}>
                  <FormSelect
                    id="quick-start-font"
                    value={colorPresetFontFamily}
                    onChange={handleFontChange}
                    aria-label="Select text font family"
                  >
                    {fontOptions.map(option => (
                      <FormSelectOption
                        key={option.value}
                        value={option.value}
                        label={option.label}
                      />
                    ))}
                  </FormSelect>
                </FormGroup>

                <FormGroup label="Heading font" fieldId="quick-start-heading-font" style={quickStartFormGroupStyle}>
                  <FormSelect
                    id="quick-start-heading-font"
                    value={colorPresetHeadingFontFamily}
                    onChange={handleHeadingFontChange}
                    aria-label="Select heading font family"
                  >
                    {fontOptions.map(option => (
                      <FormSelectOption
                        key={option.value}
                        value={option.value}
                        label={option.label}
                      />
                    ))}
                  </FormSelect>
                </FormGroup>
              </div>
            </div>
          </PanelMainBody>
        </PanelMain>
      </Panel>

      <Panel>
        <PanelMain>
          <PanelMainBody>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="mb-0">Template content</h4>
              <Tooltip content="Configure dynamic content shown in the login template.">
                <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)', cursor: 'help' }} />
              </Tooltip>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Checkbox
                  id="quick-start-realm-name"
                  label="Show realm name"
                  isChecked={showRealmName}
                  onChange={updateShowRealmName}
                />
                <Checkbox
                  id="quick-start-client-name"
                  label="Show client name"
                  isChecked={showClientName}
                  onChange={updateShowClientName}
                />
              </div>
              <FormGroup
                label="Show info message"
                labelHelp={renderLocalizationHelp('Info message localization help', 'To add translations use i18n key infoMessage')}
                fieldId="quick-start-info-message"
                style={formGroupTightStyle}
              >
                <TextInput
                  id="quick-start-info-message"
                  value={infoMessage}
                  onChange={updateInfoMessage}
                  aria-label="Info message"
                />
              </FormGroup>
              <FormGroup
                label="Imprint URL"
                labelHelp={renderLocalizationHelp('Imprint URL localization help', 'To add translations use i18n key imprintUrl')}
                fieldId="quick-start-imprint"
                style={formGroupTightStyle}
              >
                <TextInput
                  id="quick-start-imprint"
                  value={imprintUrl}
                  onChange={updateImprintUrl}
                  placeholder="https://..."
                  aria-label="Imprint URL"
                  validated={imprintUrlValidated}
                />
              </FormGroup>
              <FormGroup
                label="Data protection URL"
                labelHelp={renderLocalizationHelp('Data protection URL localization help', 'To add translations use i18n key dataProtectionUrl')}
                fieldId="quick-start-data-protection"
                style={formGroupTightStyle}
              >
                <TextInput
                  id="quick-start-data-protection"
                  value={dataProtectionUrl}
                  onChange={updateDataProtectionUrl}
                  placeholder="https://..."
                  aria-label="Data protection URL"
                  validated={dataProtectionUrlValidated}
                />
              </FormGroup>
            </div>
          </PanelMainBody>
        </PanelMain>
      </Panel>

      <Panel>
        <PanelMain>
          <PanelMainBody>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="mb-0">Assets</h4>
              <Tooltip content="Upload fonts, backgrounds, logos and favicons for your theme.">
                <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)', cursor: 'help' }} />
              </Tooltip>
            </div>
            <CustomAssetUploader />
          </PanelMainBody>
        </PanelMain>
      </Panel>
    </div>
  )
}
