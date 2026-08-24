import { BASE_CLASS_HOOK_KEYS, BASE_CLASS_HOOK_OVERRIDES } from './base-class-hook-keys'
import { expandClassHookValue } from './class-hook-properties'
import { applyUnifiedDiff } from './patch'

function parsePropertiesMap(text: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const idx = line.indexOf('=')
    if (idx <= 0) {
      continue
    }
    map.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim())
  }
  return map
}

/** v2's theme.properties is base's hook vocabulary filtered to whatever v2's pristine source declares - verified against real 26.6.4 files. */
export function adaptV2ThemeProperties(pristineText: string): string {
  const pristine = parsePropertiesMap(pristineText)
  const header = [
    '# Keycloak v2 theme',
    'parent=keycloak.v2',
    'import=common/keycloak',
    'darkMode=true',
    'styles=css/quick-start.css css/styles.css',
    '',
  ]

  const hookLines = BASE_CLASS_HOOK_KEYS.filter(key => pristine.has(key)).map((key) => {
    const pristineValue = pristine.get(key)!
    return `${key}=${expandClassHookValue(key, pristineValue)}`
  })

  const unknownPristineHooks = [...pristine.keys()].filter(key => key.startsWith('kc') && !BASE_CLASS_HOOK_KEYS.includes(key))
  if (unknownPristineHooks.length > 0) {
    throw new Error(
      `Pristine keycloak.v2/theme.properties declares hook key(s) not in BASE_CLASS_HOOK_KEYS: ${unknownPristineHooks.join(', ')}. `
      + `Keycloak likely added a new CSS hook - add it to tools/theme-adaptations/base-class-hook-keys.ts.`,
    )
  }

  return [...header, ...hookLines].join('\n')
}

/** Structural edits that don't reduce to key-value rules, so they're stored as real patches - a clean apply is the freshness signal. */
export function adaptV2Template(pristineText: string, patchText: string): string {
  return applyUnifiedDiff(pristineText, patchText, 'v2/template.ftl')
}

export function adaptV2Footer(pristineText: string, patchText: string): string {
  return applyUnifiedDiff(pristineText, patchText, 'v2/footer.ftl')
}

/** Not derived from upstream - real Keycloak's base theme is abstract with no hooks; this is our own authored vocabulary (BASE_CLASS_HOOK_KEYS). */
export function buildBaseThemeProperties(): string {
  const header = [
    '# Base Keycloak theme',
    'parent=base',
    'import=common/keycloak',
    'darkMode=true',
    'styles=css/quick-start.css css/styles.css',
    '',
  ]
  const hooks = BASE_CLASS_HOOK_KEYS.map(key =>
    `${key}=${expandClassHookValue(key, BASE_CLASS_HOOK_OVERRIDES[key] ?? key)}`)

  return [...header, ...hooks].join('\n')
}
