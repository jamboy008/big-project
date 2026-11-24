import { createRequire } from 'node:module';
import js from '@eslint/js';
import esbuild from 'esbuild';
import reactHooks from 'eslint-plugin-react-hooks';

const require = createRequire(import.meta.url);
const espree = require('espree');

const tsParser = {
  meta: {
    name: 'aljabr-esbuild-ts-parser',
    version: '1.0.0',
  },
  parseForESLint(code, options = {}) {
    const filePath = typeof options.filePath === 'string' ? options.filePath : 'file.ts';
    const loader = filePath.endsWith('.tsx')
      ? 'tsx'
      : filePath.endsWith('.ts')
        ? 'ts'
        : filePath.endsWith('.jsx')
          ? 'jsx'
          : 'js';

    const transformed = esbuild.transformSync(code, {
      loader,
      jsx: 'automatic',
      format: 'esm',
      target: 'esnext',
    });

    const ast = espree.parse(transformed.code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      loc: true,
      range: true,
      tokens: true,
      comment: true,
    });

    return { ast };
  },
};

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        FileList: 'readonly',
        XMLHttpRequest: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        ReadableStream: 'readonly',
        DOMException: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLInputElement: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        crypto: 'readonly',
        __dirname: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
