export type QuickSettingsMode = 'light' | 'dark'
export type QuickSettingsModeInput = QuickSettingsMode | boolean | undefined

export const DEFAULT_THEME_ID = 'v2'

export function resolveQuickSettingsMode(mode: QuickSettingsModeInput): QuickSettingsMode {
  return mode === 'dark' || mode === true ? 'dark' : 'light'
}

export function getThemeStorageKey(themeId: string | null | undefined): string {
  return (themeId || '').trim() || DEFAULT_THEME_ID
}

export function buildQuickSettingsStorageKey(themeId: string, mode: QuickSettingsModeInput): string {
  return `${getThemeStorageKey(themeId)}::${resolveQuickSettingsMode(mode)}`
}
