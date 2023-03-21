import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

import purgecss from '@fullhuman/postcss-purgecss'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, ssrBuild }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd())
  // Set default api base url
  env.VITE_API_BASE = 'https://api.openai.com'
  // Only run PurgeCSS in production builds
  if (command === 'build') {
    return {
      plugins: [svelte()],
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
      plugins: [svelte()]
    }
  }
})
