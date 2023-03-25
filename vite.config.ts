import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import dsv from '@rollup/plugin-dsv'

import purgecss from '@fullhuman/postcss-purgecss'

const plugins = [svelte(), dsv()]

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, ssrBuild }) => {
  // Only run PurgeCSS in production builds
  if (command === 'build') {
    return {
      plugins,
      css: {
        postcss: {
          plugins: [
            purgecss({
              content: ['./**/*.html', './**/*.svelte'],
              safelist: ['pre', 'code']
            })
          ]
        }
      }
    }
  } else {
    return {
      plugins
    }
  }
})
