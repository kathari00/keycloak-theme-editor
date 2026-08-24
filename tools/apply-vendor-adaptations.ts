import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
  adaptV2Footer,
  adaptV2Template,
  adaptV2ThemeProperties,
  buildBaseThemeProperties,
} from './theme-adaptations/adapt-vendor-theme'
import { VENDOR_ADAPTED_THEMES } from './theme-adaptations/manifest'

const UPSTREAM_ROOT = 'public/keycloak-upstream'
const DEV_RESOURCES_ROOT = 'public/keycloak-dev-resources/themes'
const PATCHES_ROOT = 'tools/theme-adaptations/patches'

interface PlannedFile {
  /** Relative to DEV_RESOURCES_ROOT, forward slashes. */
  relativePath: string
  content: string
}

/** CRLF -> LF only. A trailing newline is real input the patches were derived against, so it's preserved here. */
async function readUtf8(relativePath: string): Promise<string> {
  return (await readFile(relativePath, 'utf8')).replace(/\r\n/g, '\n')
}

/** Strips one optional trailing newline from both sides first - not a meaningful drift signal. */
function contentsMatch(a: string, b: string): boolean {
  const strip = (s: string) => s.replace(/\n$/, '')
  return strip(a) === strip(b)
}

async function planThemeFiles(rootDir: string, theme: (typeof VENDOR_ADAPTED_THEMES)[number]): Promise<PlannedFile[]> {
  // sync-keycloak.ts writes into keycloak-upstream/<our id>, not <upstream id>.
  const upstreamLogin = path.join(rootDir, UPSTREAM_ROOT, theme.id, 'login')
  const files: PlannedFile[] = []

  if (theme.id === 'base') {
    files.push({ relativePath: 'base/login/theme.properties', content: buildBaseThemeProperties() })
  }
  else {
    const pristineProperties = await readUtf8(path.join(upstreamLogin, 'theme.properties'))
    files.push({
      relativePath: `${theme.id}/login/theme.properties`,
      content: adaptV2ThemeProperties(pristineProperties),
    })
  }

  if (theme.hasTemplateFtl) {
    const pristineTemplate = await readUtf8(path.join(upstreamLogin, 'template.ftl'))
    const patch = await readUtf8(path.join(rootDir, PATCHES_ROOT, `${theme.id}-template.patch`))
    files.push({ relativePath: `${theme.id}/login/template.ftl`, content: adaptV2Template(pristineTemplate, patch) })
  }

  if (theme.hasFooterFtl) {
    const pristineFooter = await readUtf8(path.join(upstreamLogin, 'footer.ftl'))
    const patch = await readUtf8(path.join(rootDir, PATCHES_ROOT, `${theme.id}-footer.patch`))
    files.push({ relativePath: `${theme.id}/login/footer.ftl`, content: adaptV2Footer(pristineFooter, patch) })
  }

  return files
}

async function planAllFiles(rootDir: string): Promise<PlannedFile[]> {
  const perTheme = await Promise.all(VENDOR_ADAPTED_THEMES.map(theme => planThemeFiles(rootDir, theme)))
  return perTheme.flat()
}

async function checkDrift(rootDir: string): Promise<{ ok: boolean, report: string[] }> {
  const planned = await planAllFiles(rootDir)
  const report: string[] = []

  for (const file of planned) {
    const committedPath = path.join(rootDir, DEV_RESOURCES_ROOT, file.relativePath)
    let committed: string
    try {
      committed = await readUtf8(committedPath)
    }
    catch {
      report.push(`MISSING  ${file.relativePath} (regenerated content has no committed counterpart)`)
      continue
    }

    if (!contentsMatch(committed, file.content)) {
      report.push(`DRIFT    ${file.relativePath} (regenerated output no longer matches the committed file)`)
    }
  }

  return { ok: report.length === 0, report }
}

async function applyAll(rootDir: string): Promise<PlannedFile[]> {
  const planned = await planAllFiles(rootDir)
  await Promise.all(planned.map(async (file) => {
    const targetPath = path.join(rootDir, DEV_RESOURCES_ROOT, file.relativePath)
    // Normalize to exactly one trailing newline - avoids a stray blank line.
    await writeFile(targetPath, `${file.content.replace(/\n$/, '')}\n`, 'utf8')
  }))
  return planned
}

async function main() {
  const rootDir = process.cwd()
  const mode = process.argv.includes('--check') ? 'check' : 'apply'

  if (mode === 'check') {
    const { ok, report } = await checkDrift(rootDir)
    if (ok) {
      process.stdout.write(`vendor:check - ${VENDOR_ADAPTED_THEMES.length} theme(s) match their adaptation exactly.\n`)
      return
    }
    process.stderr.write(`vendor:check found drift between the committed dev-resources and what the adaptation would regenerate:\n`)
    for (const line of report) {
      process.stderr.write(`  ${line}\n`)
    }
    process.stderr.write(
      `\nEither a committed file was hand-edited without updating the adaptation, or upstream\n`
      + `changed something a patch depends on and it needs to be re-derived. See\n`
      + `tools/theme-adaptations/ for the rules and tools/apply-vendor-adaptations.ts --check.\n`,
    )
    process.exitCode = 1
    return
  }

  const planned = await applyAll(rootDir)
  process.stdout.write(`vendor:apply - wrote ${planned.length} file(s):\n`)
  for (const file of planned) {
    process.stdout.write(`  ${file.relativePath}\n`)
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`)
  process.exitCode = 1
})
