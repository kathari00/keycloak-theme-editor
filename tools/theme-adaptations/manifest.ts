/**
 * Single source of truth for which theme ids under
 * `public/keycloak-dev-resources/themes/` are generated from upstream Keycloak
 * (safe to regenerate on a version bump, guarded by `vendor:check`) versus
 * fully our own, hand-authored presets that no sync process may ever touch.
 *
 * This is the boundary automation is allowed to cross. Anything not listed
 * under `vendorAdapted` gets no help from this tooling and no drift-check -
 * that's the point, it protects hand-authored work from being overwritten.
 */
export interface VendorAdaptedTheme {
  /** Theme id under `public/keycloak-dev-resources/themes/<id>`. */
  id: string
  /** Upstream theme id as published by Keycloak (see sync-keycloak-config.json). */
  upstream: string
  hasTemplateFtl: boolean
  hasFooterFtl: boolean
}

export const VENDOR_ADAPTED_THEMES: readonly VendorAdaptedTheme[] = [
  { id: 'base', upstream: 'base', hasTemplateFtl: false, hasFooterFtl: false },
  { id: 'v2', upstream: 'keycloak.v2', hasTemplateFtl: true, hasFooterFtl: true },
]

/** Fully hand-authored presets. Never read by sync or vendor-adaptation tooling. */
export const HAND_AUTHORED_THEMES: readonly string[] = ['modern-card', 'horizontal-card']

const overlap = VENDOR_ADAPTED_THEMES.map(t => t.id).filter(id => HAND_AUTHORED_THEMES.includes(id))
if (overlap.length > 0) {
  throw new Error(
    `Theme id(s) ${overlap.join(', ')} listed as both vendor-adapted and hand-authored in `
    + `tools/theme-adaptations/manifest.ts - this boundary must be unambiguous.`,
  )
}
