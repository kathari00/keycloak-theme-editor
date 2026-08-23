import { Buffer } from 'node:buffer'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { unzipSync } from 'fflate'
import {
  CURATED_LOCALES,
  DEFAULT_LOCALE_TAG,
  isCuratedLocale,
  localeTagForPropertiesSuffix,
} from '../src/features/i18n/locale-catalog'
import { isLoginMessagesEntry, selectLocaleBundles } from './upstream-locale-bundles'

interface SyncConfig {
  repo: string
  tag: string
  themes: { id: string, upstream: string }[]
  targetDir: string
  commonResourcesTargetDir: string
}

interface GithubEntry {
  type: string
  name: string
  download_url: string
}

const metadataKeys = new Set([
  'parent',
  'import',
  'styles',
  'stylesCommon',
  'darkMode',
  'meta',
  'scripts',
])

function readConfig(rootDir: string): Promise<SyncConfig> {
  const configPath = path.join(rootDir, 'tools', 'sync-keycloak-config.json')
  return readFile(configPath, 'utf8').then(text => JSON.parse(text) as SyncConfig)
}

function writeInfo(message: string) {
  process.stdout.write(`${message}\n`)
}

function writeError(message: string) {
  process.stderr.write(`${message}\n`)
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message
  }
  return String(error)
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'keycloak-theme-editor-sync',
      'Accept': 'application/vnd.github+json',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<GithubEntry[]>
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'keycloak-theme-editor-sync' },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'keycloak-theme-editor-sync' },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function fetchOptionalText(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'keycloak-theme-editor-sync' },
  })
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

function parseThemeProperties(text: string) {
  const themeProperties: Record<string, string> = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#'))
      continue
    const index = line.indexOf('=')
    if (index <= 0)
      continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    if (!metadataKeys.has(key)) {
      themeProperties[key] = value
    }
  }
  return themeProperties
}

async function copyDirRecursive(src: string, dest: string) {
  const entries = await readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true })
      await copyDirRecursive(srcPath, destPath)
    }
    else {
      await copyFile(srcPath, destPath)
    }
  }
}

async function countFiles(dir: string): Promise<number> {
  let count = 0
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += await countFiles(path.join(dir, entry.name))
    }
    else {
      count++
    }
  }
  return count
}

async function syncTheme(
  theme: SyncConfig['themes'][number],
  config: SyncConfig,
  rootDir: string,
  localeBundles: Map<string, Map<string, string>>,
) {
  const targetThemeRoot = path.join(rootDir, config.targetDir, theme.id)
  const targetLoginRoot = path.join(targetThemeRoot, 'login')
  const targetMessagesRoot = path.join(targetThemeRoot, 'messages')
  await rm(targetThemeRoot, { recursive: true, force: true })
  await mkdir(targetLoginRoot, { recursive: true })
  await mkdir(targetMessagesRoot, { recursive: true })

  const loginContentsUrl = `https://api.github.com/repos/${config.repo}/contents/themes/src/main/resources/theme/${theme.upstream}/login?ref=${config.tag}`
  const loginContents = await fetchJson(loginContentsUrl)

  let themePropertiesText: string | null = null
  let fileCount = 0
  for (const entry of loginContents) {
    if (entry.type !== 'file')
      continue
    if (!(entry.name.endsWith('.ftl') || entry.name === 'theme.properties'))
      continue
    const text = await fetchText(entry.download_url)
    await writeFile(path.join(targetLoginRoot, entry.name), text, 'utf8')
    fileCount++
    if (entry.name === 'theme.properties') {
      themePropertiesText = text
    }
  }

  if (!themePropertiesText) {
    themePropertiesText = '# generated fallback for themes without theme.properties\n'
    await writeFile(path.join(targetLoginRoot, 'theme.properties'), themePropertiesText, 'utf8')
  }

  const messagesUrlCandidates = [
    `https://raw.githubusercontent.com/${config.repo}/${config.tag}/themes/src/main/resources/theme/${theme.upstream}/login/messages/messages_en.properties`,
    `https://raw.githubusercontent.com/${config.repo}/${config.tag}/themes/src/main/resources/theme/base/login/messages/messages_en.properties`,
  ]
  let messagesText: string | null = null
  for (const candidateUrl of messagesUrlCandidates) {
    messagesText = await fetchOptionalText(candidateUrl)
    if (messagesText)
      break
  }
  if (!messagesText) {
    throw new Error(`Failed to resolve messages_en.properties for theme '${theme.id}'`)
  }
  await writeFile(path.join(targetMessagesRoot, 'messages_en.properties'), messagesText, 'utf8')
  fileCount++

  const syncedLocales = await writeLocaleBundles(localeBundles.get(theme.upstream), targetMessagesRoot)
  fileCount += syncedLocales.length

  const parsed = parseThemeProperties(themePropertiesText)
  await writeFile(
    path.join(targetThemeRoot, 'theme-properties.json'),
    `${JSON.stringify({ ...parsed, syncedLocales }, null, 2)}\n`,
    'utf8',
  )
  fileCount++

  return fileCount
}

