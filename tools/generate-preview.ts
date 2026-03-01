import type { Attribute } from 'keycloakify/login/KcContext'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createJiti } from 'jiti'

const MIN_JAVA = 25
const isWindows = process.platform === 'win32'
const SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi

export interface ContextMocks {
  common: Record<string, unknown>
  pages: Record<string, Record<string, unknown>>
}

export interface GeneratePreviewOptions {
  /** Root of the npm package (where public/, tools/ etc. live). Defaults to cwd. */
  packageRoot?: string
  /** Path to a pre-built fat JAR. When set, uses `java -jar` instead of Maven. */
  jarPath?: string
  /** Where to write the output pages.json. Defaults to src/features/preview/generated/pages.json */
  outputPath?: string
  /** Additional context mocks to merge with built-in mocks (e.g. from user's kc-page.ts). */
  additionalMocks?: ContextMocks
  /** Path to user's Keycloak theme directory (contains login/ with custom .ftl files). */
  userThemeDir?: string
  /** Suppress stdout logging. */
  quiet?: boolean
}

export interface GeneratePreviewResult {
  success: boolean
  outputPath: string
  /** Parsed pages data (available when success=true). */
  pagesData?: {
    generatedAt: string
    keycloakTag: string
    variants: Record<string, Record<string, Record<string, string>>>
  }
  error?: string
}

// ---------------------------------------------------------------------------
// Built-in mock context data (loaded lazily from keycloakify)
// ---------------------------------------------------------------------------

const socialProviders = [
  { alias: 'google', providerId: 'google', displayName: 'Google', loginUrl: '#' },
  { alias: 'github', providerId: 'github', displayName: 'GitHub', loginUrl: '#' },
  { alias: 'facebook', providerId: 'facebook', displayName: 'Facebook', loginUrl: '#' },
  { alias: 'microsoft', providerId: 'microsoft', displayName: 'Microsoft', loginUrl: '#' },
]

const favoritePetAttribute: Omit<Attribute, 'group'> = {
  name: 'favoritePet',
  displayName: 'Favorite pet',
  required: true,
  readOnly: false,
  annotations: { inputType: 'select', inputOptionLabelsI18nPrefix: 'favoritePet' },
  html5DataAnnotations: {},
  validators: { options: { options: ['dog', 'cat', 'bird', 'reptile'] } },
  values: [],
}

function profileAttributesArray(byName: Record<string, Partial<Attribute>>): Record<string, unknown>[] {
  return Object.entries(byName).map(([name, attr]) => ({
    name,
    displayName: attr.displayName ?? `\${${name}}`,
    required: attr.required ?? false,
    readOnly: attr.readOnly ?? false,
    annotations: attr.annotations ?? {},
    html5DataAnnotations: attr.html5DataAnnotations ?? {},
    validators: attr.validators ?? {},
    values: attr.values ?? [],
    value: (attr.values ?? [])[0] ?? '',
    ...attr,
  }))
}

/* eslint-disable no-template-curly-in-string -- FreeMarker placeholders */
const defaultProfileAttributes = profileAttributesArray({
  username: { displayName: '${username}', required: true, autocomplete: 'username' },
  email: { displayName: '${email}', required: true, autocomplete: 'email' },
  firstName: { displayName: '${firstName}', required: true },
  lastName: { displayName: '${lastName}', required: true },
})
/* eslint-enable no-template-curly-in-string */

const profileOverride = {
  profile: { attributes: defaultProfileAttributes, html5DataAnnotations: {} },
}

const stories: Record<string, Record<string, Record<string, unknown>>> = {
  login: {
    'minimal': {
      realm: { internationalizationEnabled: false, rememberMe: false, registrationAllowed: false, resetPasswordAllowed: false },
      social: { displayInfo: false, providers: [] },
    },
    'invalid-state': {
      realm: { rememberMe: false, resetPasswordAllowed: false },
      social: { displayInfo: false, providers: [] },
      message: { type: 'info', summary: 'infoMessage' },
      messagesPerField: { username: 'Invalid username or password.', password: 'Invalid username or password.' },
    },
  },
}

