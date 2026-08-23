/**
 * Keycloak's theme.properties maps CSS-hook keys (`kcAlertClass`, `kcLogoIdP-google`,
 * ...) to real framework class strings. Our own overlay CSS and the click-to-select
 * editor UI need a *stable* class to target regardless of which PatternFly version
 * a variant pulls in, so every vendored theme.properties prefixes each hook value
 * with the key itself: `kcAlertClass=kcAlertClass pf-v5-c-alert ...`.
 *
 * Verified against the real base/v2 theme.properties shipped in keycloak-themes
 * 26.6.4: every single `kc*`-prefixed key follows this rule with no exceptions
 * (107/107 keys for base, 118/118 for v2).
 */

const CLASS_HOOK_KEY_RE = /^kc/

export function isClassHookKey(key: string): boolean {
  return CLASS_HOOK_KEY_RE.test(key)
}

/**
 * `expandClassHookValue('kcAlertClass', 'pf-v5-c-alert pf-m-inline')`
 * -> `'kcAlertClass pf-v5-c-alert pf-m-inline'`
 *
 * Idempotent: a value that already starts with the key (e.g. re-running the
 * transform on already-adapted content) is returned unchanged.
 */
export function expandClassHookValue(key: string, realValue: string): string {
  const trimmed = realValue.trim()
  if (!trimmed) {
    return key
  }
  return trimmed === key || trimmed.startsWith(`${key} `) ? trimmed : `${key} ${trimmed}`
}
