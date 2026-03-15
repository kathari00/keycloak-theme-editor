import type { UserMocks } from '../generate-preview'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createJiti } from 'jiti'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveContextMocks } from '../generate-preview'

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..', '..')
const KC_MOCKS_SRC = path.join(PACKAGE_ROOT, 'bin', 'kc-mocks.src.ts')

/**
 * Replicate the CLI's loadUserMocks pipeline exactly:
 * jiti imports kc-page.ts (and optionally kc-page-state.ts),
 * then we feed the result into resolveContextMocks.
 */
async function loadUserMocks(dir: string): Promise<UserMocks> {
  const jiti = createJiti(dir, {
    interopDefault: true,
    moduleCache: false,
    fsCache: false,
    alias: { 'keycloak-theme-editor': KC_MOCKS_SRC },
  })

  const userModule = await jiti.import(path.join(dir, 'kc-page.ts')) as {
    default?: { pages?: Record<string, Record<string, unknown>> }
  }
  if (!userModule?.default) {
    throw new Error('Expected a default export from kc-page.ts')
  }

  let states: UserMocks['states'] = {}
  const stateFile = path.join(dir, 'kc-page-state.ts')
  if (fs.existsSync(stateFile)) {
    const stateModule = await jiti.import(stateFile) as { default?: UserMocks['states'] }
    if (!stateModule?.default) {
      throw new Error('Expected a default export from kc-page-state.ts')
    }
    states = stateModule.default
  }

  return {
    pages: userModule.default.pages ?? {},
    states,
  }
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kte-integration-'))
}

const tempDirs: string[] = []
afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  tempDirs.length = 0
})

function writeFixture(dir: string, files: Record<string, string>) {
  fs.mkdirSync(dir, { recursive: true })
  tempDirs.push(dir)
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, 'utf8')
  }
}