async function resolveContextMocks(): Promise<ContextMocks> {
  let getKcContextMock: (params: { pageId: string, overrides?: Record<string, unknown> }) => Record<string, unknown>
  let kcContextMocks: Array<{ pageId: string }>

  try {
    // Use jiti to load keycloakify — it ships ESM syntax without "type": "module",
    // so neither require() nor native import() work in bundled Node.js context.
    const jiti = createJiti(import.meta.url, { interopDefault: true })
    const kcModule = await jiti.import('keycloakify/login/KcContext') as any
    const mocksModule = await jiti.import('keycloakify/login/KcContext/kcContextMocks') as any
    const { createGetKcContextMock } = kcModule
    kcContextMocks = mocksModule.kcContextMocks

    const result = createGetKcContextMock({
      kcContextExtension: { properties: {} },
      overrides: {
        url: {
          resourcesPath: '/keycloak-dev-resources',
          resourcesCommonPath: '/keycloak-dev-resources/resources-common',
        },
      },
      kcContextExtensionPerPage: {},
      overridesPerPage: {
        'login.ftl': { usernameHidden: undefined, login: { username: '' }, social: { providers: socialProviders } },
        'login-username.ftl': { usernameHidden: undefined, login: { username: '' }, social: { providers: socialProviders } },
        'register.ftl': {
          termsAcceptanceRequired: true,
          ...profileOverride,
          profile: {
            ...profileOverride.profile,
            attributesByName: {
              email: { readOnly: true, values: ['john@example.com'] },
              lastName: { readOnly: true, values: ['Doe'] },
              favoritePet: favoritePetAttribute as Attribute,
            },
          },
        },
        'login-update-profile.ftl': profileOverride,
        'idp-review-user-profile.ftl': profileOverride,
        'update-user-profile.ftl': profileOverride,
        'update-email.ftl': profileOverride,
        'login-recovery-authn-code-config.ftl': {
          recoveryAuthnCodesConfigBean: {
            generatedRecoveryAuthnCodesList: ['ABCD1234EFGH', 'IJKL5678MNOP', 'QRST9012UVWX'],
            generatedRecoveryAuthnCodesAsString: 'ABCD1234EFGH, IJKL5678MNOP, QRST9012UVWX',
            generatedAt: Date.now(),
          },
        },
      },
    })
    getKcContextMock = result.getKcContextMock
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(
      `Warning: Failed to load keycloakify context mocks (${message}). Preview generation will skip many templates. Install keycloakify in this runtime.\n`,
    )
    return { common: {}, pages: {} }
  }

  const pages: Record<string, Record<string, unknown>> = {}

  for (const { pageId } of kcContextMocks) {
    const name = pageId.replace('.ftl', '')
    const context = JSON.parse(JSON.stringify(getKcContextMock({ pageId: pageId as any })))
    pages[name] = context
    for (const [storyId, override] of Object.entries(stories[name] ?? {})) {
      const storyContext = JSON.parse(JSON.stringify(
        getKcContextMock({ pageId: pageId as any, overrides: override as any }),
      ))
      pages[`${name}@${storyId}`] = storyContext
    }
  }

  return { common: {}, pages }
}

// ---------------------------------------------------------------------------
// Preview generation
// ---------------------------------------------------------------------------

function stripScriptTags(html: string): string {
  if (!html) {
    return ''
  }
  return html.replace(SCRIPT_TAG_PATTERN, '')
}

function readJson(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  }
  catch {
    return null
  }
}

export function getJavaMajorVersion(): number | null {
  const result = spawnSync('java', ['-version'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: isWindows,
  })
  if (result.status !== 0) {
    return null
  }
  const match = `${result.stdout || ''}\n${result.stderr || ''}`.match(/version\s+"([^"]+)"/i)
  if (!match) {
    return null
  }
  const major = Number.parseInt(match[1].split(/[._-]/)[0], 10)
  return Number.isFinite(major) ? major : null
}

function toForwardSlashPath(filePath: string): string {
  return filePath.replaceAll('\\', '/')
}

