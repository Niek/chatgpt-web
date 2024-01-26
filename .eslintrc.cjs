module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
    extraFileExtensions: ['.svelte']
  },
  extends: ['standard-with-typescript'],
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "@typescript-eslint/consistent-type-assertions": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
  },
  overrides: [
    {
      files: ['**/*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser'
      }
    }
  ],
  ignorePatterns: ['node_modules/*', 'dist/*', 'src-tauri/*', '.eslintrc.cjs', '*.json']
}
