import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'app',
  typescript: true,
  react: true,
  ignores: [
    'public/**',
  ],
  rules: {
    'e18e/prefer-array-at': 'off',
    'e18e/prefer-static-regex': 'off',
  },
})
