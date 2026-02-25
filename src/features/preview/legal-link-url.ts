function parseAbsoluteHttpUrl(url: string): URL | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed
    }
  }
  catch {
    return null
  }
  return null
}

export function isValidExternalLegalLinkUrl(url: string): boolean {
  const normalized = (url || '').trim()
  if (!normalized) {
    return false
  }
  return Boolean(parseAbsoluteHttpUrl(normalized))
}

export function normalizeExternalLegalLinkUrl(url: string): string {
  const normalized = (url || '').trim()
  if (!normalized) {
    return ''
  }

  if (isValidExternalLegalLinkUrl(normalized)) {
    return normalized
  }

  return ''
}

export function resolveOpenableLegalLinkUrl(url: string): string | null {
  const normalized = normalizeExternalLegalLinkUrl(url)
  return normalized || null
}