function mergeMocks(base: ContextMocks, additional: ContextMocks): ContextMocks {
  return {
    common: { ...base.common, ...additional.common },
    pages: { ...base.pages, ...additional.pages },
  }
}

async function writeTempContextMocksFile(additionalMocks?: ContextMocks): Promise<{ tempDir: string, filePath: string }> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-context-mocks-'))
  const filePath = path.join(tempDir, 'kc-context-mocks.json')
  let mocks = await resolveContextMocks()
  if (additionalMocks) {
    mocks = mergeMocks(mocks, additionalMocks)
  }
  fs.writeFileSync(filePath, `${JSON.stringify(mocks, null, 2)}\n`, 'utf8')
  return { tempDir, filePath }
}

function runJar(params: {
  jarPath: string
  contextMocksPath: string
  packageRoot: string
  outputDir: string
  userThemeDir?: string
}) {
  const { jarPath, contextMocksPath, packageRoot, outputDir, userThemeDir } = params
  const args = [
    '-jar',
    jarPath,
    `--context-mocks=${toForwardSlashPath(contextMocksPath)}`,
    `--input=${toForwardSlashPath(path.join(packageRoot, 'public/keycloak-upstream'))}`,
    `--overrides=${toForwardSlashPath(path.join(packageRoot, 'public/keycloak-dev-resources/themes'))}`,
    `--presets=${toForwardSlashPath(path.join(packageRoot, 'public/keycloak-dev-resources/themes'))}`,
    `--output=${toForwardSlashPath(outputDir)}`,
    ...(userThemeDir ? [`--user-theme=${toForwardSlashPath(userThemeDir)}`] : []),
  ]

  return spawnSync('java', args, {
    stdio: 'inherit',
    shell: isWindows,
  })
}

function runMaven(pomPath: string, contextMocksPath: string) {
  const execArgs = `--context-mocks=${toForwardSlashPath(contextMocksPath)}`

  const mavenOpts = [
    process.env.MAVEN_OPTS || '',
    '--enable-native-access=ALL-UNNAMED',
    '--sun-misc-unsafe-memory-access=allow',
  ].filter(Boolean).join(' ')

  return spawnSync('mvn', [
    '-f',
    pomPath,
    'compile',
    'exec:java',
    '-Dexec.mainClass=com.keycloaktheme.preview.PreviewRendererMain',
    `-Dexec.args="${execArgs}"`,
  ], {
    stdio: 'inherit',
    shell: isWindows,
    env: { ...process.env, MAVEN_OPTS: mavenOpts },
  })
}

function resolveExpectedDataPageId(pageId: string): string {
  const normalizedPageId = pageId.trim().replace(/\.html$/i, '')
  if (!normalizedPageId) {
    return 'login'
  }
  return `login-${normalizedPageId}`
}

