import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
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
          dest: 'keycloak-dev-resources/resources-common/vendor/patternfly-v5',
        },
        {
          src: 'node_modules/@patternfly-v5/patternfly/patternfly-addons.css',
          dest: 'keycloak-dev-resources/resources-common/vendor/patternfly-v5',
        },
        {
          src: 'node_modules/@patternfly-v5/patternfly/assets/**/*',
          dest: 'keycloak-dev-resources/resources-common/vendor/patternfly-v5/assets',
        },
        {
          src: 'docs/presentation/introduction/**/*',
          dest: 'docs/presentation/introduction',
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
            normalizedId.includes('/node_modules/react/')
            || normalizedId.includes('/node_modules/react-dom/')
            || normalizedId.includes('/node_modules/scheduler/')
            || normalizedId.includes('/node_modules/use-sync-external-store/')
            || normalizedId.includes('/node_modules/react-is/')
            || normalizedId.includes('/node_modules/prop-types/')
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
