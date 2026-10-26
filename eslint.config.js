import eslint from '@eslint/js';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '.agents/**',
      '.astro/**',
      '.codex/**',
      '.claude/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['src/scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  {
    files: ['*.js', '*.mjs', 'plugins/**/*.js', 'tools/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  prettier,
];