/** Downloads a Keycloak artifact once and reuses it on later runs. */
async function ensureCachedJar(config: SyncConfig, rootDir: string, artifact: string): Promise<string> {
  const cacheDir = path.join(rootDir, 'node_modules', '.cache', 'sync-keycloak')
  await mkdir(cacheDir, { recursive: true })

  const jarFileName = `${artifact}-${config.tag}.jar`
  const cachedJarPath = path.join(cacheDir, jarFileName)

  if (existsSync(cachedJarPath)) {
    writeInfo(`Using cached ${artifact} (${jarFileName})`)
    return cachedJarPath
  }

  const jarUrl = `https://repo1.maven.org/maven2/org/keycloak/${artifact}/${config.tag}/${jarFileName}`
  writeInfo(`Downloading ${artifact}...`)
  const jarBuffer = await fetchBuffer(jarUrl)
  await writeFile(cachedJarPath, jarBuffer)
  writeInfo(`  ${(jarBuffer.length / 1024 / 1024).toFixed(1)} MB`)
  return cachedJarPath
}

/**
 * Translations ship in the released `keycloak-themes` jar, not in the repo's
 * `resources/` tree - upstream keeps the community bundles in a separate
 * source root that only gets merged at package time. Reading the jar therefore
 * matches what a real Keycloak server resolves, and reuses a download the
 * common-resources step already needs.
 *
 * Returns `theme/<upstream>/login/messages/messages_<suffix>.properties`
 * contents, keyed by upstream theme id and then by bundle suffix.
 */
async function loadUpstreamLocaleBundles(
  config: SyncConfig,
  rootDir: string,
): Promise<Map<string, Map<string, string>>> {
  const jarPath = await ensureCachedJar(config, rootDir, 'keycloak-themes')
  const jarBytes = new Uint8Array(await readFile(jarPath))
  const entries = unzipSync(jarBytes, { filter: file => isLoginMessagesEntry(file.name) })

  return selectLocaleBundles(entries, config.themes.map(theme => theme.upstream))
}

/**
 * Writes the bundles this theme itself ships. Bundles it does not override are
 * deliberately left out: the renderer merges the parent chain, so duplicating
 * the base translations into every theme would only create drift.
 */
async function writeLocaleBundles(
  bundles: Map<string, string> | undefined,
  targetMessagesRoot: string,
): Promise<string[]> {
  if (!bundles) {
    return []
  }

  const written: string[] = []
  for (const [suffix, content] of bundles) {
    const tag = localeTagForPropertiesSuffix(suffix)
    if (!isCuratedLocale(tag)) {
      writeInfo(`  note: skipping messages_${suffix}.properties (locale '${tag}' is not in the editor's catalog)`)
      continue
    }
    await writeFile(path.join(targetMessagesRoot, `messages_${suffix}.properties`), content, 'utf8')
    written.push(tag)
  }
  return written.sort()
}

/**
 * Commits the base login bundles used by the browser to identify which
 * Keycloak message key produced a selected preview element. This is separate
 * from theme overrides and may therefore include the complete English bundle.
 */
