import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['bin/cli.ts'],
  format: 'esm',
  outDir: 'bin',
  target: 'node18',
  clean: false,
  splitting: false,
  external: ['keycloakify'],
  banner: { js: '#!/usr/bin/env node' },
})
