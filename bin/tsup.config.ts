import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['bin/cli.ts'],
    format: 'esm',
    outDir: 'bin',
    target: 'node24',
    clean: false,
    splitting: false,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: ['bin/kc-mocks.ts'],
    format: 'esm',
    outDir: 'bin',
    target: 'node24',
    clean: false,
  },
])
