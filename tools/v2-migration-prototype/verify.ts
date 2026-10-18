import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { normalizePreviewArtifact, resolveContextMocks } from '../generate-preview'

const prototypeRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(prototypeRoot, '../..')
const upstreamRoot = path.join(repoRoot, 'public/keycloak-upstream')
const overrideRoot = path.join(repoRoot, 'public/keycloak-dev-resources/themes')
const jarPath = path.join(repoRoot, 'tools/preview-renderer/preview-renderer.jar')
const prototypePrHead = 'db6c308504ff16de0fd8859261b75237803414a5'

interface PagesOutput {
  variants: Record<string, Record<string, Record<string, string>>>
}

async function main() {
  const configuredTag = (JSON.parse(await readFile(path.join(repoRoot, 'tools/sync-keycloak-config.json'), 'utf8')) as { tag: string }).tag
  assert.equal(configuredTag, '26.7.3', 'The prototype must be rebased before using a different Keycloak source version')
  const keycloakSourceArg = process.argv.find(arg => arg.startsWith('--keycloak-source='))
  const keycloakSource = keycloakSourceArg ? path.resolve(keycloakSourceArg.slice('--keycloak-source='.length)) : null
  const asIs = process.argv.includes('--as-is')
  assert.ok(!asIs || keycloakSource, '--as-is requires --keycloak-source')
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'keycloak-v2-login-prototype-'))
  try {
    const inputRoot = path.join(tempRoot, 'input')
    const baselineRoot = path.join(tempRoot, 'baseline')
    const outputRoot = path.join(tempRoot, 'output')
    const baselineOutputRoot = path.join(tempRoot, 'baseline-output')
    const mocksPath = path.join(tempRoot, 'context-mocks.json')
    await mkdir(inputRoot, { recursive: true })

    for (const themeId of ['base', 'v2']) {
      if (keycloakSource) {
        const upstreamTheme = themeId === 'v2' ? 'keycloak.v2' : 'base'
        const sourceLogin = path.join(keycloakSource, 'themes/src/main/resources/theme', upstreamTheme, 'login')
        await cp(sourceLogin, path.join(inputRoot, themeId, 'login'), { recursive: true })
        await cp(path.join(sourceLogin, 'messages'), path.join(inputRoot, themeId, 'messages'), { recursive: true })
      }
      else {
        await cp(path.join(upstreamRoot, themeId), path.join(inputRoot, themeId), { recursive: true })
      }
    }
    if (keycloakSource) {
      await cp(inputRoot, baselineRoot, { recursive: true })
    }
    if (!asIs) {
      for (const file of await readdir(path.join(prototypeRoot, 'base/login'))) {
        await cp(path.join(prototypeRoot, 'base/login', file), path.join(inputRoot, 'base/login', file))
      }

      // Missing V2 pages prove that the renderer resolves their Base counterparts.
      for (const file of ['login.ftl', 'login-username.ftl', 'login-password.ftl', 'register.ftl']) {
        await rm(path.join(inputRoot, 'v2/login', file), { force: true })
      }
      await rm(path.join(inputRoot, 'v2/login/buttons.ftl'), { force: true })
      for (const file of await readdir(path.join(prototypeRoot, 'v2/login'))) {
        await cp(path.join(prototypeRoot, 'v2/login', file), path.join(inputRoot, 'v2/login', file))
      }
    }

    const mocks = resolveContextMocks()
    mocks.pages['login-password.ftl@invalid-state'] = {
      ...mocks.pages['login-password.ftl'],
      messagesPerField: { password: 'Invalid password.' },
    }
    mocks.pages['login-username.ftl@invalid-state'] = {
      ...mocks.pages['login-username.ftl'],
      messagesPerField: { username: 'Invalid username.' },
    }
    const passwordMock = mocks.pages['login-password.ftl']
    mocks.pages['login-password.ftl@reset-allowed'] = {
      ...passwordMock,
      realm: { ...(passwordMock.realm as Record<string, unknown>), resetPasswordAllowed: true },
      url: { ...(passwordMock.url as Record<string, unknown>), loginResetCredentialsUrl: '/reset-credentials-prototype' },
    }
    const loginMock = mocks.pages['login.ftl']
    mocks.pages['login.ftl@username-hidden'] = {
      ...loginMock,
      usernameHidden: true,
      messagesPerField: { username: 'Invalid username.' },
    }
    mocks.pages['login.ftl@username-hidden-password-error'] = {
      ...loginMock,
      usernameHidden: true,
      messagesPerField: { password: 'Invalid password.' },
    }
    mocks.pages['login-username.ftl@username-hidden'] = {
      ...mocks.pages['login-username.ftl'],
      usernameHidden: true,
    }
    mocks.pages['login.ftl@reset-allowed'] = {
      ...loginMock,
      url: { ...(loginMock.url as Record<string, unknown>), loginResetCredentialsUrl: '/reset-credentials-prototype' },
    }
    const registerMock = mocks.pages['register.ftl']
    mocks.pages['register.ftl@custom-header'] = {
      ...registerMock,
      messageHeader: 'registerTitle',
    }
    mocks.pages['register.ftl@invalid-state'] = {
      ...registerMock,
      messagesPerField: { password: 'Invalid password.', termsAccepted: 'Accept the terms.' },
    }
    mocks.pages['webauthn-error.ftl'] = {
      ...mocks.pages['webauthn-error.ftl'],
      execution: 'example-execution',
    }
    mocks.pages['login-config-totp.ftl@invalid-state'] = {
      ...mocks.pages['login-config-totp.ftl'],
      messagesPerField: { totp: 'Invalid authenticator code.', userLabel: 'Invalid device name.' },
    }
    mocks.pages['login-config-totp.ftl@manual'] = {
      ...mocks.pages['login-config-totp.ftl'],
      mode: 'manual',
    }
    mocks.pages['login-otp.ftl@invalid-state'] = {
      ...mocks.pages['login-otp.ftl'],
      messagesPerField: { totp: 'Invalid one-time code.' },
    }
    for (const [page, errors] of [
      ['login-update-profile.ftl', { firstName: 'Invalid first name.' }],
      ['update-email.ftl', { email: 'Invalid email.' }],
      ['login-reset-password.ftl', { username: 'Invalid username.' }],
      ['login-update-password.ftl', { 'password': 'Invalid password.', 'password-confirm': 'Passwords do not match.' }],
      ['login-recovery-authn-code-input.ftl', { recoveryCodeInput: 'Invalid recovery code.' }],
    ] as const) {
      mocks.pages[`${page}@invalid-state`] = { ...mocks.pages[page], messagesPerField: errors }
    }
    for (const visible of [false, true]) {
      mocks.pages[`register.ftl@recaptcha-${visible ? 'visible' : 'invisible'}`] = {
        ...registerMock,
        recaptchaRequired: true,
        recaptchaVisible: visible,
        recaptchaSiteKey: 'prototype-site-key',
        recaptchaAction: 'register',
      }
    }
    await writeFile(mocksPath, JSON.stringify(mocks))
    if (keycloakSource) {
      const baselineResult = spawnSync('java', [
        '-jar',
        jarPath,
        `--input=${baselineRoot}`,
        `--overrides=${overrideRoot}`,
        `--presets=${overrideRoot}`,
        `--output=${baselineOutputRoot}`,
        `--context-mocks=${mocksPath}`,
        '--tag=keycloak-pr-baseline',
      ], { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, KEYCLOAK_PREVIEW_VERBOSE_SKIPS: '1' }, maxBuffer: 16 * 1024 * 1024 })
      assert.equal(baselineResult.status, 0, baselineResult.stderr || baselineResult.stdout)
      const baseline = JSON.parse(await readFile(path.join(baselineOutputRoot, 'pages.json'), 'utf8')) as PagesOutput
      for (const pageId of ['login.html', 'login-username.html', 'login-password.html', 'register.html']) {
        assert.ok(baseline.variants.v2?.[pageId]?.default, `PR baseline could not render ${pageId}`)
      }
      const comparisonDir = path.join(prototypeRoot, 'generated')
      await mkdir(comparisonDir, { recursive: true })
      await cp(path.join(baselineOutputRoot, 'pages.json'), path.join(comparisonDir, 'pr-baseline-pages.json'))
    }
    const result = spawnSync('java', [
      '-jar',
      jarPath,
      `--input=${inputRoot}`,
      `--overrides=${overrideRoot}`,
      `--presets=${overrideRoot}`,
      `--output=${outputRoot}`,
      `--context-mocks=${mocksPath}`,
      `--tag=${configuredTag}+pr-${prototypePrHead.slice(0, 8)}-prototype`,
    ], { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, KEYCLOAK_PREVIEW_VERBOSE_SKIPS: '1' }, maxBuffer: 16 * 1024 * 1024 })
    assert.equal(result.status, 0, result.stderr || result.stdout)
    if (process.argv.includes('--show-skips')) {
      process.stdout.write(result.stderr.split('\n').filter(line => /webauthn-error|login-passkeys-conditional-authenticate/.test(line)).join('\n'))
    }

    const output = JSON.parse(await readFile(path.join(outputRoot, 'pages.json'), 'utf8')) as PagesOutput
    if (process.argv.includes('--expect-all-inherited')) {
      assert.ok(asIs && keycloakSource, '--expect-all-inherited requires --keycloak-source and --as-is')
      const inheritedPages = [
        'code',
        'delete-account-confirm',
        'delete-credential',
        'link-idp-action',
        'login',
        'login-config-totp',
        'login-idp-link-confirm',
        'login-oauth-grant',
        'login-oauth2-device-verify-user-code',
        'login-oid4vp',
        'login-otp',
        'login-passkeys-conditional-authenticate',
        'login-password',
        'login-recovery-authn-code-config',
        'login-recovery-authn-code-input',
        'login-reset-password',
        'login-update-password',
        'login-update-profile',
        'login-username',
        'login-verify-email',
        'oid4vc-credential-offer',
        'register',
        'select-authenticator',
        'terms',
        'update-email',
        'webauthn-authenticate',
        'webauthn-error',
        'webauthn-register',
      ]
      const v2Files = new Set(await readdir(path.join(inputRoot, 'v2/login')))
      for (const name of inheritedPages) {
        assert.ok(!v2Files.has(`${name}.ftl`), `${name}.ftl still overrides Base in V2`)
        for (const themeId of ['base', 'v2']) {
          assert.ok(output.variants[themeId]?.[`${name}.html`]?.default, `${themeId}/${name}.html did not render`)
        }
      }
      const baseCode = output.variants.base['code.html'].default
      for (const id of ['kc-code-clipboard', 'kc-code-toggle', 'kc-code-copy-button', 'kc-code-content']) {
        assert.match(baseCode, new RegExp(`id="${id}"`), `Base code page is missing ${id}`)
      }
      process.stdout.write(`All ${inheritedPages.length} pages inherit Base and render in Base and V2.\n`)
    }
    for (const themeId of ['base', 'v2']) {
      for (const pageId of ['login.html', 'login-username.html', 'login-password.html']) {
        const states = output.variants[themeId]?.[pageId]
        assert.ok(states, `${themeId} did not render the inherited ${pageId}\n${result.stderr}`)
        for (const stateId of ['default', 'invalid-state']) {
          const html = states[stateId]
          assert.ok(html, `${themeId}/${pageId} did not render ${stateId}`)
          assert.match(html, /id="kc-form-login"/)
          assert.match(html, /id="kc-login"/)
          if (pageId !== 'login-password.html') {
            assert.match(html, /name="username"/)
          }
          if (pageId !== 'login-username.html') {
            assert.match(html, /name="password"/)
            assert.match(html, /data-password-toggle/)
            assert.equal((html.match(/js\/passwordVisibility\.js/g) ?? []).length, 1, `${themeId}/${pageId}/${stateId} must load passwordVisibility.js exactly once`)
          }
          if (stateId === 'invalid-state') {
            assert.match(html, /aria-invalid="true"/)
          }
        }
      }
    }

    const baseHtml = output.variants.base['login-password.html'].default
    const v2Html = output.variants.v2['login-password.html'].default
    assert.match(baseHtml, /<hr\s*\/>/)
    assert.doesNotMatch(v2Html, /<hr\s*\/>/)
    assert.match(v2Html, /autocomplete="current-password"/)
    const baseResetHtml = output.variants.base['login-password.html']['reset-allowed']
    const v2ResetHtml = output.variants.v2['login-password.html']['reset-allowed']
    for (const [themeId, html] of [['base', baseResetHtml], ['v2', v2ResetHtml]] as const) {
      assert.equal((html.match(/\/reset-credentials-prototype/g) ?? []).length, 1, `${themeId} must show one password reset link`)
    }
    assert.match(baseResetHtml, /id="kc-form-options"[\s\S]*\/reset-credentials-prototype/)
    assert.match(v2ResetHtml, /\/reset-credentials-prototype[\s\S]*id="input-error-container-password"/)
    assert.doesNotMatch(v2ResetHtml, /id="kc-form-options"/)
    const baseCombinedHtml = output.variants.base['login.html']['reset-allowed']
    const v2CombinedHtml = output.variants.v2['login.html']['reset-allowed']
    for (const [themeId, html] of [['base', baseCombinedHtml], ['v2', v2CombinedHtml]] as const) {
      assert.equal((html.match(/\/reset-credentials-prototype/g) ?? []).length, 1, `${themeId} must show one combined-login password reset link`)
      assert.equal((html.match(/name="rememberMe"/g) ?? []).length, 1, `${themeId} must show one combined-login remember-me input`)
    }
    assert.match(baseCombinedHtml, /id="kc-form-options"/)
    assert.doesNotMatch(v2CombinedHtml, /id="kc-form-options"/)
    assert.doesNotMatch(output.variants.v2['login-username.html'].default, /id="kc-form-options"/)

    for (const themeId of ['base', 'v2']) {
      const registration = output.variants[themeId]?.['register.html']?.default
      assert.ok(registration, `${themeId} did not render the inherited registration page`)
      assert.match(registration, /id="kc-register-form"/)
      assert.match(registration, /name="password"/)
      assert.match(registration, /name="password-confirm"/)
      assert.match(registration, /name="termsAccepted"/)
      assert.match(registration, /id="kc-form-buttons"/)
      const invalidRegistration = output.variants[themeId]['register.html']['invalid-state']
      assert.match(invalidRegistration, /aria-invalid="true"/)
      assert.match(invalidRegistration, /id="input-error-terms-accepted"/)
      for (const stateId of ['recaptcha-visible', 'recaptcha-invisible']) {
        const html = output.variants[themeId]['register.html'][stateId]
        assert.match(html, /prototype-site-key/, `${themeId}/${stateId} lost the reCAPTCHA site key`)
        assert.match(html, /id="kc-form-buttons"/)
      }
    }
    assert.match(output.variants.v2['register.html'].default, /id="errorTemplate"/)

    if (keycloakSource) {
      await cp(path.join(outputRoot, 'pages.json'), path.join(prototypeRoot, 'generated/pr-candidate-pages.json'))
      process.stdout.write('Wrote PR baseline and candidate previews to tools/v2-migration-prototype/generated/\n')
    }

    if (process.argv.includes('--write-editor-preview')) {
      const outputPath = path.join(outputRoot, 'pages.json')
      assert.ok(normalizePreviewArtifact(outputPath), 'Could not normalize the prototype preview')
      const editorPreviewDir = path.join(prototypeRoot, 'generated')
      await mkdir(editorPreviewDir, { recursive: true })
      await cp(outputPath, path.join(editorPreviewDir, 'pages.json'))
      process.stdout.write('Wrote local editor preview to tools/v2-migration-prototype/generated/pages.json\n')
    }
    process.stdout.write('Base and V2 inherit the three login pages and registration; component overrides render in normal and error states.\n')
  }
  finally {
    const resolvedTemp = path.resolve(tempRoot)
    const resolvedParent = path.resolve(os.tmpdir()) + path.sep
    if (resolvedTemp.startsWith(resolvedParent)) {
      await rm(resolvedTemp, { recursive: true, force: true })
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
})