function validateStoryHtmlContract(params: {
  variantId: string
  pageId: string
  storyId: string
  html: string
}) {
  const { variantId, pageId, storyId, html } = params
  const trimmed = html.trim()
  if (!/<html\b/i.test(trimmed) || !/<body\b/i.test(trimmed)) {
    throw new Error(
      `Invalid preview story markup for ${variantId}/${pageId}/${storyId}: expected a full HTML document with <html> and <body>.`,
    )
  }

  const match = trimmed.match(/<body\b[^>]+\bdata-page-id\s*=\s*(['"])([^'"]+)\1/i)
  if (!match) {
    throw new Error(
      `Invalid preview story markup for ${variantId}/${pageId}/${storyId}: missing body[data-page-id].`,
    )
  }

  const actualPageId = match[2]
  const expectedPageId = resolveExpectedDataPageId(pageId)
  if (actualPageId !== expectedPageId) {
    throw new Error(
      `Invalid preview story markup for ${variantId}/${pageId}/${storyId}: expected data-page-id="${expectedPageId}", got "${actualPageId}".`,
    )
  }
}

function normalizeStoriesForPage(params: {
  variantId: string
  pageId: string
  rawPage: unknown
}): Record<string, string> {
  const { variantId, pageId, rawPage } = params
  if (!rawPage || typeof rawPage !== 'object' || Array.isArray(rawPage)) {
    throw new Error(`Invalid preview page payload for ${variantId}/${pageId}: expected story object.`)
  }

  const rawStories = rawPage as Record<string, unknown>
  if (typeof rawStories.default !== 'string') {
    throw new TypeError(`Invalid preview page payload for ${variantId}/${pageId}: missing default story.`)
  }

  const normalizedStories: Record<string, string> = {}
  for (const [storyId, storyHtml] of Object.entries(rawStories)) {
    if (typeof storyHtml !== 'string') {
      throw new TypeError(`Invalid preview story payload for ${variantId}/${pageId}/${storyId}: expected string HTML.`)
    }
    const sanitizedStoryHtml = stripScriptTags(storyHtml)
    validateStoryHtmlContract({
      variantId,
      pageId,
      storyId,
      html: sanitizedStoryHtml,
    })
    normalizedStories[storyId] = sanitizedStoryHtml
  }

  return normalizedStories
}

function normalizeVariants(raw: any): Record<string, Record<string, Record<string, string>>> {
  const variants: Record<string, Record<string, Record<string, string>>> = {}
  for (const [variantId, pages] of Object.entries(raw.variants as Record<string, Record<string, unknown>>)) {
    const variantPages: Record<string, Record<string, string>> = {}
    for (const [pageId, rawPage] of Object.entries((pages ?? {}) as Record<string, unknown>)) {
      variantPages[pageId] = normalizeStoriesForPage({
        variantId,
        pageId,
        rawPage,
      })
    }
    variants[variantId] = variantPages
  }
  return variants
}

/**
 * Generate preview pages by running the Java FreeMarker renderer.
 * Can be called programmatically from the CLI or via `npm run generate:preview`.
 */
export async function generatePreview(options: GeneratePreviewOptions = {}): Promise<GeneratePreviewResult> {
  const packageRoot = options.packageRoot ?? process.cwd()
  const outputPath = options.outputPath ?? path.join(packageRoot, 'src', 'features', 'preview', 'generated', 'pages.json')
  const log = options.quiet ? () => {} : (msg: string) => process.stdout.write(msg)

  const javaVersion = getJavaMajorVersion()
  if (!javaVersion || javaVersion < MIN_JAVA) {
    const error = `Java ${MIN_JAVA}+ required (found ${javaVersion ?? 'none'}). Set JAVA_HOME or add java to PATH.`
    process.stderr.write(`${error}\n`)
    return { success: false, outputPath, error }
  }

  log(`Generating preview artifacts (Java ${javaVersion})...\n`)

  const { tempDir, filePath } = await writeTempContextMocksFile(options.additionalMocks)

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath)
  fs.mkdirSync(outputDir, { recursive: true })

  let result
  if (options.jarPath) {
    result = runJar({
      jarPath: options.jarPath,
      contextMocksPath: filePath,
      packageRoot,
      outputDir,
      userThemeDir: options.userThemeDir,
    })
  }
  else {
    const pomPath = path.join(packageRoot, 'tools', 'preview-renderer', 'pom.xml')
    result = runMaven(pomPath, filePath)
  }

  fs.rmSync(tempDir, { recursive: true, force: true })

  if (result.status !== 0) {
    return { success: false, outputPath, error: `Java renderer exited with code ${result.status}` }
  }

  const raw = readJson(outputPath)
  if (!raw?.variants || Object.keys(raw.variants).length === 0) {
    return { success: false, outputPath, error: `Generated artifact is missing variants: ${outputPath}` }
  }

  const variants = normalizeVariants(raw)
  const pagesData = {
    generatedAt: raw.generatedAt,
    keycloakTag: raw.keycloakTag,
    variants,
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(pagesData, null, 2)}\n`, 'utf8')

  log('Preview generation complete.\n')
  return { success: true, outputPath, pagesData }
}

// Direct invocation: `tsx tools/generate-preview.ts`
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('tools/generate-preview.ts')
  || process.argv[1]?.replace(/\\/g, '/').endsWith('tools/generate-preview')
if (isDirectRun) {
  generatePreview().then((result) => {
    if (!result.success) {
      process.exitCode = 1
    }
  })
}
