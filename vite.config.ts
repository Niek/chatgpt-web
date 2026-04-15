import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import dsv from '@rollup/plugin-dsv'
import purgecss from '@fullhuman/postcss-purgecss'

const plugins = [svelte(), dsv()]
const scssPreprocessorOptions = {
  scss: {
    quietDeps: true
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  // Only run PurgeCSS in production builds
  if (command === 'build') {
    return {
      plugins,
      css: {
        preprocessorOptions: scssPreprocessorOptions,
        postcss: {
          plugins: [
            purgecss({
              content: [
                './index.html',
                './src/**/*.{svelte,js,ts}',
                './node_modules/svelte-fa/dist/*.svelte'
              ],
              safelist: [
                'pre',
                'code',
                /^svelte-/,
                'svelte-fa',
                'svelte-fa-base',
                'svelte-fa-fw',
                'svelte-fa-layers',
                'svelte-fa-layers-text',
                'svelte-fa-pull-left',
                'svelte-fa-pull-right',
                'svelte-fa-size-lg',
                'svelte-fa-size-sm',
                'svelte-fa-size-xs',
                'pulse',
                'spin'
              ]
            })
          ]
        }
      },
      base: './'
    }
  } else {
    return {
      plugins,
      css: {
        preprocessorOptions: scssPreprocessorOptions
      }
    }
  }
})
