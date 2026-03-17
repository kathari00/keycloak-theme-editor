import type { UserMocks } from '../tools/generate-preview'
import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { watch } from 'chokidar'
import { program } from 'commander'
import { createJiti } from 'jiti'
import { generatePreview, getJavaMajorVersion } from '../tools/generate-preview'

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..')
const DEFAULT_PORT = 4800
const MIN_JAVA = 8

const sseClients: Set<import('node:http').ServerResponse> = new Set()
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'target', '.next', '.nuxt'])
const MAX_DISCOVERY_DEPTH = 5

function readEditorPackageJson(): { version: string } {
  return JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'))
}

function isThemeDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'login', 'theme.properties'))
}

function collectThemeDirs(dir: string, depth: number, includeCurrent = true): string[] {
  if (depth <= 0 || !fs.existsSync(dir))
    return []

  const results: string[] = []
  if (includeCurrent && isThemeDir(dir)) {
    results.push(dir)
  }

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  }
  catch {
    return results
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name) || entry.name.startsWith('.'))
      continue
    results.push(...collectThemeDirs(path.join(dir, entry.name), depth - 1, true))
  }

  return results
}

function resolveExistingThemesRoot(themesRootArg: string): string {
  const resolved = path.resolve(themesRootArg)
  if (!fs.existsSync(resolved)) {
    console.error(`Themes root not found: ${resolved}`)
    process.exit(1)
  }
  return resolved
}

function resolveCliThemesRootArg(opts: { themesRoot?: string }): string {
  return opts.themesRoot?.trim() || process.cwd()
}

function getVariantId(themesRootDir: string, themeDir: string): string {
  const relative = path.relative(themesRootDir, themeDir)
  return relative ? relative.split(path.sep).join('/') : path.basename(themeDir)
}

function discoverThemeDirsIn(themesRootDir: string): string[] {
  return Array.from(new Set(collectThemeDirs(themesRootDir, MAX_DISCOVERY_DEPTH)))
    .sort((a, b) => getVariantId(themesRootDir, a).localeCompare(getVariantId(themesRootDir, b)))
}

async function loadUserMocks(pagesDir: string): Promise<UserMocks | undefined> {
  const userPageFile = path.join(pagesDir, 'kc-page.ts')
  if (!fs.existsSync(userPageFile))
    return undefined

  console.log(`Loading user page mocks from: ${userPageFile}`)

  const jiti = createJiti(pagesDir, {
    interopDefault: true,
    moduleCache: false,
    fsCache: false,
  })
  const userModule = await jiti.import(userPageFile) as {
    default?: { pages?: Record<string, Record<string, unknown>> }
  }
  if (!userModule?.default) {
    throw new Error(`Expected a default export from ${userPageFile}`)
  }

  let states: UserMocks['states'] = {}

  const stateFile = path.join(pagesDir, 'kc-page-state.ts')
  if (fs.existsSync(stateFile)) {
    const stateModule = await jiti.import(stateFile) as { default?: UserMocks['states'] }
    if (!stateModule?.default) {
      throw new Error(`Expected a default export from ${stateFile}`)
    }
    states = stateModule.default
  }

  return {
    pages: userModule.default.pages ?? {},
    states,
  }
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

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.ftl': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.properties': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function getRequestPath(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname
  }
  catch {
    return url.split('?')[0]?.split('#')[0] || '/'
  }
}

function isPathWithinRoot(rootDir: string, filePath: string): boolean {
  const relative = path.relative(rootDir, filePath)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function resolveStaticPath(rootDir: string, requestPath: string): string | null {
  let decodedPath = requestPath
  try {
    decodedPath = decodeURIComponent(requestPath)
  }
  catch {
    return null
  }

  const normalizedPath = decodedPath.replaceAll('\\', '/').replace(/^\/+/, '')
  const resolvedPath = path.resolve(rootDir, normalizedPath)
  if (!isPathWithinRoot(rootDir, resolvedPath)) {
    return null
  }
  return resolvedPath
}

function sendFile(res: import('node:http').ServerResponse, filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) {
      return false
    }
  }
  catch {
    return false
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': contentType })
  fs.createReadStream(filePath).pipe(res)
  return true
}

