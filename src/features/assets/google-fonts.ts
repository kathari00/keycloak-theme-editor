interface GoogleFont {
  family: string
  weights?: number[]
}

const GOOGLE_FONT_ID_PREFIX = 'google:'

export const GOOGLE_FONTS: GoogleFont[] = [
  { family: 'Inter', weights: [300, 400, 500, 600, 700] },
  { family: 'Roboto', weights: [300, 400, 500, 700] },
  { family: 'Open Sans', weights: [300, 400, 600, 700] },
  { family: 'Lato', weights: [300, 400, 700] },
  { family: 'Montserrat', weights: [300, 400, 500, 600, 700] },
  { family: 'Poppins', weights: [300, 400, 500, 600, 700] },
  { family: 'Source Sans 3', weights: [300, 400, 600, 700] },
  { family: 'Raleway', weights: [300, 400, 500, 600, 700] },
  { family: 'Nunito', weights: [300, 400, 600, 700] },
  { family: 'Oswald', weights: [300, 400, 500, 600, 700] },
]

function buildFamilyQuery(font: GoogleFont): string {
  const family = font.family.replace(/\s+/g, '+')
  if (!font.weights || font.weights.length === 0) {
    return `family=${family}`
  }
  return `family=${family}:wght@${font.weights.join(';')}`
}

function buildGoogleFontsHref(fonts: GoogleFont[] = GOOGLE_FONTS): string {
  const families = fonts.map(buildFamilyQuery).join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

export function buildGoogleFontOptions() {
  return GOOGLE_FONTS.map(font => ({
    id: `'${font.family}', sans-serif`,
    label: `${font.family} (Google)`,
  }))
}

export function toGoogleFontId(family: string): string {
  return `${GOOGLE_FONT_ID_PREFIX}${family}`
}

export function getGoogleFontFamilyFromId(id?: string): string | null {
  if (!id)
    return null
  if (!id.startsWith(GOOGLE_FONT_ID_PREFIX))
    return null
  return id.slice(GOOGLE_FONT_ID_PREFIX.length).trim() || null
}

export function normalizeGoogleFontFamily(family: string): string | null {
  const normalized = family.trim()
  const match = GOOGLE_FONTS.find(
    font => font.family.toLowerCase() === normalized.toLowerCase(),
  )
  return match ? match.family : null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractGoogleFontsFromCss(cssText: string): string[] {
  if (!cssText)
    return []
  return GOOGLE_FONTS
    .map(font => font.family)
    .filter(family =>
      new RegExp(`font-family\\s*:[^;]*${escapeRegExp(family)}`, 'i').test(cssText),
    )
}

export function buildGoogleFontsImportCSS(families: string[]): string {
  if (!families.length)
    return ''
  const fonts = GOOGLE_FONTS.filter(font => families.includes(font.family))
  if (!fonts.length)
    return ''
  return `@import url('${buildGoogleFontsHref(fonts)}');`
}
