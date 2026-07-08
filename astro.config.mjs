import { execSync } from "node:child_process";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import compressor from "astro-compressor";
import remarkBreaks from "remark-breaks";

// Commit that produced this build. On GitHub Actions it comes from the
// environment (which equals the Codeberg source commit, since the mirror
// preserves SHAs); locally it falls back to the working git HEAD.
const commitRef =
  process.env.GITHUB_SHA ?? execSync("git rev-parse HEAD").toString().trim();
const commitShort = commitRef.slice(0, 7);

export default defineConfig({
  site: "https://bartl.app",
  prefetch: true,
  i18n: {
    defaultLocale: "en",
    locales: ["en", "de"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  // Render a single newline in Markdown as a line break (like GitHub does),
  // so multi-line blocks such as addresses just work without <br> or markers.
  markdown: {
    remarkPlugins: [remarkBreaks],
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: { en: "en", de: "de" },
      },
    }),
    compressor({ gzip: false, brotli: true }),
  ],
  vite: {
    plugins: [tailwindcss()],
    define: {
      __COMMIT_REF__: JSON.stringify(commitRef),
      __COMMIT_SHORT__: JSON.stringify(commitShort),
    },
  },
});