function serveStaticPath(
  res: import('node:http').ServerResponse,
  rootDir: string,
  requestPath: string,
): boolean {
  const resolvedPath = resolveStaticPath(rootDir, requestPath)
  if (!resolvedPath) {
    return false
  }

  let candidatePath = resolvedPath
  try {
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
      candidatePath = path.join(candidatePath, 'index.html')
    }
  }
  catch {
    return false
  }

  return sendFile(res, candidatePath)
}

function serveDistSpa(
  res: import('node:http').ServerResponse,
  distDir: string,
  requestPath: string,
) {
  if (requestPath !== '/' && serveStaticPath(res, distDir, requestPath)) {
    return
  }

  const indexPath = path.join(distDir, 'index.html')
  if (!sendFile(res, indexPath)) {
    res.writeHead(404)
    res.end('Not found')
  }
}

function openBrowser(url: string) {
  const platform = process.platform
  const command = platform === 'win32'
    ? 'cmd'
    : platform === 'darwin'
      ? 'open'
      : 'xdg-open'
  const args = platform === 'win32'
    ? ['/c', 'start', '', url]
    : [url]

  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' })
    child.on('error', () => {})
    child.unref()
  }
  catch {}
}

function isValidPathSegment(value: string, opts?: { allowDots?: boolean }): boolean {
  if (!value)
    return false
  if (value === '.' || value === '..')
    return false
  if (value.includes('/') || value.includes('\\'))
    return false

  const pattern = opts?.allowDots
    ? /^[A-Z0-9][\w.-]*$/i
    : /^[A-Z0-9][\w-]*$/i

  return pattern.test(value)
}

function isValidThemeVariantPath(value: string): boolean {
  if (!value)
    return false
  const segments = value.split('/').filter(Boolean)
  if (segments.length === 0)
    return false
  return segments.every(segment => isValidPathSegment(segment, { allowDots: true }))
}

