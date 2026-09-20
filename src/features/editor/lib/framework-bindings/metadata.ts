import type { FrameworkBinding, FrameworkId } from './types'
import { BOOTSTRAP_BINDING } from './bootstrap'
import { BULMA_BINDING } from './bulma'
import { CARBON_BINDING } from './carbon'
import { NATIVE_BINDING } from './types'

/**
 * Every binding's metadata, without the CSS. Separate from `registry.ts` so the Node-executed
 * export path can read per-framework facts without pulling in its Vite-only `?raw` imports.
 */
export const FRAMEWORK_BINDINGS: readonly FrameworkBinding[] = [
  NATIVE_BINDING,
  BOOTSTRAP_BINDING,
  BULMA_BINDING,
  CARBON_BINDING,
]

export function getFrameworkBindingMetadata(frameworkId: FrameworkId): FrameworkBinding {
  return FRAMEWORK_BINDINGS.find(binding => binding.id === frameworkId) ?? NATIVE_BINDING
}
