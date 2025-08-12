import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@patternfly-v5/patternfly/patternfly.min.css',
          dest: 'keycloak-dev-resources'
        },
        {
          src: 'node_modules/@patternfly-v5/patternfly/patternfly-addons.css',
          dest: 'keycloak-dev-resources'
        }
      ]
    })
  ],
})
