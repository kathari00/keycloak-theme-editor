import type { BootstrapVariantId, FrameworkId } from '../../lib/framework-bindings/types'
import type { LayoutId } from '../../lib/layouts/types'
import type { StyleOptionId } from '../../lib/style-options'
import type { QuickSettingsStyle } from '../../stores/types'
import type { FontOption } from './useQuickStartSettings'
import {
  Flex,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  Stack,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { InfoCircleIcon } from '@patternfly/react-icons'
import { useRef } from 'react'
import { editorActions } from '../../actions'
import { BOOTSTRAP_VARIANTS, loadBootstrapVariantDefaultColors } from '../../lib/framework-bindings/registry'
import { LAYOUT_OPTIONS } from '../../lib/layouts/registry'
import {
  BORDER_RADIUS_OPTIONS,
  CARD_SHADOW_OPTIONS,
  CUSTOM_PRESET_ID,
} from '../../lib/quick-start-css'
import { deriveStyleOptionId, STYLE_OPTIONS, styleOptionFrameworkId, styleOptionThemeId } from '../../lib/style-options'
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

function resolveEffectivePresetId(params: {
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  headingFontFamily: string
}): string {
  const matchingPreset = QUICK_START_PRESETS.find(preset =>
    preset.primaryColor === params.primaryColor
    && preset.secondaryColor === params.secondaryColor
    && preset.fontFamily === params.fontFamily
    && preset.fontFamily === params.headingFontFamily,
  )

  return matchingPreset?.id ?? CUSTOM_PRESET_ID
}

interface ColorSettingsPanelProps {
  selectedThemeId: string
  effectivePrimaryColor: string
  effectiveSecondaryColor: string
  effectiveFontFamily: string
  effectiveBgColor: string
  effectiveBorderRadius: QuickSettingsStyle['colorPresetBorderRadius']
  effectiveCardShadow: QuickSettingsStyle['colorPresetCardShadow']
  effectiveHeadingFontFamily: string
  fontOptions: FontOption[]
  frameworkId: FrameworkId
  bootstrapVariantId: BootstrapVariantId
  supportsLayoutSelection: boolean
  layoutId: LayoutId
}

const formGroupStyle = { marginBottom: 0 }

export function ColorSettingsPanel({
  selectedThemeId,
  effectivePrimaryColor,
  effectiveSecondaryColor,
  effectiveFontFamily,
  effectiveBgColor,
  effectiveBorderRadius,
  effectiveCardShadow,
  effectiveHeadingFontFamily,
  fontOptions,
  frameworkId,
  bootstrapVariantId,
  supportsLayoutSelection,
  layoutId,
}: ColorSettingsPanelProps) {
  const styleOptionId = deriveStyleOptionId(selectedThemeId, frameworkId)
  const effectivePresetId = resolveEffectivePresetId({
    primaryColor: effectivePrimaryColor,
    secondaryColor: effectiveSecondaryColor,
    fontFamily: effectiveFontFamily,
    headingFontFamily: effectiveHeadingFontFamily,
  })

  // Guards against a slower, superseded color/theme request overwriting a later one's result.
  const latestColorRequestIdRef = useRef(0)

  const applyBootstrapDefaultColors = async (variantId: BootstrapVariantId, requestId: number) => {
    const colors = await loadBootstrapVariantDefaultColors(variantId)
    if (latestColorRequestIdRef.current !== requestId) {
      return
    }
    editorActions.setQuickStartStyle(
      colors.primaryColor,
      colors.secondaryColor,
      effectiveFontFamily,
      { recordHistory: false },
    )
  }

  const handleStyleChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    const nextStyleOptionId = value as StyleOptionId
    const themeId = styleOptionThemeId(nextStyleOptionId)
    const requestId = ++latestColorRequestIdRef.current
    editorActions.setFrameworkIdForTheme(styleOptionFrameworkId(nextStyleOptionId), themeId)
    void (async () => {
      const applied = await editorActions.applyThemeSelection(themeId)
      if (!applied || latestColorRequestIdRef.current !== requestId) {
        return
      }
      if (nextStyleOptionId === 'bootstrap')
        await applyBootstrapDefaultColors(bootstrapVariantId, requestId)
      if (nextStyleOptionId === 'carbon') {
        editorActions.setQuickStartStyle('#0f62fe', '#393939', '"IBM Plex Sans", sans-serif', {
          headingFontFamily: '"IBM Plex Sans", sans-serif',
          recordHistory: false,
        })
        editorActions.setQuickStartExtras({ colorPresetBorderRadius: 'sharp', colorPresetCardShadow: 'none' })
      }
    })()
  }

  const handlePresetChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    const preset = QUICK_START_PRESETS.find(item => item.id === value)
    if (!preset) {
      return
    }
    editorActions.setQuickStartStyle(
      preset.primaryColor,
      preset.secondaryColor,
      preset.fontFamily,
      { headingFontFamily: preset.fontFamily },
    )
  }

  const handleBootstrapVariantChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    const variantId = value as BootstrapVariantId
    const requestId = ++latestColorRequestIdRef.current
    editorActions.setBootstrapVariantIdForTheme(variantId, selectedThemeId)
    void applyBootstrapDefaultColors(variantId, requestId)
  }

  const updatePrimaryColor = (value: string) => {
    editorActions.setQuickStartStyle(value, effectiveSecondaryColor, effectiveFontFamily)
  }

  const updateSecondaryColor = (value: string) => {
    editorActions.setQuickStartStyle(effectivePrimaryColor, value, effectiveFontFamily)
  }

  const handleFontChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    editorActions.setQuickStartStyle(effectivePrimaryColor, effectiveSecondaryColor, value)
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

  const handleLayoutChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    editorActions.setLayoutIdForTheme(value as LayoutId, selectedThemeId)
  }

  return (
    <Stack hasGutter>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <Title headingLevel="h3" size="md">
          Theme and colors
        </Title>
        <Tooltip content="Pick a theme and customize colors to get started fast.">
          <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)', cursor: 'help' }} />
        </Tooltip>
      </Flex>
      <FormGroup label="Style" fieldId="design-preset" style={formGroupStyle}>
        <FormSelect
          id="design-preset"
          value={styleOptionId}
          onChange={handleStyleChange}
          aria-label="Select a style"
        >
          {STYLE_OPTIONS.map(option => (
            <FormSelectOption
              key={option.id}
              value={option.id}
              label={option.label}
            />
          ))}
        </FormSelect>
      </FormGroup>

      {frameworkId === 'bootstrap' && (
        <FormGroup label="Bootstrap variant" fieldId="bootstrap-variant" style={formGroupStyle}>
          <FormSelect
            id="bootstrap-variant"
            value={bootstrapVariantId}
            onChange={handleBootstrapVariantChange}
            aria-label="Select a Bootstrap variant"
          >
            {BOOTSTRAP_VARIANTS.map(option => (
              <FormSelectOption key={option.id} value={option.id} label={option.label} />
            ))}
          </FormSelect>
        </FormGroup>
      )}

      {supportsLayoutSelection && (
        <FormGroup label="Layout" fieldId="quick-start-layout" style={formGroupStyle}>
          <FormSelect
            id="quick-start-layout"
            value={layoutId}
            onChange={handleLayoutChange}
            aria-label="Select a layout"
          >
            {LAYOUT_OPTIONS.map(option => (
              <FormSelectOption key={option.id} value={option.id} label={option.label} />
            ))}
          </FormSelect>
        </FormGroup>
      )}

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

      <Grid hasGutter md={6}>
        <GridItem>
          <ColorPicker
            label="Primary color"
            fieldId="quick-start-primary"
            value={effectivePrimaryColor}
            onChange={updatePrimaryColor}
          />
        </GridItem>

        <GridItem>
          <ColorPicker
            label="Secondary color"
            fieldId="quick-start-secondary"
            value={effectiveSecondaryColor}
            onChange={updateSecondaryColor}
          />
        </GridItem>

        <GridItem span={12}>
          <ColorPicker
            label="Background color"
            fieldId="quick-start-bg"
            value={effectiveBgColor}
            onChange={updateBgColor}
            placeholder="(preset default)"
            showTransparentPattern
          />
        </GridItem>

        <GridItem>
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
        </GridItem>

        <GridItem>
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
        </GridItem>

        <GridItem>
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
        </GridItem>

        <GridItem>
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
        </GridItem>
      </Grid>
    </Stack>
  )
}
