import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

import purgecss from "@fullhuman/postcss-purgecss";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, ssrBuild }) => {
  // Only run PurgeCSS in production builds
  if (command === "build") {
    return {
      plugins: [svelte()],
      css: {
        postcss: {
          plugins: [
            purgecss({
              content: ["./**/*.html", "./**/*.svelte"],
              safelist: ["pre", "code"],
            }),
          ],
        },
      },
    };
  } else {
    return {
      plugins: [svelte()],
    };
  }
});
