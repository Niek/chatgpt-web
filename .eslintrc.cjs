module.exports = {
  extends: 'standard-with-typescript',
  parser: '@typescript-eslint/parser',
  parserOptions: { // add these parser options
    project: ['./tsconfig.json']
  },
  plugins: [
    'svelte3',
    '@typescript-eslint'
  ],
  overrides: [
    {
      files: [
        '**/*.svelte'
      ],
      processor: 'svelte3/svelte3'
    }
  ],
  settings: {
    'svelte3/typescript': true
  },
  ignorePatterns: ['node_modules/*', 'dist/*', 'vite-env.d.ts']
}