function writeThemeFiles(
  exportDir: string,
  themeName: string,
  variantId: string | undefined,
  data: any,
  existingThemeDir?: string,
): string {
  const variantRoot = existingThemeDir || (variantId
    ? path.join(exportDir, ...variantId.split('/'))
    : path.join(exportDir, themeName))
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
  if (data.quickStartCss) {
    fs.writeFileSync(path.join(cssDir, 'quick-start.css'), data.quickStartCss, 'utf8')
  }

  if (data.stylesCssFiles && typeof data.stylesCssFiles === 'object' && Object.keys(data.stylesCssFiles).length > 0) {
    for (const [cssPath, cssContent] of Object.entries(data.stylesCssFiles)) {
      const fullPath = path.join(loginDir, 'resources', ...cssPath.split('/'))
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, cssContent as string, 'utf8')
    }
  }
  else {
    let stylesCssFilename = 'styles.css'
    try {
      const stylesMatch = data.properties.match(/^styles[ \t]*=[ \t]*(\S.*)$/m)
      if (stylesMatch) {
        const entries = stylesMatch[1].trim().split(/\s+/).filter((p: string) => p !== 'css/quick-start.css')
        if (entries.length === 1) {
          stylesCssFilename = path.basename(entries[0])
        }
      }
    }
    catch {}
    fs.writeFileSync(path.join(cssDir, stylesCssFilename), data.stylesCss, 'utf8')
  }

  fs.writeFileSync(path.join(messagesDir, 'messages.properties'), data.messagesContent, 'utf8')
  fs.writeFileSync(path.join(messagesDir, 'messages_en.properties'), data.messagesContent, 'utf8')

  const payload = data.payload
  if (payload) {
    for (const [key, subdir] of ASSET_BUCKETS) {
      const assets = payload[key] as any[] | undefined
      if (!assets?.length)
        continue
      const assetDir = path.join(loginDir, 'resources', subdir)
      fs.mkdirSync(assetDir, { recursive: true })
      const seen = new Set<string>()
      for (const asset of assets) {
        if (seen.has(asset.name))
          continue
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
  exportDir: string
  userThemeMappings?: Array<{ variantId: string, urlPrefix: string, localDir: string, parentThemeId?: string }>
}) {
  const { port, distDir, pagesJsonPath, exportDir, userThemeMappings } = opts

  const server = createServer((req, res) => {
    const url = req.url ?? '/'
    const requestPath = getRequestPath(url)

    if (requestPath === '/api/pages.json') {
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

    if (requestPath === '/api/save-theme' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ available: true, cwd: exportDir }))
      return
    }

    if (requestPath === '/api/save-theme' && req.method === 'POST') {
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
          if (variantId !== undefined && !isValidThemeVariantPath(variantId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, error: 'Invalid variant id' }))
            return
          }

          const existingThemeDir = typeof variantId === 'string'
            ? userThemeMappings?.find(mapping => mapping.variantId === variantId)?.localDir
            : undefined
          const writtenPath = writeThemeFiles(exportDir, themeName, variantId, body, existingThemeDir)
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

    if (requestPath === '/api/events') {
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

    if (userThemeMappings) {
      const mapping = userThemeMappings.find(m => requestPath.startsWith(m.urlPrefix))
      if (mapping) {
        const userThemePath = requestPath.slice(mapping.urlPrefix.length) || '/'
        if (!serveStaticPath(res, mapping.localDir, userThemePath)) {
          // Fall back to parent theme resources for files referenced in rendered HTML (e.g. inherited css/styles.css)
          if (mapping.parentThemeId) {
            const parentPath = `/keycloak-dev-resources/themes/${mapping.parentThemeId}/${userThemePath}`
            res.setHeader('X-Theme-Source', 'parent')
            if (!serveStaticPath(res, distDir, parentPath)) {
              res.writeHead(404)
              res.end('Not found')
            }
          }
          else {
            res.writeHead(404)
            res.end('Not found')
          }
        }
        return
      }
    }

    if (requestPath === '/keycloak-dev-resources/themes/themes.json' && userThemeMappings?.length) {
      const themesJsonPath = path.join(distDir, 'keycloak-dev-resources', 'themes', 'themes.json')
      try {
        const config = JSON.parse(fs.readFileSync(themesJsonPath, 'utf8'))
        const existingIds = new Set(config.themes.map((t: { id: string }) => t.id))
        for (const mapping of userThemeMappings) {
          if (!existingIds.has(mapping.variantId)) {
            config.themes.push({ id: mapping.variantId, name: mapping.variantId, description: '', type: 'imported', defaultAssets: [] })
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
        res.end(JSON.stringify(config))
      }
      catch {
        serveStaticPath(res, distDir, requestPath)
      }
      return
    }

    if (requestPath.startsWith('/keycloak-upstream/') || requestPath.startsWith('/keycloak-dev-resources/')) {
      if (!serveStaticPath(res, distDir, requestPath)) {
        res.writeHead(404)
        res.end('Not found')
      }
      return
    }

    serveDistSpa(res, distDir, requestPath)
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
  loadUserMocks: () => Promise<UserMocks | undefined>
  requiredVariantIds?: string[]
  userThemeDir?: string
}) {
  const { pagesDir, jarPath, outputPath, loadUserMocks, requiredVariantIds, userThemeDir } = opts
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const watcher = watch(pagesDir, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../,
  })

  async function regenerate() {
    console.log('File change detected, regenerating previews...')
    const previousPagesJson = fs.existsSync(outputPath)
      ? fs.readFileSync(outputPath, 'utf8')
      : null

    let userMocks: UserMocks | undefined
    try {
      userMocks = await loadUserMocks()
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Failed to load user mocks: ${message}`)
      return
    }

    const result = await generatePreview({
      packageRoot: PACKAGE_ROOT,
      jarPath,
      outputPath,
      userMocks,
      userThemeDir,
      quiet: true,
    })

    if (result.success && requiredVariantIds && requiredVariantIds.length > 0) {
      const missingVariants = requiredVariantIds.filter((id) => {
        const variantPages = result.pagesData?.variants?.[id]
        return !variantPages || Object.keys(variantPages).length === 0
      })
      if (missingVariants.length > 0) {
        console.error(
          `Preview regeneration rejected: required variant(s) ${missingVariants.map(v => `"${v}"`).join(', ')} missing. Keeping previous previews.`,
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
    const fileName = path.basename(filePath)
    if (!filePath.endsWith('.ftl')
      && !filePath.endsWith('.properties')
      && fileName !== 'kc-page.ts'
      && fileName !== 'kc-page-state.ts') {
      return
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(regenerate, 300)
  })

  return watcher
}

async function startEditor(opts: { themesRoot?: string, port: string, open: boolean }) {
  const port = Number.parseInt(opts.port, 10)
  const themesRootDir = resolveExistingThemesRoot(resolveCliThemesRootArg(opts))

  const javaVersion = getJavaMajorVersion()
  if (!javaVersion || javaVersion < MIN_JAVA) {
    console.error(`Java ${MIN_JAVA}+ is required (found ${javaVersion ?? 'none'}).`)
    console.error('Install Java and ensure it is on your PATH, or set JAVA_HOME.')
    process.exit(1)
  }

  const jarPath = path.join(PACKAGE_ROOT, 'tools', 'preview-renderer', 'preview-renderer.jar')
  const distDir = path.join(PACKAGE_ROOT, 'dist')
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

  const themeDirs = discoverThemeDirsIn(themesRootDir)
  if (themeDirs.length === 0) {
    console.error(`No themes found under themes root: ${themesRootDir}`)
    console.error('Expected directories containing login/theme.properties beneath the current working directory or --themes-root.')
    console.error('Run "npx keycloak-theme-editor init" to create a starter theme.')
    process.exit(1)
  }

  const loadThemeUserMocks = () => loadUserMocks(themesRootDir)
  const userMocks = await loadThemeUserMocks()

  console.log('Generating preview pages...')
  const result = await generatePreview({
    packageRoot: PACKAGE_ROOT,
    jarPath,
    outputPath: pagesJsonPath,
    userMocks,
    userThemeDir: themesRootDir,
  })

  if (!result.success) {
    console.error('Failed to generate previews:', result.error)
    process.exit(1)
  }

  const userThemeMappings: Array<{ variantId: string, urlPrefix: string, localDir: string, parentThemeId?: string }> = []
  for (const dir of themeDirs) {
    const variantId = getVariantId(themesRootDir, dir)
    const urlPrefix = `/keycloak-dev-resources/themes/${variantId}/`
    if (fs.existsSync(path.join(dir, 'login'))) {
      let parentThemeId: string | undefined
      const propsPath = path.join(dir, 'login', 'theme.properties')
      if (fs.existsSync(propsPath)) {
        const parentMatch = fs.readFileSync(propsPath, 'utf8').match(/^parent\s*=\s*(.+)/m)
        if (parentMatch) {
          parentThemeId = parentMatch[1].trim().replace(/^keycloak\./, '')
        }
      }
      userThemeMappings.push({ variantId, urlPrefix, localDir: dir, parentThemeId })
    }
  }

  userThemeMappings.sort((a, b) => b.urlPrefix.length - a.urlPrefix.length)
  const exportDir = themesRootDir

  startServer({ port, distDir, pagesJsonPath, exportDir, userThemeMappings })

  const requiredVariantIds = themeDirs.map(dir => getVariantId(themesRootDir, dir))
  startWatcher({
    pagesDir: themesRootDir,
    jarPath,
    outputPath: pagesJsonPath,
    loadUserMocks: loadThemeUserMocks,
    requiredVariantIds,
    userThemeDir: themesRootDir,
  })
  console.log(`  Watching for changes in: ${themesRootDir}`)

  if (opts.open) {
    openBrowser(`http://localhost:${port}`)
  }

  const cleanup = () => {
    fs.rmSync(outputDir, { recursive: true, force: true })
    process.exit(0)
  }
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}

const KC_PAGE_TEMPLATE = `import { defineConfig } from 'keycloak-theme-editor'

export default defineConfig({
  pages: {
    // Use the full page id, for example: "login.ftl".
    // 'login.ftl': {},
  },
})
`

const THEME_PROPERTIES_TEMPLATE = `parent=keycloak.v2
import=common/keycloak
`

const THEME_STYLES_CSS_TEMPLATE = ``

const KC_PAGE_STATE_TEMPLATE = `import { defineStates } from 'keycloak-theme-editor'

export default defineStates({
  // Add scenarios under a full page id, for example:
  // 'login.ftl': {
  //   example: {},
  // },
})
`

function initMockFiles(opts: { themesRoot?: string }) {
  const targetDir = resolveCliThemesRootArg(opts)
  fs.mkdirSync(targetDir, { recursive: true })

  const { version: editorVersion } = readEditorPackageJson()

  const pkgPath = path.join(targetDir, 'package.json')
  const hadPackageJson = fs.existsSync(pkgPath)
  const pkg: Record<string, unknown> = hadPackageJson
    ? JSON.parse(fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, ''))
    : { private: true, type: 'module' }
  const scripts = (pkg.scripts ?? {}) as Record<string, string>
  pkg.scripts = { ...scripts, start: scripts.start ?? 'keycloak-theme-editor' }
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
  console.log(`  ${hadPackageJson ? 'Updated' : 'Created'}: ${pkgPath}`)

  const themeDir = path.join(targetDir, 'my-theme', 'login')
  const themePropertiesPath = path.join(themeDir, 'theme.properties')
  const stylesCssPath = path.join(themeDir, 'resources', 'css', 'custom.css')

  if (!fs.existsSync(themePropertiesPath)) {
    fs.mkdirSync(path.dirname(stylesCssPath), { recursive: true })
    fs.writeFileSync(themePropertiesPath, THEME_PROPERTIES_TEMPLATE, 'utf8')
    console.log(`  Created: ${themePropertiesPath}`)
    fs.writeFileSync(stylesCssPath, THEME_STYLES_CSS_TEMPLATE, 'utf8')
    console.log(`  Created: ${stylesCssPath}`)
  }
  else {
    console.log(`  Already exists: ${themePropertiesPath}`)
  }

  const files: Array<[string, string]> = [
    [path.join(targetDir, 'kc-page.ts'), KC_PAGE_TEMPLATE],
    [path.join(targetDir, 'kc-page-state.ts'), KC_PAGE_STATE_TEMPLATE],
  ]

  for (const [filePath, content] of files) {
    if (fs.existsSync(filePath)) {
      console.log(`  Already exists: ${filePath}`)
    }
    else {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`  Created: ${filePath}`)
    }
  }

  console.log('\nInstalling dependencies...')
  const npmInstall = spawn('npm', ['install', '-D', `keycloak-theme-editor@^${editorVersion}`], {
    cwd: targetDir,
    stdio: 'inherit',
    shell: true,
  })
  npmInstall.on('close', (code) => {
    if (code === 0) {
      console.log('\nDone. Customize the mock files, then run: npm start')
    }
    else {
      console.error('\nnpm install failed. Run it manually, then: npm start')
    }
  })
}

async function main() {
  program
    .name('keycloak-theme-editor')
    .description('Visual theme editor for Keycloak login pages')

  program
    .command('init')
    .description('Create kc-page.ts and kc-page-state.ts config files')
    .option('--themes-root <dir>', 'Target directory; defaults to the current working directory')
    .action((opts: { themesRoot?: string }) => {
      initMockFiles(opts)
    })

  program
    .command('start', { isDefault: true })
    .description('Start the theme editor')
    .option('--themes-root <dir>', 'Root directory to scan for theme variants; defaults to the current working directory')
    .option('--port <number>', 'Port to run the editor on', String(DEFAULT_PORT))
    .option('--no-open', 'Do not open browser automatically')
    .action(async (opts: { themesRoot?: string, port: string, open: boolean }) => {
      await startEditor(opts)
    })

  await program.parseAsync()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
