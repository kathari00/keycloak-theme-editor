export type FrameworkId = 'native' | 'bootstrap' | 'bulma' | 'carbon'

export type BootstrapVariantId
  = | 'default'
    | 'brite'
    | 'cerulean'
    | 'cosmo'
    | 'cyborg'
    | 'darkly'
    | 'flatly'
    | 'journal'
    | 'litera'
    | 'lumen'
    | 'lux'
    | 'materia'
    | 'minty'
    | 'morph'
    | 'pulse'
    | 'quartz'
    | 'sandstone'
    | 'simplex'
    | 'sketchy'
    | 'slate'
    | 'solar'
    | 'spacelab'
    | 'superhero'
    | 'united'
    | 'vapor'
    | 'yeti'
    | 'zephyr'

export const DEFAULT_FRAMEWORK_ID: FrameworkId = 'native'
export const DEFAULT_BOOTSTRAP_VARIANT_ID: BootstrapVariantId = 'default'

/** Quick Start values a framework's own look expects, applied when the user switches to it. */
export interface FrameworkQuickStartDefaults {
  /** Font stack to fall back to on export when the theme has no explicit font of its own. */
  fontFamily: string
  /** Omitted where the palette is read from the framework's compiled CSS instead (Bootstrap variants). */
  primaryColor?: string
  secondaryColor?: string
  borderRadius?: 'sharp' | 'rounded' | 'pill'
  cardShadow?: 'none' | 'subtle' | 'strong'
}

/** Root-element attribute a framework keys its own light/dark palette off. */
export interface FrameworkColorSchemeAttribute {
  name: string
  light: string
  dark: string
}

export interface FrameworkBinding {
  id: FrameworkId
  label: string
  /** Raw CSS text of the framework's own compiled stylesheet. */
  frameworkCss: string
  /** Hand-authored CSS binding our `--quickstart-*` tokens onto the framework's own variables. */
  bindingCss: string
  /** Prefix of the framework's own CSS variables, for editor autocomplete. */
  cssVariablePrefix?: string
  /** Theme-relative path of this framework's editable override file. */
  customCssPath?: string
  defaults?: FrameworkQuickStartDefaults
  colorSchemeAttribute?: FrameworkColorSchemeAttribute
  /**
   * `kc*Class` theme.properties key -> framework classes to append. Mirrors how `v2` layers
   * PatternFly classes onto the same bare `kc*Class` hooks (`kcButtonClass=kcButtonClass pf-v5-c-button`)
   * rather than replacing them, so any theme-authored `.kcButtonClass` CSS still applies too.
   */
  classMap: Record<string, string>
}

export const NATIVE_BINDING: FrameworkBinding = {
  id: 'native',
  label: 'Native (theme default)',
  frameworkCss: '',
  bindingCss: '',
  classMap: {},
}

/**
 * Lives here rather than in `registry.ts` so callers that only need this pure text transform
 * (e.g. the Node-executed export pipeline in `tools/build-theme-fixture.ts`) don't have to pull
 * in `bootstrap.ts`'s Vite-only `?raw` CSS imports, which `tsx` can't load.
 */
export function buildFrameworkThemeProperties(baseProperties: string, binding: FrameworkBinding): string {
  if (binding.id === 'native' || !baseProperties) {
    return baseProperties
  }

  const lines = baseProperties.split(/\r?\n/)
  const nextLines = lines.map((line) => {
    const match = line.match(/^(\w+)=(.*)$/)
    if (!match) {
      return line
    }

    const [, key, value] = match
    const appendClasses = binding.classMap[key]
    if (!appendClasses) {
      return line
    }

    return `${key}=${value} ${appendClasses}`
  })

  return nextLines.join('\n')
}
