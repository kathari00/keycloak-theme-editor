import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const RAW_CSS_PREFIX = '\0raw-css:'
// Vite claims any id whose path ends in `.css`, so the virtual one deliberately does not.
const RAW_CSS_SUFFIX = '.txt'

interface ResolveContext {
  resolve: (source: string, importer?: string, options?: { skipSelf: boolean }) => Promise<{ id: string } | null>
}

/**
 * Vite's CSS pipeline rewrites `?raw` stylesheet imports to an empty module under Vitest, which
 * would leave every framework binding's CSS untestable. Serve the file's real text instead.
 */
const rawCssPlugin = {
  name: 'raw-css-for-tests',
  enforce: 'pre' as const,
  async resolveId(this: ResolveContext, source: string, importer?: string) {
    if (!source.endsWith('.css?raw'))
      return
    const resolved = await this.resolve(source.slice(0, -'?raw'.length), importer, { skipSelf: true })
    return resolved ? `${RAW_CSS_PREFIX}${resolved.id}${RAW_CSS_SUFFIX}` : undefined
  },
  load(id: string) {
    if (!id.startsWith(RAW_CSS_PREFIX))
      return
    const path = id.slice(RAW_CSS_PREFIX.length, -RAW_CSS_SUFFIX.length)
    return `export default ${JSON.stringify(readFileSync(path, 'utf8'))}`
  },
}

export default defineConfig({
  plugins: [rawCssPlugin],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'example-project/**'],
  },
})
