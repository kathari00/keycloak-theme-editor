import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { cli: 'bin/cli.ts' },
    format: 'esm',
    outDir: 'bin',
    target: 'node24',
    clean: false,
    splitting: false,
    external: ['jsdom'],
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: { 'kc-mocks': 'bin/kc-mocks.src.ts' },
    format: 'esm',
    outDir: 'bin',
    target: 'node24',
    clean: false,
    dts: true,
  },
])
