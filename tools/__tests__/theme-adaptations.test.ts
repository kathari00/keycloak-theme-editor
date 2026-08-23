import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import {
  adaptV2Footer,
  adaptV2Template,
  adaptV2ThemeProperties,
  buildBaseThemeProperties,
} from '../theme-adaptations/adapt-vendor-theme'
import { BASE_CLASS_HOOK_KEYS } from '../theme-adaptations/base-class-hook-keys'
import { expandClassHookValue, isClassHookKey } from '../theme-adaptations/class-hook-properties'
import { HAND_AUTHORED_THEMES, VENDOR_ADAPTED_THEMES } from '../theme-adaptations/manifest'
import { applyUnifiedDiff } from '../theme-adaptations/patch'

describe('manifest', () => {
  it('never lists a theme id as both vendor-adapted and hand-authored', () => {
    // The module itself throws on import if these overlap (see manifest.ts),
    // but only apply-vendor-adaptations.ts imports it today - nothing in the
    // normal `npm run test:run` suite otherwise exercises that guard. This
    // test's job is just to force the import so the check actually runs here.
    const vendorIds = VENDOR_ADAPTED_THEMES.map(theme => theme.id)
    expect(vendorIds.some(id => HAND_AUTHORED_THEMES.includes(id))).toBe(false)
  })
})

describe('isClassHookKey', () => {
  it('recognizes any kc-prefixed key, not just ones ending in Class', () => {
    expect(isClassHookKey('kcAlertClass')).toBe(true)
    expect(isClassHookKey('kcLogoIdP-google')).toBe(true)
    expect(isClassHookKey('kcError')).toBe(true)
    expect(isClassHookKey('parent')).toBe(false)
    expect(isClassHookKey('styles')).toBe(false)
  })
})

describe('expandClassHookValue', () => {
  it('prefixes a real value with its own key', () => {
    expect(expandClassHookValue('kcAlertClass', 'pf-v5-c-alert pf-m-inline')).toBe('kcAlertClass pf-v5-c-alert pf-m-inline')
  })

  it('falls back to the bare key when there is no real value', () => {
    expect(expandClassHookValue('kcAlertClass', '')).toBe('kcAlertClass')
    expect(expandClassHookValue('kcAlertClass', '   ')).toBe('kcAlertClass')
  })

  it('is idempotent: a value already carrying the key is left alone', () => {
    const once = expandClassHookValue('kcAlertClass', 'pf-v5-c-alert')
    expect(expandClassHookValue('kcAlertClass', once)).toBe(once)
  })
})

describe('applyUnifiedDiff', () => {
  const patch = [
    'diff --git a/x.txt b/x.txt',
    '--- a/x.txt',
    '+++ b/x.txt',
    '@@ -1,3 +1,3 @@',
    ' one',
    '-two',
    '+TWO',
    ' three',
    '',
  ].join('\n')

  it('applies a hunk when context matches', () => {
    expect(applyUnifiedDiff('one\ntwo\nthree', patch)).toBe('one\nTWO\nthree')
  })

  it('throws a precise, line-numbered error when context no longer matches', () => {
    expect(() => applyUnifiedDiff('one\nCHANGED\nthree', patch, 'x.txt'))
      .toThrow(/x\.txt at line 2/)
  })
})

describe('base-class-hook-keys', () => {
  it('lists every key exactly once, alphabetically', () => {
    const sorted = [...BASE_CLASS_HOOK_KEYS].sort((a, b) => a.localeCompare(b))
    expect(BASE_CLASS_HOOK_KEYS).toEqual(sorted)
    expect(new Set(BASE_CLASS_HOOK_KEYS).size).toBe(BASE_CLASS_HOOK_KEYS.length)
  })
})

describe('buildBaseThemeProperties', () => {
  it('emits every hook key as a bare self-reference except the documented dark-mode exception', () => {
    const output = buildBaseThemeProperties()
    expect(output).toContain('kcAlertClass=kcAlertClass\n')
    expect(output).toContain('kcDarkModeClass=kcDarkModeClass pf-v5-theme-dark')
    expect(output.startsWith('# Base Keycloak theme\nparent=base\n')).toBe(true)
  })
})

