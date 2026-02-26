import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

interface SyncConfig {
  repo: string
  tag: string
  themes: { id: string, upstream: string }[]
  targetDir: string
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

async function syncTheme(theme: SyncConfig['themes'][number], config: SyncConfig, rootDir: string) {
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

  const parsed = parseThemeProperties(themePropertiesText)
  await writeFile(
    path.join(targetThemeRoot, 'theme-properties.json'),
    `${JSON.stringify(parsed, null, 2)}\n`,
    'utf8',
  )
  fileCount++

  return fileCount
}

async function main() {
  const rootDir = process.cwd()
  const config = await readConfig(rootDir)
  await rm(path.join(rootDir, config.targetDir), { recursive: true, force: true })
  await mkdir(path.join(rootDir, config.targetDir), { recursive: true })

  let totalFiles = 0
  for (const theme of config.themes) {
    const count = await syncTheme(theme, config, rootDir)
    totalFiles += count
  }

  writeInfo(`Synced ${totalFiles} files from ${config.repo}@${config.tag} to ${config.targetDir}`)
}

main().catch((error) => {
  writeError(formatError(error))
  process.exitCode = 1
})
