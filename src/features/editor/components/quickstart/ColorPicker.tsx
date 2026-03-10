import { Flex, FlexItem, FormGroup, TextInput } from '@patternfly/react-core'
import { COLOR_REGEX } from '../../lib/quick-start-css'

interface ColorPickerProps {
  label: string
  fieldId: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  showTransparentPattern?: boolean
}

const formGroupStyle = { marginBottom: 0 }

/**
 * Convert any CSS color value to a 7-character lowercase hex string (#rrggbb)
 * suitable for <input type="color">. Uses canvas for named/rgb/hsl colors.
 */
function toHexForNativeInput(cssColor: string): string | null {
  if (!cssColor) {
    return null
  }
  // Expand 3-digit hex to 6-digit
  const short = cssColor.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase()
  }
  // Already valid 6-digit hex — normalize to lowercase
  if (COLOR_REGEX.test(cssColor)) {
    return cssColor.toLowerCase()
  }
  // Use canvas to resolve named/rgb/hsl colors
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) {
    return null
  }
  ctx.fillStyle = '#000000'
  ctx.fillStyle = cssColor
  const resolved = ctx.fillStyle
  return resolved && resolved !== '#000000' ? resolved : null
}

export function ColorPicker({
  label,
  fieldId,
  value,
  onChange,
  placeholder,
  showTransparentPattern = false,
}: ColorPickerProps) {
  const hexValue = toHexForNativeInput(value)

  const swatchStyle = showTransparentPattern && !value
    ? {
        backgroundColor: 'transparent',
        backgroundImage: 'repeating-conic-gradient(#aaa 0% 25%, #fff 0% 50%)',
        backgroundSize: '8px 8px',
      }
    : { backgroundColor: value || '#000000' }

  const inputColorValue = hexValue ?? '#ffffff'

  return (
    <FormGroup label={label} fieldId={fieldId} style={formGroupStyle}>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <div
          style={{
            ...swatchStyle,
            position: 'relative',
            overflow: 'hidden',
            width: '28px',
            height: '28px',
            flex: '0 0 auto',
            border: '1px solid rgb(0 0 0 / 20%)',
            borderRadius: 'var(--pf-t--global--border--radius--small)',
          }}
        >
          <input
            type="color"
            value={inputColorValue}
            onChange={event => onChange(event.target.value)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              opacity: 0,
            }}
            aria-label={`Pick ${label.toLowerCase()}`}
          />
        </div>
        <FlexItem grow={{ default: 'grow' }}>
          <TextInput
            id={fieldId}
            value={value}
            onChange={(_event, nextValue) => onChange(nextValue)}
            placeholder={placeholder}
            aria-label={`${label} value`}
          />
        </FlexItem>
      </Flex>
    </FormGroup>
  )
}
