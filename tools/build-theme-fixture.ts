import type { AddressInfo } from 'node:net'
import type { QuickSettings } from '../src/features/editor/stores/types'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { createThemeDocument } from '../src/features/theme-document/theme-document'
import { buildJarBytes } from '../src/features/theme-export/jar-export-service'
import { prepareThemeExportFiles } from '../src/features/theme-export/prepare-theme-export-files'

const FIXTURE_LOCALES = ['de', 'ar']

const DEFAULT_QUICK_SETTINGS: QuickSettings = {
  colorPresetId: 'keycloak-default',
  colorPresetPrimaryColor: '#0066cc',
  colorPresetSecondaryColor: '#c0c0c0',
  colorPresetFontFamily: 'custom',
  colorPresetBgColor: '',
  colorPresetBorderRadius: 'sharp',
  colorPresetCardShadow: 'subtle',
  colorPresetHeadingFontFamily: 'custom',
  showClientName: false,
  showRealmName: false,
  // Must be non-empty: the info-message box's CSS visibility is driven by this base value.
  infoMessage: 'Welcome! This is a test message.',
  imprintUrl: '',
  dataProtectionUrl: '',
  imprintLabel: 'Imprint',
  dataProtectionLabel: 'Data Protection',
}

function serveDirectory(rootDir: string): Promise<{ origin: string, close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url ?? '/', 'http://fixture-server')
      const filePath = path.join(rootDir, decodeURIComponent(requestUrl.pathname))
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end()
          return
        }
        res.writeHead(200)
        res.end(data)
      })
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise(resolveClose => server.close(() => resolveClose())),
      })
    })
  })
}

function installRootRelativeFetchShim(origin: string): () => void {
  const originalFetch = globalThis.fetch
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url
    if (href.startsWith('/')) {
      return originalFetch(origin + href, init)
    }
    return originalFetch(input, init)
  }) as typeof fetch
  return () => {
    globalThis.fetch = originalFetch
  }
}

function buildFixtureThemeDocument() {
  return createThemeDocument({
    themeId: 'modern-card',
    isPresetTheme: true,
    stylesCss: '',
    quickStartCss: '',
    quickSettings: DEFAULT_QUICK_SETTINGS,
    enabledLocales: FIXTURE_LOCALES,
    quickStartContentByLocale: {
      // Full override: proves our own content pipeline renders localized text.
      de: {
        infoMessage: 'Willkommen! Dies ist eine Testnachricht.',
        imprintLabel: 'Impressum',
      },
      // Deliberately blank dataProtectionLabel: proves fallback-to-English
      // against a real server, matching e2e/manual-qa-languages.md.
      ar: {
        infoMessage: 'مرحبا! هذه رسالة اختبار.',
      },
    },
    uploadedAssets: [],
    appliedAssets: {},
  })
}

async function main() {
  const outArg = process.argv.find(arg => arg.startsWith('--out='))
  const outPath = outArg
    ? outArg.slice('--out='.length)
    : path.join(process.cwd(), 'e2e/keycloak-integration/generated/theme.jar')

  const packageRoot = process.cwd()
  const publicDir = path.join(packageRoot, 'public')

  const { origin, close } = await serveDirectory(publicDir)
  const restoreFetch = installRootRelativeFetchShim(origin)

  try {
    const themeDocument = buildFixtureThemeDocument()
    const exportFiles = await prepareThemeExportFiles({ themeDocument, themeName: 'modern-card' })
    const jarBytes = await buildJarBytes(exportFiles)

    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, jarBytes)
    process.stdout.write(`Wrote theme fixture: ${outPath} (${jarBytes.byteLength} bytes)\n`)
  }
  finally {
    restoreFetch()
    await close()
  }
}

// Direct invocation: `tsx tools/build-theme-fixture.ts`
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('tools/build-theme-fixture.ts')
  || process.argv[1]?.replace(/\\/g, '/').endsWith('tools/build-theme-fixture')
if (isDirectRun) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}
