import { createServer } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { program } from 'commander'
import open from 'open'
import sirv from 'sirv'
import { watch } from 'chokidar'
import { createJiti } from 'jiti'
import { generatePreview, getJavaMajorVersion, type ContextMocks } from '../tools/generate-preview'

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..')
const DEFAULT_PORT = 4800
const MIN_JAVA = 25

// SSE clients for live reload
const sseClients: Set<import('node:http').ServerResponse> = new Set()

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'target', '.next', '.nuxt'])
const MAX_DISCOVERY_DEPTH = 5

function findThemeDirs(dir: string, depth: number): string[] {
  if (depth <= 0) return []
  const results: string[] = []
  if (fs.existsSync(path.join(dir, 'login', 'theme.properties'))) {
    results.push(dir)
  }
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
  catch { return results }
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
    results.push(...findThemeDirs(path.join(dir, entry.name), depth - 1))
  }
  return results
}

function resolveUserPagesDir(pagesArg?: string): string | undefined {
  if (pagesArg) {
    const resolved = path.resolve(pagesArg)
    if (!fs.existsSync(resolved)) {
      console.error(`Pages directory not found: ${resolved}`)
      process.exit(1)
    }
    return resolved
  }

  // Convention discovery — recursively look for a directory containing login/theme.properties
  const cwd = process.cwd()
  const found = findThemeDirs(cwd, MAX_DISCOVERY_DEPTH)

  if (found.length === 1) {
    console.log(`Auto-discovered theme directory: ${found[0]}`)
    return found[0]
  }
  if (found.length > 1) {
    console.log(`Found multiple theme directories:`)
    for (const dir of found) {
      console.log(`  - ${dir}`)
    }
    console.log(`Use --pages to specify which one to use.`)
  }

  return undefined
}

async function loadUserMocks(pagesDir: string): Promise<ContextMocks | undefined> {
  const kcPagePath = path.join(pagesDir, 'kc-page.ts')
  const kcPageJsPath = path.join(pagesDir, 'kc-page.js')
  const userPageFile = fs.existsSync(kcPagePath)
    ? kcPagePath
    : fs.existsSync(kcPageJsPath) ? kcPageJsPath : null

  if (!userPageFile) {
    return undefined
  }

  console.log(`Loading user page mocks from: ${userPageFile}`)

  const jiti = createJiti(pagesDir, { interopDefault: true })

  let userPage: {
    getKcContextMock?: (params: { pageId: string, overrides?: Record<string, unknown> }) => Record<string, unknown>
    kcContextMocks?: Array<{ pageId: string }>
  }

  try {
    userPage = await jiti.import(userPageFile) as typeof userPage
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('Cannot find module')) {
      console.warn(`Warning: Failed to load ${path.basename(userPageFile)} — missing dependency.`)
      console.warn('  Make sure keycloakify is installed: npm install keycloakify')
    } else {
      console.warn(`Warning: Failed to load ${path.basename(userPageFile)}: ${message}`)
    }
    console.warn('  Continuing without user mocks.\n')
    return undefined
  }

  if (!userPage.getKcContextMock || !userPage.kcContextMocks) {
    console.warn('Warning: kc-page.ts must export getKcContextMock and kcContextMocks. Skipping user mocks.')
    return undefined
  }

  // Load user stories if available
  const storyPath = path.join(pagesDir, 'kc-page-story.ts')
  const storyJsPath = path.join(pagesDir, 'kc-page-story.js')
  const storyFile = fs.existsSync(storyPath)
    ? storyPath
    : fs.existsSync(storyJsPath) ? storyJsPath : null

  let userStories: Record<string, Record<string, Record<string, unknown>>> = {}
  if (storyFile) {
    const storyModule = await jiti.import(storyFile) as {
      stories?: Record<string, Record<string, Record<string, unknown>>>
    }
    userStories = storyModule.stories ?? {}
  }

  // Build context mocks from user's pages
  const pages: Record<string, Record<string, unknown>> = {}
  for (const mock of userPage.kcContextMocks) {
    const name = mock.pageId.replace('.ftl', '')
    pages[name] = JSON.parse(JSON.stringify(
      userPage.getKcContextMock({ pageId: mock.pageId }),
    ))

    // Add story variants
    for (const [storyId, override] of Object.entries(userStories[name] ?? {})) {
      pages[`${name}@${storyId}`] = JSON.parse(JSON.stringify(
        userPage.getKcContextMock({ pageId: mock.pageId, overrides: override }),
      ))
    }
  }

  return { common: {}, pages }
}

function broadcastSSE(event: string, data?: string) {
  const message = `event: ${event}\ndata: ${data ?? ''}\n\n`
  for (const client of sseClients) {
    client.write(message)
  }
}

