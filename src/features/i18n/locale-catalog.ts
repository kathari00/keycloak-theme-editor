/**
 * The locales Keycloak's base login theme already ships translations for.
 *
 * Source of truth: `locales=` in `theme/base/login/theme.properties` of the
 * `keycloak-themes` artifact (verified against 26.6.4). Because every tag here
 * has a full `messages_<suffix>.properties` in the base theme, a generated
 * theme only has to override its own keys - all standard Keycloak text is
 * inherited through the parent chain.
 *
 * Keep this list in sync with the Keycloak version pinned in
 * `tools/sync-keycloak-config.json`; `npm run sync:keycloak` warns about drift.
 */

/** Locale tag as used in `locales=` and in Keycloak's `locale.currentLanguageTag`. */
export interface CuratedLocale {
  tag: string
  /** Filename suffix: `messages_<messagesSuffix>.properties`. */
  messagesSuffix: string
  englishLabel: string
  /** Right-to-left script. Keycloak flips `dir` on its own via `locale.rtl`. */
  rtl: boolean
}

export const DEFAULT_LOCALE_TAG = 'en'

/**
 * `[tag, englishLabel, messagesSuffixOverride?]`.
 *
 * The bundle suffix is the tag with `-` replaced by `_`, except for Chinese:
 * Keycloak declares the region tags `zh-CN` / `zh-TW` but ships script-based
 * bundles (`messages_zh_Hans` / `messages_zh_Hant`), which Java's
 * `ResourceBundle` candidate-locale rules resolve for it.
 */
const CATALOG: ReadonlyArray<readonly [string, string, string?]> = [
  ['ar', 'Arabic'],
  ['az', 'Azerbaijani'],
  ['ca', 'Catalan'],
  ['cs', 'Czech'],
  ['da', 'Danish'],
  ['de', 'German'],
  ['el', 'Greek'],
  ['en', 'English'],
  ['es', 'Spanish'],
  ['eu', 'Basque'],
  ['fa', 'Persian'],
  ['fi', 'Finnish'],
  ['fr', 'French'],
  ['hr', 'Croatian'],
  ['hu', 'Hungarian'],
  ['hy', 'Armenian'],
  ['id', 'Indonesian'],
  ['it', 'Italian'],
  ['ja', 'Japanese'],
  ['kk', 'Kazakh'],
  ['ko', 'Korean'],
  ['ky', 'Kyrgyz'],
  ['lt', 'Lithuanian'],
  ['lv', 'Latvian'],
  ['nl', 'Dutch'],
  ['no', 'Norwegian'],
  ['pl', 'Polish'],
  ['pt', 'Portuguese'],
  ['pt-BR', 'Portuguese (Brazil)'],
  ['ro', 'Romanian'],
  ['ru', 'Russian'],
  ['sk', 'Slovak'],
  ['sl', 'Slovenian'],
  ['sv', 'Swedish'],
  ['th', 'Thai'],
  ['tr', 'Turkish'],
  ['uk', 'Ukrainian'],
  ['zh-CN', 'Chinese (Simplified)', 'zh_Hans'],
  ['zh-TW', 'Chinese (Traditional)', 'zh_Hant'],
]

const RTL_TAGS = new Set(['ar', 'fa'])

export const CURATED_LOCALES: readonly CuratedLocale[] = CATALOG.map(([tag, englishLabel, suffix]) => ({
  tag,
  messagesSuffix: suffix ?? tag.replace(/-/g, '_'),
  englishLabel,
  rtl: RTL_TAGS.has(tag),
}))

const BY_TAG = new Map(CURATED_LOCALES.map(locale => [locale.tag, locale]))
const BY_SUFFIX = new Map(CURATED_LOCALES.map(locale => [locale.messagesSuffix, locale]))

export function isCuratedLocale(tag: string): boolean {
  return BY_TAG.has(tag)
}

export function findCuratedLocale(tag: string): CuratedLocale | undefined {
  return BY_TAG.get(tag)
}

/** `de` -> `de`, `pt-BR` -> `pt_BR`, `zh-CN` -> `zh_Hans`. */
export function propertiesSuffixForLocale(tag: string): string {
  return BY_TAG.get(tag)?.messagesSuffix ?? tag.replace(/-/g, '_')
}

/** Inverse of {@link propertiesSuffixForLocale}, for reading imported themes. */
export function localeTagForPropertiesSuffix(suffix: string): string {
  return BY_SUFFIX.get(suffix)?.tag ?? suffix.replace(/_/g, '-')
}

export function isRtlLocale(tag: string): boolean {
  return BY_TAG.get(tag)?.rtl ?? false
}

/**
 * Native language name for the editor's own language picker, e.g. `Deutsch`.
 * Keycloak builds the login dropdown labels itself, so this is display-only.
 */
export function localeNativeName(tag: string): string {
  const englishLabel = BY_TAG.get(tag)?.englishLabel ?? tag
  try {
    const displayNames = new Intl.DisplayNames([tag], { type: 'language' })
    return displayNames.of(tag) ?? englishLabel
  }
  catch {
    return englishLabel
  }
}
