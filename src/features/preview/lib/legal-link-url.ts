function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  }
  catch {
    return false
  }
}

export function isValidExternalLegalLinkUrl(url: string): boolean {
  return isHttpUrl(url.trim())
}

export function normalizeExternalLegalLinkUrl(url: string): string {
  const trimmed = url.trim()
  return isHttpUrl(trimmed) ? trimmed : ''
}

export function resolveOpenableLegalLinkUrl(url: string): string | null {
  const trimmed = url.trim()
  return isHttpUrl(trimmed) ? trimmed : null
}