describe('integration: kc-page.ts + kc-page-state.ts → resolveContextMocks', () => {
  it('loads a minimal kc-page.ts with no overrides', async () => {
    const dir = makeTempDir()
    writeFixture(dir, {
      'kc-page.ts': `
        import { defineConfig } from 'keycloak-theme-editor'
        export default defineConfig({})
      `,
    })

    const userMocks = await loadUserMocks(dir)
    expect(userMocks.pages).toEqual({})
    expect(userMocks.states).toEqual({})

    const { pages } = resolveContextMocks(userMocks)
    expect(pages['login.ftl']).toBeDefined()
    expect(pages['login.ftl'].pageId).toBe('login.ftl')
  })

  it('loads known page overrides and merges them with base mocks', async () => {
    const dir = makeTempDir()
    writeFixture(dir, {
      'kc-page.ts': `
        import { defineConfig } from 'keycloak-theme-editor'
        export default defineConfig({
          pages: {
            'login.ftl': {
              realm: { displayName: 'My Realm' },
            },
          },
        })
      `,
    })

    const userMocks = await loadUserMocks(dir)
    const { pages } = resolveContextMocks(userMocks)

    const login = pages['login.ftl'] as any
    expect(login.realm.displayName).toBe('My Realm')
    // base fields survive the merge
    expect(login.realm.name).toBe('myrealm')
    expect(login.url).toBeDefined()
    expect(login.pageId).toBe('login.ftl')
  })

  it('loads a custom page id that does not exist in base mocks', async () => {
    const dir = makeTempDir()
    writeFixture(dir, {
      'kc-page.ts': `
        import { defineConfig } from 'keycloak-theme-editor'
        export default defineConfig({
          pages: {
            'my-custom-page.ftl': {
              customField: 'hello',
              realm: { displayName: 'Custom' },
            },
          },
        })
      `,
    })

    const userMocks = await loadUserMocks(dir)
    const { pages } = resolveContextMocks(userMocks)

    const custom = pages['my-custom-page.ftl'] as any
    expect(custom).toBeDefined()
    expect(custom.pageId).toBe('my-custom-page.ftl')
    expect(custom.customField).toBe('hello')
    expect(custom.realm.displayName).toBe('Custom')
    // seeded from login.ftl base, so url/realm structure present
    expect(custom.url.loginAction).toBeDefined()
  })

  it('loads states from kc-page-state.ts', async () => {
    const dir = makeTempDir()
    writeFixture(dir, {
      'kc-page.ts': `
        import { defineConfig } from 'keycloak-theme-editor'
        export default defineConfig({
          pages: {
            'login.ftl': { realm: { displayName: 'Stateland' } },
          },
        })
      `,
      'kc-page-state.ts': `
        import { defineStates } from 'keycloak-theme-editor'
        export default defineStates({
          'login.ftl': {
            'social-only': {
              realm: { registrationAllowed: false, resetPasswordAllowed: false },
            },
          },
        })
      `,
    })

    const userMocks = await loadUserMocks(dir)
    const { pages } = resolveContextMocks(userMocks)

    const state = pages['login.ftl@social-only'] as any
    expect(state).toBeDefined()
    expect(state.pageId).toBe('login.ftl')
    expect(state.realm.displayName).toBe('Stateland')
    expect(state.realm.registrationAllowed).toBe(false)
    expect(state.realm.resetPasswordAllowed).toBe(false)
  })

  it('loads states for custom pages', async () => {
    const dir = makeTempDir()
    writeFixture(dir, {
      'kc-page.ts': `
        import { defineConfig } from 'keycloak-theme-editor'
        export default defineConfig({
          pages: {
            'otp-sms.ftl': { smsNumber: '+1234567890' },
          },
        })
      `,
      'kc-page-state.ts': `
        import { defineStates } from 'keycloak-theme-editor'
        export default defineStates({
          'otp-sms.ftl': {
            'expired': { message: { type: 'error', summary: 'Code expired' } },
          },
        })
      `,
    })

    const userMocks = await loadUserMocks(dir)
    const { pages } = resolveContextMocks(userMocks)

    expect(pages['otp-sms.ftl']).toBeDefined()
    expect((pages['otp-sms.ftl'] as any).smsNumber).toBe('+1234567890')

    const state = pages['otp-sms.ftl@expired'] as any
    expect(state).toBeDefined()
    expect(state.pageId).toBe('otp-sms.ftl')
    expect(state.smsNumber).toBe('+1234567890')
    expect(state.message.type).toBe('error')
    expect(state.message.summary).toBe('Code expired')
  })

  it('works with kc-page.ts only, no state file', async () => {
    const dir = makeTempDir()
    writeFixture(dir, {
      'kc-page.ts': `
        import { defineConfig } from 'keycloak-theme-editor'
        export default defineConfig({
          pages: { 'terms.ftl': { custom: true } },
        })
      `,
    })

    const userMocks = await loadUserMocks(dir)
    expect(userMocks.states).toEqual({})

    const { pages } = resolveContextMocks(userMocks)
    expect((pages['terms.ftl'] as any).custom).toBe(true)
  })

  it('treats named exports without default as empty config (jiti interopDefault)', async () => {
    // jiti with interopDefault: true synthesizes a default from named exports,
    // so `export const pages = {}` does NOT throw. This is current behavior.
    // A stricter validation would check for defineConfig shape, but that's a
    // separate concern.
    const dir = makeTempDir()
    writeFixture(dir, {
      'kc-page.ts': `export const pages = {}`,
    })

    const userMocks = await loadUserMocks(dir)
    expect(userMocks.pages).toEqual({})
  })

  it('matches the init template output format', async () => {
    const dir = makeTempDir()
    // These are the exact templates the `init` command generates
    writeFixture(dir, {
      'kc-page.ts': [
        `import { defineConfig } from 'keycloak-theme-editor'`,
        ``,
        `export default defineConfig({`,
        `  pages: {`,
        `    // 'login.ftl': {},`,
        `  },`,
        `})`,
      ].join('\n'),
      'kc-page-state.ts': [
        `import { defineStates } from 'keycloak-theme-editor'`,
        ``,
        `export default defineStates({`,
        `  // 'login.ftl': {`,
        `  //   example: {},`,
        `  // },`,
        `})`,
      ].join('\n'),
    })

    const userMocks = await loadUserMocks(dir)
    expect(userMocks.pages).toEqual({})
    expect(userMocks.states).toEqual({})

    const { pages } = resolveContextMocks(userMocks)
    // all base pages should still be generated
    expect(Object.keys(pages).length).toBeGreaterThan(30)
  })
})
