import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { resolveContextMocks } from './kc-context-mocks'

const ROOT = process.cwd()
const pomPath = path.join(ROOT, 'tools', 'preview-renderer', 'pom.xml')
const generatedPagesPath = path.join(ROOT, 'src', 'features', 'preview', 'generated', 'pages.json')
const defaultCustomMocksPath = path.join(ROOT, 'tools', 'preview-renderer', 'custom-pages.json')
const MIN_JAVA = 25
const isWindows = process.platform === 'win32'
const SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi

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

function getJavaMajorVersion(): number | null {
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

function toMavenArgPath(filePath: string): string {
  return filePath.replaceAll('\\', '/')
}

function writeTempContextMocksFile(): { tempDir: string, filePath: string } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-context-mocks-'))
  const filePath = path.join(tempDir, 'kc-context-mocks.json')
  fs.writeFileSync(filePath, `${JSON.stringify(resolveContextMocks(), null, 2)}\n`, 'utf8')
  return { tempDir, filePath }
}

function resolveCustomMocksPath(): string | undefined {
  const envPath = process.env.PREVIEW_CUSTOM_MOCKS
  if (envPath) {
    const resolvedPath = path.isAbsolute(envPath) ? envPath : path.resolve(ROOT, envPath)
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath
    }
  }

  if (fs.existsSync(defaultCustomMocksPath)) {
    return defaultCustomMocksPath
  }

  return undefined
}

function runMaven(contextMocksPath: string, customMocksPath?: string) {
  const execArgs = [
    `--context-mocks=${toMavenArgPath(contextMocksPath)}`,
    ...(customMocksPath
      ? [`--custom-mocks=${toMavenArgPath(customMocksPath)}`]
      : []),
  ].join(' ')

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

function getPreviousStories(previous: any, variantId: string, pageId: string): Record<string, string> {
  const page = previous?.variants?.[variantId]?.[pageId]
  if (!page || typeof page !== 'object' || Array.isArray(page)) {
    return previous?.scenarios?.[variantId]?.[pageId] ?? {}
  }

  const currentStories: Record<string, string> = {}
  for (const [storyId, storyHtml] of Object.entries(page as Record<string, unknown>)) {
    if (typeof storyHtml === 'string') {
      currentStories[storyId] = storyHtml
    }
  }
  if (Object.keys(currentStories).length > 0) {
    return currentStories
  }

  return previous?.scenarios?.[variantId]?.[pageId] ?? {}
}

function main() {
  const previous = readJson(generatedPagesPath)
  const javaVersion = getJavaMajorVersion()
  if (!javaVersion || javaVersion < MIN_JAVA) {
    process.stderr.write(`Java ${MIN_JAVA}+ required (found ${javaVersion ?? 'none'}). Set JAVA_HOME or add java to PATH.\n`)
    process.exitCode = 1
    return
  }

  process.stdout.write(`Generating preview artifacts (Java ${javaVersion})...\n`)
  const { tempDir, filePath } = writeTempContextMocksFile()
  const customMocksPath = resolveCustomMocksPath()
  const result = runMaven(filePath, customMocksPath)
  fs.rmSync(tempDir, { recursive: true, force: true })

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1
    return
  }

  const raw = readJson(generatedPagesPath)
  if (!raw?.variants || Object.keys(raw.variants).length === 0) {
    process.stderr.write(`Generated artifact is missing variants: ${generatedPagesPath}\n`)
    process.exitCode = 1
    return
  }

  const variants: Record<string, Record<string, Record<string, string>>> = {}
  for (const [variantId, pages] of Object.entries(raw.variants as Record<string, Record<string, string>>)) {
    const variantPages: Record<string, Record<string, string>> = {}
    for (const [pageId, rawHtml] of Object.entries((pages ?? {}) as Record<string, unknown>)) {
      if (typeof rawHtml !== 'string') {
        continue
      }

      const html = rawHtml
      const currentStories = (raw.scenarios?.[variantId]?.[pageId] ?? {}) as Record<string, unknown>
      const previousStories = getPreviousStories(previous, variantId, pageId)
      const sanitizedBaseHtml = stripScriptTags(html)
      const stories: Record<string, string> = { default: sanitizedBaseHtml }

      for (const [storyId, rawStoryHtml] of Object.entries(currentStories)) {
        if (storyId === 'default') {
          continue
        }
        if (typeof rawStoryHtml !== 'string') {
          continue
        }

        const sanitizedStoryHtml = stripScriptTags(rawStoryHtml)
        const sanitizedPreviousStoryHtml = stripScriptTags(previousStories[storyId] || '')

        if (sanitizedPreviousStoryHtml && sanitizedPreviousStoryHtml !== sanitizedBaseHtml) {
          stories[storyId] = sanitizedPreviousStoryHtml
          continue
        }

        if (sanitizedStoryHtml) {
          stories[storyId] = sanitizedStoryHtml
        }
      }

      variantPages[pageId] = stories
    }
    variants[variantId] = variantPages
  }

  fs.writeFileSync(generatedPagesPath, `${JSON.stringify({
    generatedAt: raw.generatedAt,
    keycloakTag: raw.keycloakTag,
    variants,
  }, null, 2)}\n`, 'utf8')

  process.stdout.write('Preview generation complete.\n')
}

main()
