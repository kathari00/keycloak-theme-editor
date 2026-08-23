// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkAndUpdatePinnedTag } from '../check-keycloak-release'

function githubRelease(tagName: string, overrides: Partial<{ draft: boolean, prerelease: boolean }> = {}) {
  return new Response(JSON.stringify({ tag_name: tagName, draft: false, prerelease: false, ...overrides }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('checkAndUpdatePinnedTag', () => {
  let tempDir: string
  let configPath: string

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'keycloak-release-check-'))
    configPath = path.join(tempDir, 'sync-keycloak-config.json')
    await writeFile(
      configPath,
      `${JSON.stringify({ repo: 'keycloak/keycloak', tag: '26.6.4', themes: [], targetDir: 'x', commonResourcesTargetDir: 'y' }, null, 2)}\n`,
      'utf8',
    )
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
    vi.unstubAllGlobals()
  })

  it('reports no change and leaves the config untouched when already at latest', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => githubRelease('26.6.4')))

    const result = await checkAndUpdatePinnedTag(configPath)

    expect(result).toEqual({ changed: false, tag: '26.6.4' })
    const config = JSON.parse(await readFile(configPath, 'utf8'))
    expect(config.tag).toBe('26.6.4')
  })

  it('bumps the pinned tag in place and reports the previous one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => githubRelease('26.7.0')))

    const result = await checkAndUpdatePinnedTag(configPath)

    expect(result).toEqual({ changed: true, tag: '26.7.0', previousTag: '26.6.4' })
    const config = JSON.parse(await readFile(configPath, 'utf8'))
    expect(config.tag).toBe('26.7.0')
    // Every other field must survive untouched.
    expect(config.themes).toEqual([])
    expect(config.targetDir).toBe('x')
  })

  it('refuses a draft or prerelease from the "latest" endpoint instead of pinning to it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => githubRelease('26.7.0-rc1', { prerelease: true })))

    await expect(checkAndUpdatePinnedTag(configPath)).rejects.toThrow(/prerelease/)
    const config = JSON.parse(await readFile(configPath, 'utf8'))
    expect(config.tag).toBe('26.6.4')
  })

  it('surfaces a non-2xx GitHub response as a clear error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 403, statusText: 'Forbidden' })))

    await expect(checkAndUpdatePinnedTag(configPath)).rejects.toThrow(/403/)
  })
})
