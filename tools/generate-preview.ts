import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const pomPath = path.join(ROOT, 'tools', 'preview-renderer', 'pom.xml')
const generatedPagesPath = path.join(ROOT, 'src', 'features', 'preview', 'generated', 'pages.json')
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

function runMaven() {
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

  // Legacy shape: { html: "...", scenarios: { scenarioA: "..." } }
  const legacyPage = page as { html?: unknown, scenarios?: Record<string, unknown> }
  if (Object.prototype.hasOwnProperty.call(legacyPage, 'html') || Object.prototype.hasOwnProperty.call(legacyPage, 'scenarios')) {
    const legacyStories: Record<string, string> = {}
    if (typeof legacyPage.html === 'string') {
      legacyStories.default = legacyPage.html
    }
    for (const [storyId, storyHtml] of Object.entries(legacyPage.scenarios ?? {})) {
      if (typeof storyHtml === 'string') {
        legacyStories[storyId] = storyHtml
      }
    }
    if (Object.keys(legacyStories).length > 0) {
      return legacyStories
    }
  }

  // Current shape: { default: "...", scenarioA: "..." }
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
  const result = runMaven()
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
    for (const [pageId, html] of Object.entries(pages ?? {})) {
      const currentStories = raw.scenarios?.[variantId]?.[pageId] ?? {}
      const previousStories = getPreviousStories(previous, variantId, pageId)
      const sanitizedBaseHtml = stripScriptTags(html)
      const stories: Record<string, string> = { default: sanitizedBaseHtml }

      for (const [storyId, storyHtml] of Object.entries(currentStories)) {
        if (storyId === 'default') {
          continue
        }
        const sanitizedStoryHtml = stripScriptTags(storyHtml)
        const sanitizedPreviousStoryHtml = stripScriptTags(previousStories[storyId] || '')
        if (sanitizedStoryHtml && sanitizedStoryHtml !== sanitizedBaseHtml) {
          stories[storyId] = sanitizedStoryHtml
          continue
        }
        if (sanitizedPreviousStoryHtml && sanitizedPreviousStoryHtml !== sanitizedBaseHtml) {
          stories[storyId] = sanitizedPreviousStoryHtml
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