const ASSET_BUCKETS: ReadonlyArray<[string, string]> = [
  ['uploadedFonts', 'fonts'],
  ['uploadedBackgrounds', 'img/backgrounds'],
  ['uploadedLogos', 'img/logos'],
  ['uploadedImages', 'img/assets'],
]

function readRequestBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function isValidPathSegment(value: string, opts?: { allowDots?: boolean }): boolean {
  if (!value) return false
  if (value === '.' || value === '..') return false
  if (value.includes('/') || value.includes('\\')) return false

  const pattern = opts?.allowDots
    ? /^[A-Za-z0-9][A-Za-z0-9._-]*$/
    : /^[A-Za-z0-9][A-Za-z0-9_-]*$/

  return pattern.test(value)
}

function writeThemeFiles(exportDir: string, themeName: string, variantId: string | undefined, data: any): string {
  const variantRoot = variantId
    ? path.join(exportDir, variantId)
    : path.join(exportDir, themeName)
  const loginDir = path.join(variantRoot, 'login')
  const cssDir = path.join(loginDir, 'resources', 'css')
  const messagesDir = path.join(loginDir, 'messages')

  fs.mkdirSync(cssDir, { recursive: true })
  fs.mkdirSync(messagesDir, { recursive: true })

  fs.writeFileSync(path.join(loginDir, 'theme.properties'), data.properties, 'utf8')
  if (data.templateFtl) {
    fs.writeFileSync(path.join(loginDir, 'template.ftl'), data.templateFtl, 'utf8')
  }
  if (data.footerFtl) {
    fs.writeFileSync(path.join(loginDir, 'footer.ftl'), data.footerFtl, 'utf8')
  }
  fs.writeFileSync(path.join(cssDir, 'quick-start.css'), data.quickStartCss, 'utf8')
  fs.writeFileSync(path.join(cssDir, 'styles.css'), data.stylesCss, 'utf8')
  fs.writeFileSync(path.join(messagesDir, 'messages.properties'), data.messagesContent, 'utf8')
  fs.writeFileSync(path.join(messagesDir, 'messages_en.properties'), data.messagesContent, 'utf8')

  // Write binary assets
  const payload = data.payload
  if (payload) {
    for (const [key, subdir] of ASSET_BUCKETS) {
      const assets = payload[key] as any[] | undefined
      if (!assets?.length) continue
      const assetDir = path.join(loginDir, 'resources', subdir)
      fs.mkdirSync(assetDir, { recursive: true })
      const seen = new Set<string>()
      for (const asset of assets) {
        if (seen.has(asset.name)) continue
        seen.add(asset.name)
        fs.writeFileSync(path.join(assetDir, asset.name), Buffer.from(asset.base64Data, 'base64'))
      }
    }
    if (payload.appliedFavicon) {
      const imgDir = path.join(loginDir, 'resources', 'img')
      fs.mkdirSync(imgDir, { recursive: true })
      fs.writeFileSync(path.join(imgDir, 'favicon.ico'), Buffer.from(payload.appliedFavicon.base64Data, 'base64'))
    }
  }

  return variantRoot
}

function startServer(opts: {
  port: number
  distDir: string
  pagesJsonPath: string
  publicDir: string
  exportDir: string
  userThemeMapping?: { urlPrefix: string, localDir: string }
}) {
  const { port, distDir, pagesJsonPath, publicDir, exportDir, userThemeMapping } = opts

  // Static file servers
  const serveDist = sirv(distDir, { single: true, dev: true })
  const servePublic = sirv(publicDir, { dev: true })
  const serveUserTheme = userThemeMapping
    ? sirv(userThemeMapping.localDir, { dev: true })
    : null

  const server = createServer((req, res) => {
    const url = req.url ?? '/'

    // API: serve generated pages.json
    if (url === '/api/pages.json') {
      if (!fs.existsSync(pagesJsonPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'pages.json not generated yet' }))
        return
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      })
      fs.createReadStream(pagesJsonPath).pipe(res)
      return
    }

    // API: save theme to project directory
    if (url === '/api/save-theme' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ available: true, cwd: exportDir }))
      return
    }
    if (url === '/api/save-theme' && req.method === 'POST') {
      readRequestBody(req).then((raw) => {
        try {
          const body = JSON.parse(raw)
          const themeName = body.themeName
          const variantId = body.variantId
          if (!isValidPathSegment(themeName)) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, error: 'Invalid theme name' }))
            return
          }
          if (variantId !== undefined && !isValidPathSegment(variantId, { allowDots: true })) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, error: 'Invalid variant id' }))
            return
          }
          const writtenPath = writeThemeFiles(exportDir, themeName, variantId, body)
          console.log(`Theme saved to: ${writtenPath}`)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, path: writtenPath }))
        }
        catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('Save theme error:', message)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: message }))
        }
      }).catch(() => {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'Failed to read request body' }))
      })
      return
    }

    // SSE endpoint for live reload
    if (url === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      res.write('event: connected\ndata: \n\n')
      sseClients.add(res)
      req.on('close', () => sseClients.delete(res))
      return
    }

    // Serve user theme resources (must be checked before general public/ handler)
    if (serveUserTheme && userThemeMapping && url.startsWith(userThemeMapping.urlPrefix)) {
      req.url = url.slice(userThemeMapping.urlPrefix.length) || '/'
      serveUserTheme(req, res, () => {
        res.writeHead(404)
        res.end('Not found')
      })
      return
    }

    // Serve public/ assets (keycloak-upstream, keycloak-dev-resources)
    if (url.startsWith('/keycloak-upstream/') || url.startsWith('/keycloak-dev-resources/')) {
      servePublic(req, res, () => {
        res.writeHead(404)
        res.end('Not found')
      })
      return
    }

    // Serve the pre-built SPA (with SPA fallback to index.html)
    serveDist(req, res, () => {
      res.writeHead(404)
      res.end('Not found')
    })
  })

  server.listen(port, () => {
    console.log(`\n  Keycloak Theme Editor running at:\n`)
    console.log(`    http://localhost:${port}\n`)
  })

  return server
}

