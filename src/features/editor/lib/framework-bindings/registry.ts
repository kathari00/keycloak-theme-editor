import type { BootstrapVariantId, FrameworkBinding, FrameworkId } from './types'
import { BOOTSTRAP_BINDING } from './bootstrap'
import { getFrameworkBindingMetadata } from './metadata'
import { NATIVE_BINDING } from './types'

export { getFrameworkBindingMetadata } from './metadata'

export const BOOTSTRAP_VARIANTS: readonly { id: BootstrapVariantId, label: string }[] = [
  { id: 'default', label: 'Default' },
  ...(['brite', 'cerulean', 'cosmo', 'cyborg', 'darkly', 'flatly', 'journal', 'litera', 'lumen', 'lux', 'materia', 'minty', 'morph', 'pulse', 'quartz', 'sandstone', 'simplex', 'sketchy', 'slate', 'solar', 'spacelab', 'superhero', 'united', 'vapor', 'yeti', 'zephyr'] as const)
    .map(id => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) })),
]

interface CssModule { default: string }
type CssLoader = () => Promise<CssModule>

// Explicit imports are intentional: Vite turns each selected stylesheet into its own lazy chunk.
// A glob would be shorter, but would leave import.meta.glob in the Node-executed export path.
const bootstrapCssLoaders: Record<BootstrapVariantId, CssLoader> = {
  default: () => import('bootstrap/dist/css/bootstrap.min.css?raw'),
  brite: () => import('bootswatch/dist/brite/bootstrap.min.css?raw'),
  cerulean: () => import('bootswatch/dist/cerulean/bootstrap.min.css?raw'),
  cosmo: () => import('bootswatch/dist/cosmo/bootstrap.min.css?raw'),
  cyborg: () => import('bootswatch/dist/cyborg/bootstrap.min.css?raw'),
  darkly: () => import('bootswatch/dist/darkly/bootstrap.min.css?raw'),
  flatly: () => import('bootswatch/dist/flatly/bootstrap.min.css?raw'),
  journal: () => import('bootswatch/dist/journal/bootstrap.min.css?raw'),
  litera: () => import('bootswatch/dist/litera/bootstrap.min.css?raw'),
  lumen: () => import('bootswatch/dist/lumen/bootstrap.min.css?raw'),
  lux: () => import('bootswatch/dist/lux/bootstrap.min.css?raw'),
  materia: () => import('bootswatch/dist/materia/bootstrap.min.css?raw'),
  minty: () => import('bootswatch/dist/minty/bootstrap.min.css?raw'),
  morph: () => import('bootswatch/dist/morph/bootstrap.min.css?raw'),
  pulse: () => import('bootswatch/dist/pulse/bootstrap.min.css?raw'),
  quartz: () => import('bootswatch/dist/quartz/bootstrap.min.css?raw'),
  sandstone: () => import('bootswatch/dist/sandstone/bootstrap.min.css?raw'),
  simplex: () => import('bootswatch/dist/simplex/bootstrap.min.css?raw'),
  sketchy: () => import('bootswatch/dist/sketchy/bootstrap.min.css?raw'),
  slate: () => import('bootswatch/dist/slate/bootstrap.min.css?raw'),
  solar: () => import('bootswatch/dist/solar/bootstrap.min.css?raw'),
  spacelab: () => import('bootswatch/dist/spacelab/bootstrap.min.css?raw'),
  superhero: () => import('bootswatch/dist/superhero/bootstrap.min.css?raw'),
  united: () => import('bootswatch/dist/united/bootstrap.min.css?raw'),
  vapor: () => import('bootswatch/dist/vapor/bootstrap.min.css?raw'),
  yeti: () => import('bootswatch/dist/yeti/bootstrap.min.css?raw'),
  zephyr: () => import('bootswatch/dist/zephyr/bootstrap.min.css?raw'),
}

const bindingCache = new Map<string, Promise<FrameworkBinding>>()

export function extractBootstrapDarkModeBinding(frameworkCss: string): string {
  const marker = '[data-bs-theme=dark]'
  const rules: string[] = []
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g
  for (let match = rulePattern.exec(frameworkCss); match !== null; match = rulePattern.exec(frameworkCss)) {
    const selector = match[1].trim()
    if (!selector.includes(marker))
      continue

    // Bootstrap keys dark mode off a data attribute; Keycloak themes expose a class instead.
    // Rewriting the selector (rather than copying only the root declarations) also activates the
    // dark control, switch, dropdown and variant-specific rules shipped by Bootswatch.
    rules.push(`${selector.replaceAll(marker, '.kcDarkModeClass')}{${match[2]}}`)
  }

  return rules.join('\n')
}

