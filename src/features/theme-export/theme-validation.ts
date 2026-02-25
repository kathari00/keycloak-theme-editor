const THEME_NAME_REGEX = /^[\w-]+$/

/** Validate a theme name and return an error message, or empty string if valid */
export function getThemeNameError(name: string): string {
  if (!name.trim()) {
    return 'Theme name is required'
  }
  if (!THEME_NAME_REGEX.test(name)) {
    return 'Theme name can only contain letters, numbers, hyphens, and underscores'
  }
  return ''
}
