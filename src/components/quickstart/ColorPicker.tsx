import { FormGroup, TextInput } from '@patternfly/react-core'
import { COLOR_REGEX } from '../../features/editor/quick-start-css'

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
      <div className="flex items-center gap-2">
        <div
          className="w-[28px] h-[28px] rounded border border-black/20 relative overflow-hidden"
          style={swatchStyle}
        >
          <input
            type="color"
            value={inputColorValue}
            onChange={event => onChange(event.target.value)}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
            aria-label={`Pick ${label.toLowerCase()}`}
          />
        </div>
        <TextInput
          id={fieldId}
          value={value}
          onChange={(_event, nextValue) => onChange(nextValue)}
          placeholder={placeholder}
          aria-label={`${label} value`}
          validated={validated}
        />
      </div>
    </FormGroup>
  )
}
