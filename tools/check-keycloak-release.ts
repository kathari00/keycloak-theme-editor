import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'

const CONFIG_PATH = 'tools/sync-keycloak-config.json'

interface SyncConfig {
  repo: string
  tag: string
  [key: string]: unknown
}

interface GithubRelease {
  tag_name: string
  draft: boolean
  prerelease: boolean
}

export async function fetchLatestRelease(repo: string): Promise<GithubRelease> {
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      'User-Agent': 'keycloak-theme-editor-version-check',
      'Accept': 'application/vnd.github+json',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch latest release for ${repo}: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<GithubRelease>
}

function writeGithubOutput(name: string, value: string): void {
  const outputPath = process.env.GITHUB_OUTPUT
  if (outputPath) {
    void writeFile(outputPath, `${name}=${value}\n`, { flag: 'a' })
  }
  process.stdout.write(`${name}=${value}\n`)
}

export interface CheckResult {
  changed: boolean
  tag: string
  previousTag?: string
}

/** Bumps `tools/sync-keycloak-config.json` in place when a newer release exists; pure decision logic otherwise. */
export async function checkAndUpdatePinnedTag(configPath = CONFIG_PATH): Promise<CheckResult> {
  const config = JSON.parse(await readFile(configPath, 'utf8')) as SyncConfig
  const latest = await fetchLatestRelease(config.repo)

  if (latest.draft || latest.prerelease) {
    throw new Error(`Latest release ${latest.tag_name} for ${config.repo} is a draft/prerelease - not expected from the "latest" endpoint.`)
  }

  if (latest.tag_name === config.tag) {
    return { changed: false, tag: config.tag }
  }

  const previousTag = config.tag
  config.tag = latest.tag_name
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')

  return { changed: true, tag: latest.tag_name, previousTag }
}

async function main() {
  const result = await checkAndUpdatePinnedTag()
  writeGithubOutput('changed', String(result.changed))
  writeGithubOutput('tag', result.tag)
  if (result.previousTag) {
    writeGithubOutput('previous-tag', result.previousTag)
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('tools/check-keycloak-release.ts')
  || process.argv[1]?.replace(/\\/g, '/').endsWith('tools/check-keycloak-release')
if (isDirectRun) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`)
    process.exitCode = 1
  })
}
