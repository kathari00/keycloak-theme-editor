import { DEFAULT_LOCALE_TAG, localeTagForPropertiesSuffix } from '../src/features/i18n/locale-catalog'

/** `theme/<upstream>/login/messages/messages_<suffix>.properties` */
const LOGIN_MESSAGES_ENTRY_RE = /^theme\/([^/]+)\/login\/messages\/messages_([A-Z_]+)\.properties$/i

export interface LoginMessagesEntry {
  upstreamThemeId: string
  /** Bundle suffix as it appears in the filename, e.g. `pt_BR` or `zh_Hans`. */
  suffix: string
  localeTag: string
}

export function isLoginMessagesEntry(entryName: string): boolean {
  return LOGIN_MESSAGES_ENTRY_RE.test(entryName)
}

export function parseLoginMessagesEntry(entryName: string): LoginMessagesEntry | null {
  const match = entryName.match(LOGIN_MESSAGES_ENTRY_RE)
  if (!match) {
    return null
  }
  return {
    upstreamThemeId: match[1],
    suffix: match[2],
    localeTag: localeTagForPropertiesSuffix(match[2]),
  }
}

/**
 * Groups translation bundles by upstream theme id, keeping only the themes we
 * sync. The base language is excluded because it is synced from the tagged
 * sources alongside the templates.
 */
export function selectLocaleBundles(
  entries: Record<string, Uint8Array>,
  wantedUpstreamThemeIds: Iterable<string>,
): Map<string, Map<string, string>> {
  const wanted = new Set(wantedUpstreamThemeIds)
  const decoder = new TextDecoder()
  const byTheme = new Map<string, Map<string, string>>()

  for (const [entryName, data] of Object.entries(entries)) {
    const entry = parseLoginMessagesEntry(entryName)
    if (!entry || !wanted.has(entry.upstreamThemeId) || entry.localeTag === DEFAULT_LOCALE_TAG) {
      continue
    }

    const bundles = byTheme.get(entry.upstreamThemeId) ?? new Map<string, string>()
    bundles.set(entry.suffix, decoder.decode(data))
    byTheme.set(entry.upstreamThemeId, bundles)
  }

  return byTheme
}
