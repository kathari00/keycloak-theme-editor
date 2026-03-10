import { describe, expect, it } from 'vitest'
import { parseQuickSettingsFromImportedTheme } from '../quick-settings-import'

describe('quick-settings-import parser', () => {
  it('collects quickstart variables from @layer and @container blocks', () => {
    const parsed = parseQuickSettingsFromImportedTheme({
      quickStartCss: '',
      stylesCss: `@layer defaults {
  :root {
    --quickstart-secondary-color-light: #dddddd;
    --quickstart-secondary-color-dark: #dddddd;
    --quickstart-secondary-color: var(--quickstart-secondary-color-light);
  }

  @container (min-width: 30rem) {
    html:not(.pf-v5-theme-dark) {
      --quickstart-primary-color-light: #112233;
      --quickstart-primary-color: var(--quickstart-primary-color-light);
    }

    html.pf-v5-theme-dark {
      --quickstart-primary-color-dark: #445566;
      --quickstart-primary-color: var(--quickstart-primary-color-dark);
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
  /* --quickstart-primary-color-light: #ff0000; */
  --quickstart-secondary-color-light: #00ff00;
  --quickstart-secondary-color-dark: #00ff00;
  --quickstart-secondary-color: var(--quickstart-secondary-color-light);
}`,
      customCss: '',
      messagesPropertiesText: '',
    })

    expect(parsed?.light?.colorPresetPrimaryColor).toBe('#0066cc')
    expect(parsed?.dark?.colorPresetPrimaryColor).toBe('#0066cc')
    expect(parsed?.light?.colorPresetSecondaryColor).toBe('#00ff00')
  })

  it('reads paired light and dark quickstart color variables by mode', () => {
    const parsed = parseQuickSettingsFromImportedTheme({
      quickStartCss: `:root {
  --quickstart-primary-color-light: #123456;
  --quickstart-primary-color-dark: #abcdef;
  --quickstart-primary-color: var(--quickstart-primary-color-light);
  --quickstart-secondary-color-light: #111111;
  --quickstart-secondary-color-dark: #222222;
  --quickstart-secondary-color: var(--quickstart-secondary-color-light);
  --quickstart-bg-color-light: #f0f4f9;
  --quickstart-bg-color-dark: #1e1f20;
  --quickstart-bg-color: var(--quickstart-bg-color-light);
}`,
      stylesCss: '',
      customCss: '',
      messagesPropertiesText: '',
    })

    expect(parsed?.light?.colorPresetPrimaryColor).toBe('#123456')
    expect(parsed?.dark?.colorPresetPrimaryColor).toBe('#abcdef')
    expect(parsed?.light?.colorPresetSecondaryColor).toBe('#111111')
    expect(parsed?.dark?.colorPresetSecondaryColor).toBe('#222222')
    expect(parsed?.light?.colorPresetBgColor).toBe('#f0f4f9')
    expect(parsed?.dark?.colorPresetBgColor).toBe('#1e1f20')
  })
})
