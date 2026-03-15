import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { JSDOM } from 'jsdom'
import kcBaseMocks from './kc-base-mocks.ts'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function deepMerge<T extends Record<string, unknown>>(target: T, ...sources: Array<Record<string, unknown> | undefined>): T {
  const result = { ...target } as Record<string, unknown>
  for (const source of sources) {
    if (!isPlainObject(source))
      continue
    for (const [key, value] of Object.entries(source)) {
      if (isPlainObject(value) && isPlainObject(result[key])) {
        result[key] = deepMerge(result[key] as Record<string, unknown>, value)
      }
      else {
        result[key] = value
      }
    }
  }
  return result as T
}

const MIN_JAVA = 8
const isWindows = process.platform === 'win32'
const SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi

export interface ContextMocks {
  pages: Record<string, Record<string, unknown>>
}

export interface UserMocks {
  pages: Record<string, Record<string, unknown>>
  states: Record<string, Record<string, Record<string, unknown>>>
}

export interface GeneratePreviewOptions {
  /** Root of the npm package (where public/, tools/ etc. live). Defaults to cwd. */
  packageRoot?: string
  /** Path to a pre-built fat JAR. When set, uses `java -jar` instead of Maven. */
  jarPath?: string
  /** Where to write the output pages.json. Defaults to src/features/preview/generated/pages.json */
  outputPath?: string
  /** User page overrides and states loaded from kc-page.ts / kc-page-state.ts. */
  userMocks?: UserMocks
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

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const builtInStates: Record<string, Record<string, Record<string, unknown>>> = {
  'login.ftl': {
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

export function resolveContextMocks(userMocks?: UserMocks): ContextMocks {
  const baseMocks = cloneJson(kcBaseMocks) as Record<string, Record<string, unknown>>
  const pages: Record<string, Record<string, unknown>> = {}
  const loginBase = baseMocks['login.ftl']

  // Process all base mock pages
  for (const [pageId, baseMock] of Object.entries(baseMocks)) {
    const merged = deepMerge(baseMock, userMocks?.pages[pageId])
    pages[pageId] = cloneJson(merged)

    for (const [stateId, stateOverride] of Object.entries(builtInStates[pageId] ?? {})) {
      pages[`${pageId}@${stateId}`] = cloneJson(deepMerge(merged, stateOverride))
    }

    for (const [stateId, stateOverride] of Object.entries(userMocks?.states[pageId] ?? {})) {
      pages[`${pageId}@${stateId}`] = cloneJson(deepMerge(merged, stateOverride))
    }
  }

  // Process user-only pages (custom .ftl pages not in base mocks)
  if (userMocks) {
    for (const [pageId, userOverride] of Object.entries(userMocks.pages)) {
      if (pages[pageId])
        continue
      const merged = deepMerge(cloneJson(loginBase), { pageId }, userOverride)
      pages[pageId] = cloneJson(merged)

      for (const [stateId, stateOverride] of Object.entries(userMocks.states[pageId] ?? {})) {
        pages[`${pageId}@${stateId}`] = cloneJson(deepMerge(merged, stateOverride))
      }
    }
  }

  return { pages }
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

function ensureQuickStartElement(params: {
  doc: Document
  container: Element
  id: string
  state: string
  tagName: keyof HTMLElementTagNameMap
  fallbackText?: string
}): HTMLElement {
  const { doc, container, id, state, tagName, fallbackText } = params
  let placeholder = doc.querySelector<HTMLElement>(`#${id}[data-kc-state="${state}"]`)
    ?? doc.getElementById(id) as HTMLElement | null
  if (!placeholder) {
    placeholder = doc.createElement(tagName)
    placeholder.id = id
    container.appendChild(placeholder)
  }
  placeholder.setAttribute('data-kc-state', state)
  if (!placeholder.isConnected) {
    container.appendChild(placeholder)
  }
  if (fallbackText && !placeholder.textContent?.trim()) {
    placeholder.textContent = fallbackText
  }
  return placeholder
}

function ensureFooterLinkContainer(doc: Document): Element {
  const existing = doc.querySelector('[data-kc-state="footer-legal-links"], .kc-footer-legal-links')
    ?? doc.querySelector('a[data-kc-state="imprint-link"], a#kc-imprint-link, a[data-kc-state="data-protection-link"], a#kc-data-protection-link')?.parentElement
    ?? doc.querySelector('.kc-horizontal-card-footer-row')
    ?? doc.querySelector('#kc-info')
    ?? doc.body

  if (!existing) {
    return doc.body
  }

  if (existing.matches('a[data-kc-state="imprint-link"], a#kc-imprint-link, a[data-kc-state="data-protection-link"], a#kc-data-protection-link')) {
    return existing.parentElement ?? doc.body
  }

  if (existing.classList?.contains('kc-footer-legal-links') || existing.getAttribute('data-kc-state') === 'footer-legal-links') {
    return existing
  }

  let wrapper = doc.querySelector<HTMLElement>('[data-kc-state="footer-legal-links"], .kc-footer-legal-links')
  if (!wrapper) {
    wrapper = doc.createElement('div')
    wrapper.className = 'kc-footer-legal-links'
    wrapper.setAttribute('data-kc-state', 'footer-legal-links')
    if (!existing.isConnected) {
      doc.body.appendChild(wrapper)
    }
    else {
      existing.appendChild(wrapper)
    }
  }

  return wrapper
}

function injectQuickStartPlaceholders(html: string): string {
  const dom = new JSDOM(html)
  const { document } = dom.window

  const headerWrapper = document.querySelector<HTMLElement>('#kc-header-wrapper')
  if (headerWrapper) {
    const headerText = headerWrapper.textContent?.trim() || ''
    if (!headerWrapper.querySelector('#kc-realm-name, #kc-client-name')) {
      headerWrapper.textContent = ''
    }
    const realmNode = ensureQuickStartElement({
      doc: document,
      container: headerWrapper,
      id: 'kc-realm-name',
      state: 'realm-name',
      tagName: 'span',
      fallbackText: headerText || 'myrealm',
    })
    ensureQuickStartElement({
      doc: document,
      container: headerWrapper,
      id: 'kc-client-name',
      state: 'client-name',
      tagName: 'span',
      fallbackText: 'Client name',
    })
    if (realmNode.id && realmNode.tagName === 'SPAN' && headerText && !realmNode.textContent?.trim()) {
      realmNode.textContent = headerText
    }
  }

  const contentWrapper = document.querySelector<HTMLElement>('#kc-content-wrapper')
    ?? document.querySelector<HTMLElement>('#kc-content')
    ?? document.body
  const infoMessage = ensureQuickStartElement({
    doc: document,
    container: contentWrapper as Element,
    id: 'kc-info-message',
    state: 'info-message',
    tagName: 'div',
    fallbackText: '',
  })
  const infoMessageText = document.querySelector('[data-kc-state="info-message-text"]') as HTMLElement | null
    ?? infoMessage.querySelector('.kc-feedback-text') as HTMLElement | null
  if (infoMessageText) {
    infoMessageText.setAttribute('data-kc-state', 'info-message-text')
  }
  else {
    const span = document.createElement('span')
    span.setAttribute('data-kc-state', 'info-message-text')
    span.className = 'kcAlertTitleClass kc-feedback-text'
    infoMessage.appendChild(span)
  }
  infoMessage.removeAttribute('data-kc-i18n-key')

  const legalWrapper = ensureFooterLinkContainer(document)
  const imprintLink = ensureQuickStartElement({
    doc: document,
    container: legalWrapper,
    id: 'kc-imprint-link',
    state: 'imprint-link',
    tagName: 'a',
    fallbackText: 'Imprint',
  }) as HTMLAnchorElement
  imprintLink.href = '#'
  imprintLink.target = '_blank'
  imprintLink.rel = 'noopener noreferrer'
  imprintLink.style.display = 'none'

  const dataProtectionLink = ensureQuickStartElement({
    doc: document,
    container: legalWrapper,
    id: 'kc-data-protection-link',
    state: 'data-protection-link',
    tagName: 'a',
    fallbackText: 'Data Protection',
  }) as HTMLAnchorElement
  dataProtectionLink.href = '#'
  dataProtectionLink.target = '_blank'
  dataProtectionLink.rel = 'noopener noreferrer'
  dataProtectionLink.style.display = 'none'

  return dom.serialize()
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

function resolveExistingPath(packageRoot: string, candidates: string[]): string {
  for (const relativePath of candidates) {
    const resolvedPath = path.join(packageRoot, relativePath)
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath
    }
  }

  return path.join(packageRoot, candidates[0])
}

function writeTempContextMocksFile(
  userMocks?: UserMocks,
): { tempDir: string, filePath: string } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-context-mocks-'))
  const filePath = path.join(tempDir, 'kc-context-mocks.json')
  const mocks = resolveContextMocks(userMocks)
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
  const inputRoot = resolveExistingPath(packageRoot, ['dist/keycloak-upstream', 'public/keycloak-upstream'])
  const overridesRoot = resolveExistingPath(packageRoot, ['dist/keycloak-dev-resources/themes', 'public/keycloak-dev-resources/themes'])
  const args = [
    '-jar',
    jarPath,
    `--context-mocks=${toForwardSlashPath(contextMocksPath)}`,
    `--input=${toForwardSlashPath(inputRoot)}`,
    `--overrides=${toForwardSlashPath(overridesRoot)}`,
    `--presets=${toForwardSlashPath(overridesRoot)}`,
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

function validateStateHtmlContract(params: {
  variantId: string
  pageId: string
  stateId: string
  html: string
}) {
  const { variantId, pageId, stateId, html } = params
  const trimmed = html.trim()
  if (!/<html\b/i.test(trimmed) || !/<body\b/i.test(trimmed)) {
    throw new Error(
      `Invalid preview state markup for ${variantId}/${pageId}/${stateId}: expected a full HTML document with <html> and <body>.`,
    )
  }

  const match = trimmed.match(/<body\b[^>]+\bdata-page-id\s*=\s*(['"])([^'"]+)\1/i)
  if (!match) {
    throw new Error(
      `Invalid preview state markup for ${variantId}/${pageId}/${stateId}: missing body[data-page-id].`,
    )
  }

  const actualPageId = match[2]
  const expectedPageId = resolveExpectedDataPageId(pageId)
  if (actualPageId !== expectedPageId) {
    throw new Error(
      `Invalid preview state markup for ${variantId}/${pageId}/${stateId}: expected data-page-id="${expectedPageId}", got "${actualPageId}".`,
    )
  }
}

function normalizeStatesForPage(params: {
  variantId: string
  pageId: string
  rawPage: unknown
}): Record<string, string> {
  const { variantId, pageId, rawPage } = params
  if (!rawPage || typeof rawPage !== 'object' || Array.isArray(rawPage)) {
    throw new Error(`Invalid preview page payload for ${variantId}/${pageId}: expected state object.`)
  }

  const rawStates = rawPage as Record<string, unknown>
  if (typeof rawStates.default !== 'string') {
    throw new TypeError(`Invalid preview page payload for ${variantId}/${pageId}: missing default state.`)
  }

  const normalizedStates: Record<string, string> = {}
  for (const [stateId, stateHtml] of Object.entries(rawStates)) {
    if (typeof stateHtml !== 'string') {
      throw new TypeError(`Invalid preview state payload for ${variantId}/${pageId}/${stateId}: expected string HTML.`)
    }
    const sanitizedStateHtml = injectQuickStartPlaceholders(stripScriptTags(stateHtml))
    validateStateHtmlContract({
      variantId,
      pageId,
      stateId,
      html: sanitizedStateHtml,
    })
    normalizedStates[stateId] = sanitizedStateHtml
  }

  return normalizedStates
}

function normalizeVariants(raw: any): Record<string, Record<string, Record<string, string>>> {
  const variants: Record<string, Record<string, Record<string, string>>> = {}
  for (const [variantId, pages] of Object.entries(raw.variants as Record<string, Record<string, unknown>>)) {
    const variantPages: Record<string, Record<string, string>> = {}
    for (const [pageId, rawPage] of Object.entries((pages ?? {}) as Record<string, unknown>)) {
      variantPages[pageId] = normalizeStatesForPage({
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
export async function generatePreview(options: GeneratePreviewOptions): Promise<GeneratePreviewResult> {
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

  let tempArtifacts: { tempDir: string, filePath: string }
  try {
    tempArtifacts = writeTempContextMocksFile(options.userMocks)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    return { success: false, outputPath, error: message }
  }

  const { tempDir, filePath } = tempArtifacts

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
  generatePreview({
    packageRoot: process.cwd(),
  }).then((result) => {
    if (!result.success) {
      process.exitCode = 1
    }
  })
}