const bootstrapVariantBindingCss: Partial<Record<BootstrapVariantId, string>> = {
  // Cerulean paints literal blue gradients on top of --bs-btn-bg. Rebuild those gradients from
  // the quick-start token so selecting a primary color still works without flattening the swatch.
  cerulean: `
.btn-primary {
  background-image: linear-gradient(
    color-mix(in srgb, var(--quickstart-primary-color) 78%, white),
    var(--quickstart-primary-color) 60%,
    color-mix(in srgb, var(--quickstart-primary-color) 92%, black)
  );
}
.btn-primary:hover,
.btn-primary:focus,
.btn-primary:active {
  background-image: linear-gradient(
    color-mix(in srgb, var(--quickstart-primary-color) 88%, black),
    color-mix(in srgb, var(--quickstart-primary-color) 88%, black) 60%,
    color-mix(in srgb, var(--quickstart-primary-color) 78%, black)
  );
}
`,
}

// Local generated copies, not `?raw` imports from the packages: Vite's CSS pipeline resolves
// a package `?raw` import to an empty module under Vitest. See `npm run generate:*`.
const frameworkCssLoaders: Partial<Record<FrameworkId, () => Promise<[CssModule, CssModule]>>> = {
  bulma: () => Promise.all([import('./bulma.generated.css?raw'), import('./bulma-tokens.css?raw')]),
  carbon: () => Promise.all([import('./carbon.generated.css?raw'), import('./carbon-tokens.css?raw')]),
}

export function loadFrameworkBinding(
  frameworkId: FrameworkId,
  bootstrapVariantId: BootstrapVariantId = 'default',
): Promise<FrameworkBinding> {
  const loadCss = frameworkCssLoaders[frameworkId]
  if (loadCss) {
    return loadCss().then(([frameworkCss, bindingCss]) => ({
      ...getFrameworkBindingMetadata(frameworkId),
      frameworkCss: frameworkCss.default,
      bindingCss: bindingCss.default,
    }))
  }
  if (frameworkId !== 'bootstrap') {
    return Promise.resolve(NATIVE_BINDING)
  }

  const variantId = bootstrapCssLoaders[bootstrapVariantId] ? bootstrapVariantId : 'default'
  const cacheKey = `${frameworkId}:${variantId}`
  let binding = bindingCache.get(cacheKey)
  if (!binding) {
    binding = Promise.all([
      bootstrapCssLoaders[variantId](),
      import('./bootstrap-tokens.css?raw'),
    ]).then(([frameworkCss, bindingCss]) => ({
      ...BOOTSTRAP_BINDING,
      label: variantId === 'default' ? 'Bootstrap' : `Bootstrap – ${BOOTSTRAP_VARIANTS.find(item => item.id === variantId)?.label ?? variantId}`,
      frameworkCss: frameworkCss.default,
      bindingCss: [
        bindingCss.default,
        extractBootstrapDarkModeBinding(frameworkCss.default),
        bootstrapVariantBindingCss[variantId],
      ].filter(Boolean).join('\n'),
    })).catch((error: unknown) => {
      // Don't let a transient load failure (e.g. a bad chunk fetch) poison the cache forever.
      bindingCache.delete(cacheKey)
      throw error
    })
    // Only the active variant's CSS (~200-300KB) is ever rendered at once - drop the rest rather
    // than accumulating every variant the user has ever previewed for the life of the session.
    bindingCache.clear()
    bindingCache.set(cacheKey, binding)
  }
  return binding
}

export function extractBootstrapDefaultColors(
  frameworkCss: string,
): { primaryColor: string, secondaryColor: string } {
  const readVariable = (name: string, fallback: string) =>
    frameworkCss.match(new RegExp(`${name}:\\s*([^;}]+)`))?.[1]?.trim() ?? fallback

  return {
    primaryColor: readVariable('--bs-primary', '#0d6efd'),
    secondaryColor: readVariable('--bs-secondary', '#6c757d'),
  }
}

export async function loadBootstrapVariantDefaultColors(
  bootstrapVariantId: BootstrapVariantId,
): Promise<{ primaryColor: string, secondaryColor: string }> {
  const binding = await loadFrameworkBinding('bootstrap', bootstrapVariantId)
  return extractBootstrapDefaultColors(binding.frameworkCss)
}
