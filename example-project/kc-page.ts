import { defineConfig } from 'keycloak-theme-editor'

export default defineConfig({
  pages: {
    'login-alt.ftl': {
      realm: {
        attributes: {
          showLoginFields: 'false',
        },
      },
    },
  },
})
