import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

import purgecss from "@fullhuman/postcss-purgecss";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  css: {
    postcss: {
      plugins: [
        purgecss({
          content: ["./**/*.html", "./**/*.svelte"],
        }),
      ],
    },
  },
});
