## Why

The project has no public website — just the GitHub repo. A simple landing page with download links gives the project a proper front door, and starting from the RicoUI Starter provides a finished visual language (minimal-mono theme, light/dark toggle) instead of a blank page, with room to grow docs later.

## What Changes

- Add a `site/` subfolder with an Astro site built on the RicoUI Starter (Astro 7, Tailwind v4, MDX), package manager switched to bun.
- Customize the landing page: app icon, Overlook title/tagline, download buttons for all platforms (linking to the GitHub releases), and a features section. Strip the starter's demo blog/design/elements pages.
- Default theme `minimal-mono`; keep the starter's light/dark toggle (no multi-theme switcher).
- Add a GitHub Actions workflow deploying the site to GitHub Pages at `ardasener.github.io/overlook/` on pushes to `main`.

## Capabilities

### New Capabilities
- `project-website`: The public landing page and its GitHub Pages deployment.

### Modified Capabilities
<!-- None: app and release pipeline unchanged. -->

## Impact

- `site/` (new): Astro project — `astro.config.mjs` (base `/overlook/`), `src/pages/index.astro` (custom landing), styles (minimal-mono default), the app icon in `public/`.
- `.github/workflows/site.yml` (new): build + deploy to GitHub Pages.
- `site/package.json` + `bun.lock`: Astro 7 + Tailwind v4 + MDX, bun-managed.
- No app source changes; the new icon set in `src-tauri/icons/` is unrelated but already present.