function startWatcher(opts: {
  pagesDir: string
  jarPath: string
  outputPath: string
  additionalMocks?: ContextMocks
  requiredVariantId?: string
}) {
  const { pagesDir, jarPath, outputPath, additionalMocks, requiredVariantId } = opts
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const watcher = watch(pagesDir, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../, // ignore dotfiles
  })

  async function regenerate() {
    console.log('File change detected, regenerating previews...')
    const previousPagesJson = fs.existsSync(outputPath)
      ? fs.readFileSync(outputPath, 'utf8')
      : null

    const result = await generatePreview({
      packageRoot: PACKAGE_ROOT,
      jarPath,
      outputPath,
      additionalMocks,
      quiet: true,
    })

    if (result.success && requiredVariantId) {
      const variantPages = result.pagesData?.variants?.[requiredVariantId]
      if (!variantPages || Object.keys(variantPages).length === 0) {
        console.error(
          `Preview regeneration rejected: required variant "${requiredVariantId}" is missing. Keeping previous previews.`,
        )
        if (previousPagesJson !== null) {
          try {
            fs.writeFileSync(outputPath, previousPagesJson, 'utf8')
          }
          catch (restoreError) {
            const message = restoreError instanceof Error ? restoreError.message : String(restoreError)
            console.error(`Failed to restore previous previews: ${message}`)
          }
        }
        return
      }
    }

    if (result.success) {
      console.log('Previews regenerated.')
      broadcastSSE('pages-updated')
    }
    else {
      console.error('Preview regeneration failed:', result.error)
    }
  }

  watcher.on('all', (_event, filePath) => {
    if (!filePath.endsWith('.ftl') && !filePath.endsWith('.properties')) {
      return
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(regenerate, 300)
  })

  return watcher
}

function initProject(pagesArg?: string) {
  // Resolve target directory: explicit arg, or auto-discover existing theme dir
  const pagesDir = pagesArg
    ? path.resolve(pagesArg)
    : resolveUserPagesDir() ?? process.cwd()

  if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true })
    console.log(`Created pages directory: ${pagesDir}`)
  }

  const kcPagePath = path.join(pagesDir, 'kc-page.ts')
  const kcStoryPath = path.join(pagesDir, 'kc-page-story.ts')

  if (fs.existsSync(kcPagePath)) {
    console.log(`Already exists, skipping: ${kcPagePath}`)
  }
  else {
    fs.writeFileSync(kcPagePath, `import { createGetKcContextMock } from "keycloakify/login/KcContext";
export { kcContextMocks } from "keycloakify/login/KcContext/kcContextMocks";

export const { getKcContextMock } = createGetKcContextMock({
  kcContextExtension: { properties: {} },
  overrides: {
    url: {
      resourcesPath: "/keycloak-dev-resources",
      resourcesCommonPath: "/keycloak-dev-resources/resources-common",
    },
  },
  kcContextExtensionPerPage: {
    // Add custom page context here:
    // "my-custom-page.ftl": { myField: "value" },
  },
  overridesPerPage: {},
});
`)
    console.log(`Created: ${kcPagePath}`)
  }

  if (fs.existsSync(kcStoryPath)) {
    console.log(`Already exists, skipping: ${kcStoryPath}`)
  }
  else {
    fs.writeFileSync(kcStoryPath, `// Define story variants for different page states.
// Each story renders the page with different mock context values.
export const stories: Record<string, Record<string, Record<string, unknown>>> = {
  // Example:
  // "login": {
  //   "with-error": {
  //     message: { type: "error", summary: "Invalid credentials" },
  //   },
  // },
};
`)
    console.log(`Created: ${kcStoryPath}`)
  }

  console.log('\nNext steps:')
  console.log('  npm install keycloakify           — install keycloakify (if not already)')
  console.log('  npx keycloak-theme-editor         — start the editor')
  console.log('')
}

