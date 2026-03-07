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

export function ColorPicker({
  label,
  fieldId,
  value,
  onChange,
  placeholder,
  showTransparentPattern = false,
}: ColorPickerProps) {
  const isValidColor = COLOR_REGEX.test(value)
  const validated = !value || isValidColor ? 'default' : 'error'

  const swatchStyle = showTransparentPattern && !value
    ? {
        backgroundColor: 'transparent',
        backgroundImage: 'repeating-conic-gradient(#aaa 0% 25%, #fff 0% 50%)',
        backgroundSize: '8px 8px',
      }
    : { backgroundColor: value && isValidColor ? value : (value || '#000000') }

  const inputColorValue = value && isValidColor ? value : '#ffffff'

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
            validated={validated}
          />
        </FlexItem>
      </Flex>
    </FormGroup>
  )
}
