import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Overlook is served from GitHub Pages at ardasener.github.io/overlook/.
const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://ardasener.github.io/';

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  base: '/overlook/',
  envPrefix: 'PUBLIC_',
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  },

  server: {
    host: '127.0.0.1',
    port: 5200,
  },

  integrations: [mdx(), sitemap()],
});
