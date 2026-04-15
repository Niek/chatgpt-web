import { defineConfig } from 'eslint/config'
import globals from 'globals'
import svelte from 'eslint-plugin-svelte'
import svelteConfig from './svelte.config.js'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['node_modules/*', 'dist/*', 'src-tauri/*', 'package-lock.json', '*.json']
  },
  ...svelte.configs.base,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: ['**/*.ts', '**/*.d.ts'],
    languageOptions: {
      parser: tseslint.parser
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: tseslint.parser,
        svelteConfig
      }
    }
  },
  {
    rules: {
      'no-multiple-empty-lines': ['error', { max: 2, maxBOF: 2, maxEOF: 0 }]
    }
  }
)
