import type { QuickSettingsStyle } from '../../features/editor/stores/types'
import type { EditorTheme } from '../../features/presets/types'
import type { FontOption } from './useQuickStartSettings'
import {
  FormGroup,
  FormSelect,
  FormSelectOption,
  Panel,
  PanelMain,
  PanelMainBody,
  Tooltip,
} from '@patternfly/react-core'
import { InfoCircleIcon } from '@patternfly/react-icons'
import { editorActions } from '../../features/editor/actions'
import {
  BORDER_RADIUS_OPTIONS,
  CARD_SHADOW_OPTIONS,
  CUSTOM_PRESET_ID,
} from '../../features/editor/quick-start-css'
import { ColorPicker } from './ColorPicker'

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

interface ColorSettingsPanelProps {
  themes: EditorTheme[]
  selectedThemeId: string
  effectivePresetId: string
  effectivePrimaryColor: string
  effectiveSecondaryColor: string
  effectiveFontFamily: string
  effectiveBgColor: string
  effectiveBorderRadius: QuickSettingsStyle['colorPresetBorderRadius']
  effectiveCardShadow: QuickSettingsStyle['colorPresetCardShadow']
  effectiveHeadingFontFamily: string
  fontOptions: FontOption[]
  isExternal?: boolean
}

const formGroupStyle = { marginBottom: 0 }

export function ColorSettingsPanel({
  themes,
  selectedThemeId,
  effectivePresetId,
  effectivePrimaryColor,
  effectiveSecondaryColor,
  effectiveFontFamily,
  effectiveBgColor,
  effectiveBorderRadius,
  effectiveCardShadow,
  effectiveHeadingFontFamily,
  fontOptions,
  isExternal,
}: ColorSettingsPanelProps) {
  const handleDesignPresetChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    const selectedTheme = themes.find(theme => theme.id === value)
    if (!selectedTheme) {
      return
    }
    void editorActions.applyThemeSelection(value)
  }

  const handlePresetChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    const preset = QUICK_START_PRESETS.find(item => item.id === value)
    if (!preset) {
      return
    }
    editorActions.setColorPreset(
      value,
      preset.primaryColor,
      preset.secondaryColor,
      preset.fontFamily,
      { headingFontFamily: preset.fontFamily },
    )
  }

  const updatePrimaryColor = (value: string) => {
    editorActions.setColorPreset(CUSTOM_PRESET_ID, value, effectiveSecondaryColor, effectiveFontFamily)
  }

  const updateSecondaryColor = (value: string) => {
    editorActions.setColorPreset(CUSTOM_PRESET_ID, effectivePrimaryColor, value, effectiveFontFamily)
  }

  const handleFontChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    editorActions.setColorPreset(CUSTOM_PRESET_ID, effectivePrimaryColor, effectiveSecondaryColor, value)
  }

  const updateBgColor = (value: string) => {
    editorActions.setQuickStartExtras({ colorPresetBgColor: value })
  }

  const updateBorderRadius = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    editorActions.setQuickStartExtras({ colorPresetBorderRadius: value as QuickSettingsStyle['colorPresetBorderRadius'] })
  }

  const updateCardShadow = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    editorActions.setQuickStartExtras({ colorPresetCardShadow: value as QuickSettingsStyle['colorPresetCardShadow'] })
  }

  const handleHeadingFontChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    editorActions.setQuickStartExtras({ colorPresetHeadingFontFamily: value })
  }

  return (
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
            <FormGroup label="Theme" fieldId="design-preset" style={formGroupStyle}>
              <FormSelect
                id="design-preset"
                value={selectedThemeId}
                onChange={handleDesignPresetChange}
                aria-label="Select a theme"
              >
                {themes.map(theme => (
                  <FormSelectOption
                    key={theme.id}
                    value={theme.id}
                    label={theme.name}
                  />
                ))}
              </FormSelect>
            </FormGroup>

            {!isExternal && (
              <>
                <FormGroup label="Preset" fieldId="quick-start-preset" style={formGroupStyle}>
                  <FormSelect
                    id="quick-start-preset"
                    value={effectivePresetId}
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
                  <ColorPicker
                    label="Primary color"
                    fieldId="quick-start-primary"
                    value={effectivePrimaryColor}
                    onChange={updatePrimaryColor}
                  />

                  <ColorPicker
                    label="Secondary color"
                    fieldId="quick-start-secondary"
                    value={effectiveSecondaryColor}
                    onChange={updateSecondaryColor}
                  />

                  <div className="sm:col-span-2">
                    <ColorPicker
                      label="Background color"
                      fieldId="quick-start-bg"
                      value={effectiveBgColor}
                      onChange={updateBgColor}
                      placeholder="(preset default)"
                      showTransparentPattern
                    />
                  </div>

                  <FormGroup label="Border radius" fieldId="quick-start-radius" style={formGroupStyle}>
                    <FormSelect
                      id="quick-start-radius"
                      value={effectiveBorderRadius}
                      onChange={updateBorderRadius}
                      aria-label="Select border radius"
                    >
                      {BORDER_RADIUS_OPTIONS.map(option => (
                        <FormSelectOption key={option.value} value={option.value} label={option.label} />
                      ))}
                    </FormSelect>
                  </FormGroup>

                  <FormGroup label="Card shadow" fieldId="quick-start-shadow" style={formGroupStyle}>
                    <FormSelect
                      id="quick-start-shadow"
                      value={effectiveCardShadow}
                      onChange={updateCardShadow}
                      aria-label="Select card shadow"
                    >
                      {CARD_SHADOW_OPTIONS.map(option => (
                        <FormSelectOption key={option.value} value={option.value} label={option.label} />
                      ))}
                    </FormSelect>
                  </FormGroup>

                  <FormGroup label="Text font" fieldId="quick-start-font" style={formGroupStyle}>
                    <FormSelect
                      id="quick-start-font"
                      value={effectiveFontFamily}
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

                  <FormGroup label="Heading font" fieldId="quick-start-heading-font" style={formGroupStyle}>
                    <FormSelect
                      id="quick-start-heading-font"
                      value={effectiveHeadingFontFamily}
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
              </>
            )}
          </div>
        </PanelMainBody>
      </PanelMain>
    </Panel>
  )
}