describe('adaptV2ThemeProperties', () => {
  it('expands hook values and overrides the parent chain, dropping stylesCommon', () => {
    const pristine = [
      'parent=base',
      'stylesCommon=vendor/patternfly-v5/patternfly.min.css',
      'styles=css/styles.css',
      'kcAlertClass=pf-v5-c-alert pf-m-inline',
    ].join('\n')

    const result = adaptV2ThemeProperties(pristine)
    expect(result).toContain('parent=keycloak.v2')
    expect(result).toContain('styles=css/quick-start.css css/styles.css')
    expect(result).not.toContain('stylesCommon')
    expect(result).toContain('kcAlertClass=kcAlertClass pf-v5-c-alert pf-m-inline')
  })

  it('fails loudly when pristine declares a hook key outside the known vocabulary', () => {
    const pristine = 'parent=base\nkcTotallyNewClass=something'
    expect(() => adaptV2ThemeProperties(pristine)).toThrow(/kcTotallyNewClass/)
  })
})

/**
 * The real proof that this adaptation is complete and correct: regenerating
 * from a genuinely synced Keycloak release must reproduce the committed
 * dev-resources files byte-for-byte. This needs `npm run sync:keycloak` to
 * have populated `public/keycloak-upstream` first (a network-touching, manual
 * step - see tools/sync-keycloak.ts), so it's skipped rather than failed when
 * that hasn't happened, keeping the default `test:run` fast and offline.
 */
describe('golden equivalence against a real synced Keycloak release', () => {
  const upstreamV2 = path.join(process.cwd(), 'public/keycloak-upstream/v2/login')
  const devResourcesV2 = path.join(process.cwd(), 'public/keycloak-dev-resources/themes/v2/login')
  const devResourcesBase = path.join(process.cwd(), 'public/keycloak-dev-resources/themes/base/login')
  const hasSyncedUpstream = existsSync(path.join(upstreamV2, 'theme.properties'))

  const maybeIt = hasSyncedUpstream ? it : it.skip

  async function readNormalized(filePath: string): Promise<string> {
    return (await readFile(filePath, 'utf8')).replace(/\r\n/g, '\n').replace(/\n$/, '')
  }

  maybeIt('reproduces base/login/theme.properties exactly', async () => {
    const committed = await readNormalized(path.join(devResourcesBase, 'theme.properties'))
    expect(buildBaseThemeProperties()).toBe(committed)
  })

  maybeIt('reproduces v2/login/theme.properties exactly from pristine', async () => {
    const pristine = await readNormalized(path.join(upstreamV2, 'theme.properties'))
    const committed = await readNormalized(path.join(devResourcesV2, 'theme.properties'))
    expect(adaptV2ThemeProperties(pristine)).toBe(committed)
  })

  maybeIt('reproduces v2/login/template.ftl exactly by applying the stored patch', async () => {
    const pristine = await readNormalized(path.join(upstreamV2, 'template.ftl'))
    const patch = await readFile(path.join(process.cwd(), 'tools/theme-adaptations/patches/v2-template.patch'), 'utf8')
    const committed = await readNormalized(path.join(devResourcesV2, 'template.ftl'))
    expect(adaptV2Template(pristine, patch).replace(/\n$/, '')).toBe(committed)
  })

  maybeIt('reproduces v2/login/footer.ftl exactly by applying the stored patch', async () => {
    const pristine = await readNormalized(path.join(upstreamV2, 'footer.ftl'))
    const patch = await readFile(path.join(process.cwd(), 'tools/theme-adaptations/patches/v2-footer.patch'), 'utf8')
    const committed = await readNormalized(path.join(devResourcesV2, 'footer.ftl'))
    expect(adaptV2Footer(pristine, patch).replace(/\n$/, '')).toBe(committed)
  })

  if (!hasSyncedUpstream) {
    it.skip('(run `npm run sync:keycloak` first to enable the golden-equivalence checks above)', () => {})
  }
})
