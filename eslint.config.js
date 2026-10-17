// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    // Resolve the "@/..." alias from jsconfig.json.
    settings: {
      'import/resolver': { typescript: { project: './jsconfig.json' } },
    },
  },
  {
    files: ['**/*.test.js'],
    languageOptions: { globals: globals.jest },
  },
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
]);