async function startEditor(opts: { pages?: string, port: string, open: boolean }) {
  const port = Number.parseInt(opts.port, 10)
  const userPagesDir = resolveUserPagesDir(opts.pages)

  // Check Java
  const javaVersion = getJavaMajorVersion()
  if (!javaVersion || javaVersion < MIN_JAVA) {
    console.error(`Java ${MIN_JAVA}+ is required (found ${javaVersion ?? 'none'}).`)
    console.error('Install Java and ensure it is on your PATH, or set JAVA_HOME.')
    process.exit(1)
  }

  // Resolve paths
  const jarPath = path.join(PACKAGE_ROOT, 'tools', 'preview-renderer', 'preview-renderer.jar')
  const distDir = path.join(PACKAGE_ROOT, 'dist')
  const publicDir = path.join(PACKAGE_ROOT, 'public')

  // Output pages.json to a temp location (not inside src/)
  const outputDir = fs.mkdtempSync(path.join(import.meta.dirname, '.preview-'))
  const pagesJsonPath = path.join(outputDir, 'pages.json')

  if (!fs.existsSync(jarPath)) {
    console.error(`Renderer JAR not found at ${jarPath}`)
    console.error('Run "npm run build:jar" first, or reinstall the package.')
    process.exit(1)
  }

  if (!fs.existsSync(distDir)) {
    console.error(`Built SPA not found at ${distDir}`)
    console.error('Run "npm run build" first, or reinstall the package.')
    process.exit(1)
  }

  // Load user page mocks if available
  let additionalMocks: ContextMocks | undefined
  if (userPagesDir) {
    additionalMocks = await loadUserMocks(userPagesDir)
  }

  // Generate preview pages
  console.log('Generating preview pages...')
  const result = await generatePreview({
    packageRoot: PACKAGE_ROOT,
    jarPath,
    outputPath: pagesJsonPath,
    additionalMocks,
    userThemeDir: userPagesDir,
  })

  if (!result.success) {
    console.error('Failed to generate previews:', result.error)
    process.exit(1)
  }

  // Build user theme resource mapping for the dev server
  let userThemeMapping: { urlPrefix: string, localDir: string } | undefined
  if (userPagesDir) {
    const variantId = path.basename(userPagesDir)
    const urlPrefix = `/keycloak-dev-resources/themes/${variantId}/login/resources`
    const localDir = path.join(userPagesDir, 'login', 'resources')
    if (fs.existsSync(localDir)) {
      userThemeMapping = { urlPrefix, localDir }
    }
  }

  // In projects with an existing variant folder (e.g. .../theme/custom.v2),
  // save exports into the parent theme root (e.g. .../theme).
  const exportDir = userPagesDir ? path.dirname(userPagesDir) : process.cwd()

  // Start HTTP server
  startServer({ port, distDir, pagesJsonPath, publicDir, exportDir, userThemeMapping })

  // Start file watcher if user has a pages dir
  if (userPagesDir) {
    startWatcher({
      pagesDir: userPagesDir,
      jarPath,
      outputPath: pagesJsonPath,
      additionalMocks,
      requiredVariantId: path.basename(userPagesDir),
    })
    console.log(`  Watching for changes in: ${userPagesDir}`)
  }

  // Open browser
  if (opts.open) {
    await open(`http://localhost:${port}`)
  }

  // Cleanup on exit
  process.on('SIGINT', () => {
    fs.rmSync(outputDir, { recursive: true, force: true })
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    fs.rmSync(outputDir, { recursive: true, force: true })
    process.exit(0)
  })
}

async function main() {
  program
    .name('keycloak-theme-editor')
    .description('Visual theme editor for Keycloak login pages')
    .option('--pages <dir>', 'Path to custom FTL pages directory')
    .option('--port <number>', 'Port to run the editor on', String(DEFAULT_PORT))
    .option('--no-open', 'Do not open browser automatically')
    .action(async (opts: { pages?: string, port: string, open: boolean }) => {
      await startEditor(opts)
    })

  program
    .command('init [pages-dir]')
    .description('Add kc-page.ts and kc-page-story.ts to your pages directory')
    .action((pagesDir?: string) => {
      initProject(pagesDir)
      process.exit(0)
    })

  await program.parseAsync()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
