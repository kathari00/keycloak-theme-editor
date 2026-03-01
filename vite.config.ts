import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

function serveGeneratedPagesJson(): Plugin {
  return {
    name: 'serve-generated-pages-json',
    configureServer(server) {
      server.middlewares.use('/api/pages.json', (_req, res) => {
        const filePath = path.resolve(import.meta.dirname, 'src/features/preview/generated/pages.json')
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'pages.json not generated yet. Run: npm run generate:preview' }))
          return
        }
        res.setHeader('Content-Type', 'application/json')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [
    serveGeneratedPagesJson(),
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {}],
        ],
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@patternfly-v5/patternfly/patternfly.min.css',
          dest: 'keycloak-dev-resources',
        },
        {
          src: 'node_modules/@patternfly-v5/patternfly/patternfly-addons.css',
          dest: 'keycloak-dev-resources',
        },
        {
          src: 'node_modules/@patternfly-v5/patternfly/assets/fonts/**/*',
          dest: 'keycloak-dev-resources/assets/fonts',
        },
      ],
    }),
  ],

  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')

          if (!normalizedId.includes('node_modules'))
            return
          if (
            normalizedId.includes('/react/')
            || normalizedId.includes('/react-dom/')
            || normalizedId.includes('/scheduler/')
            || normalizedId.includes('/use-sync-external-store/')
            || normalizedId.includes('/react-is/')
            || normalizedId.includes('/prop-types/')
          ) {
            return 'react'
          }
          if (normalizedId.includes('@patternfly'))
            return 'patternfly'
          if (
            normalizedId.includes('@codemirror')
            || normalizedId.includes('@lezer')
            || normalizedId.includes('/@uiw/')
            || normalizedId.includes('/style-mod/')
            || normalizedId.includes('/w3c-keyname/')
            || normalizedId.includes('/crelt/')
          ) {
            return 'codemirror'
          }
          if (normalizedId.includes('/zustand/'))
            return 'zustand'
          if (normalizedId.includes('@mdi'))
            return 'mdi'
          if (normalizedId.includes('fflate'))
            return 'fflate'
          return 'vendor'
        },
      },
    },
  },
})
