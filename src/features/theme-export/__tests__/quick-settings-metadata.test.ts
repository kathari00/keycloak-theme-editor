import { describe, expect, it } from 'vitest'
import {
  parseQuickSettingsMetadataFromProperties,
  withQuickSettingsMetadata,
} from '../quick-settings-metadata'

describe('quick settings metadata', () => {
  it('writes and reads quick settings metadata for both modes', () => {
    const properties = 'parent=keycloak.v2\nstyles=css/styles.css\n'
    const withMetadata = withQuickSettingsMetadata(properties, {
      light: { colorPresetPrimaryColor: '#123456' },
      dark: { colorPresetPrimaryColor: '#abcdef' },
    })

    const parsed = parseQuickSettingsMetadataFromProperties(withMetadata)

    expect(parsed?.light?.colorPresetPrimaryColor).toBe('#123456')
    expect(parsed?.dark?.colorPresetPrimaryColor).toBe('#abcdef')
  })

  it('returns undefined when metadata is missing', () => {
    const parsed = parseQuickSettingsMetadataFromProperties('parent=keycloak.v2\n')
    expect(parsed).toBeUndefined()
  })
})

