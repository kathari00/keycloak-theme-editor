import { describe, expect, it } from 'vitest'
import { parseQuickSettingsFromImportedTheme } from '../quick-settings-import'

describe('quick-settings-import parser', () => {
  it('collects quickstart variables from @layer and @container blocks', () => {
    const parsed = parseQuickSettingsFromImportedTheme({
      quickStartCss: '',
      stylesCss: `@layer defaults {
  :root {
    --quickstart-secondary-color: #dddddd;
  }

  @container (min-width: 30rem) {
    html:not(.pf-v5-theme-dark) {
      --quickstart-primary-color: #112233;
    }

    html.pf-v5-theme-dark {
      --quickstart-primary-color: #445566;
    }
  }
}`,
      customCss: '',
      messagesPropertiesText: '',
    })

    expect(parsed?.light?.colorPresetPrimaryColor).toBe('#112233')
    expect(parsed?.dark?.colorPresetPrimaryColor).toBe('#445566')
    expect(parsed?.light?.colorPresetSecondaryColor).toBe('#dddddd')
    expect(parsed?.dark?.colorPresetSecondaryColor).toBe('#dddddd')
  })

  it('ignores commented quickstart variables', () => {
    const parsed = parseQuickSettingsFromImportedTheme({
      quickStartCss: '',
      stylesCss: `:root {
  /* --quickstart-primary-color: #ff0000; */
  --quickstart-secondary-color: #00ff00;
}`,
      customCss: '',
      messagesPropertiesText: '',
    })

    expect(parsed?.light?.colorPresetPrimaryColor).toBe('#0066cc')
    expect(parsed?.dark?.colorPresetPrimaryColor).toBe('#0066cc')
    expect(parsed?.light?.colorPresetSecondaryColor).toBe('#00ff00')
  })
})
