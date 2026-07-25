import { defineConfig } from 'eslint/config'

const browserGlobals = {
  alert: 'readonly',
  confirm: 'readonly',
  console: 'readonly',
  document: 'readonly',
  FormData: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  URL: 'readonly',
  window: 'readonly',
}

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', 'supabase/.temp/**'],
  },
  {
    files: ['src/**/*.js', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
])