async function syncPreviewMessageCatalog(config: SyncConfig, rootDir: string): Promise<void> {
  const sourceDir = path.join(rootDir, config.targetDir, 'base', 'messages')
  const targetDir = path.join(rootDir, 'public', 'keycloak-dev-resources', 'i18n')
  await rm(targetDir, { recursive: true, force: true })
  await mkdir(targetDir, { recursive: true })

  for (const locale of CURATED_LOCALES) {
    const filename = `messages_${locale.messagesSuffix}.properties`
    const sourcePath = path.join(sourceDir, filename)
    if (!existsSync(sourcePath)) {
      writeError(`Warning: cannot publish preview message catalog entry ${filename}; source is missing.`)
      continue
    }
    await copyFile(sourcePath, path.join(targetDir, filename))
  }
}

function warnAboutCatalogDrift(baseBundles: Map<string, string> | undefined): void {
  const shipped = new Set(
    [...(baseBundles?.keys() ?? [])].map(suffix => localeTagForPropertiesSuffix(suffix)),
  )
  const missing = CURATED_LOCALES
    .filter(locale => locale.tag !== DEFAULT_LOCALE_TAG && !shipped.has(locale.tag))
    .map(locale => locale.tag)

  if (missing.length > 0) {
    writeError(
      `Warning: the editor's locale catalog lists ${missing.join(', ')}, but this Keycloak `
      + `release ships no base translation for them. Update CURATED_LOCALES in `
      + `src/features/i18n/locale-catalog.ts.`,
    )
  }
}

async function syncCommonResources(config: SyncConfig, rootDir: string) {
  const targetDir = path.join(rootDir, config.commonResourcesTargetDir)
  await rm(targetDir, { recursive: true, force: true })
  await mkdir(targetDir, { recursive: true })

  const cacheDir = path.join(rootDir, 'node_modules', '.cache', 'sync-keycloak')
  await mkdir(cacheDir, { recursive: true })
  const tmpExtractDir = path.join(cacheDir, 'extract')
  await rm(tmpExtractDir, { recursive: true, force: true })
  await mkdir(tmpExtractDir, { recursive: true })

  const jars = [
    { name: 'keycloak-themes', artifact: 'keycloak-themes' },
    { name: 'keycloak-themes-vendor', artifact: 'keycloak-themes-vendor' },
  ]

  for (const jar of jars) {
    const cachedJarPath = await ensureCachedJar(config, rootDir, jar.artifact)

    const extractResult = spawnSync('jar', ['xf', cachedJarPath, 'theme/keycloak/common/resources'], {
      cwd: tmpExtractDir,
      stdio: 'pipe',
      shell: process.platform === 'win32',
    })
    if (extractResult.status !== 0) {
      throw new Error(`Failed to extract ${jar.name}: ${extractResult.stderr?.toString() || 'unknown error'}`)
    }
  }

  writeInfo('Copying common resources...')
  const extractedDir = path.join(tmpExtractDir, 'theme', 'keycloak', 'common', 'resources')
  await copyDirRecursive(extractedDir, targetDir)
  await rm(tmpExtractDir, { recursive: true, force: true })

  const fileCount = await countFiles(targetDir)
  return fileCount
}

async function main() {
  const rootDir = process.cwd()
  const config = await readConfig(rootDir)
  await rm(path.join(rootDir, config.targetDir), { recursive: true, force: true })
  await mkdir(path.join(rootDir, config.targetDir), { recursive: true })

  const localeBundles = await loadUpstreamLocaleBundles(config, rootDir)
  warnAboutCatalogDrift(localeBundles.get('base'))

  let totalFiles = 0
  for (const theme of config.themes) {
    const count = await syncTheme(theme, config, rootDir, localeBundles)
    totalFiles += count
  }
  await syncPreviewMessageCatalog(config, rootDir)
  writeInfo(`Synced ${totalFiles} files from ${config.repo}@${config.tag} to ${config.targetDir}`)

  const commonCount = await syncCommonResources(config, rootDir)
  writeInfo(`Synced ${commonCount} common resource files to ${config.commonResourcesTargetDir}`)
}

main().catch((error) => {
  writeError(formatError(error))
  process.exitCode = 1
})
