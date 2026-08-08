## Context

The repo is a Tauri app (bun-managed) with no website. The RicoUI Starter (github.com/ricocc/ricoui-astro-starter) is an Astro 7 starter: Tailwind v4, MDX content layer, 10 switchable themes in `src/styles/themes.css` (including `minimal-mono` with light/dark variants), light/dark toggle with localStorage, and a landing page at `src/pages/index.astro`. Its package manager is pnpm — the project uses bun everywhere.

## Goals / Non-Goals

**Goals:**
- Landing page with identity, features, and download links.
- `minimal-mono` default theme with light/dark toggle.
- GitHub Pages deployment at `/overlook/`.
- Docs-ready foundation (MDX content collections) without writing docs now.

**Non-Goals:**
- Blog posts, design/elements pages, screenshots, custom domain, SEO tuning beyond the starter's defaults.

## Decisions

### Adopt the RicoUI Starter as the site base
Copy the starter into `site/`, remove the demo blog/design/elements pages and sample content, keep the theme system, layouts, and UI primitives.
- **Why**: finished visual language + light/dark + theme switcher out of the box; the user explicitly chose it over Catppuccin/Starlight.
- **Note**: this replaces the earlier Starlight idea — docs later are MDX content collections here, not Starlight.

### bun as the package manager
`site/package.json` + `bun.lock`, `bun install` / `bun run build`. Replace the starter's pnpm artifacts.
- **Why**: matches the project-wide bun convention (AGENTS.md).

### Landing page customization
`site/src/pages/index.astro`: app icon (copy `src-tauri/icons/icon.png` → `site/public/icon.png`), "Overlook" + tagline, download buttons → `https://github.com/ardasener/overlook/releases/latest`, and a static features section. Set `minimal-mono` as the default theme and disable the starter's multi-theme switcher — only the light/dark toggle remains.
- **Why**: minimal content change; the starter's layout primitives carry the visual design; `minimal-mono` is the single chosen identity, so the 10-theme switcher is unnecessary.

### GitHub Pages deployment
`.github/workflows/site.yml`: on push to `main`, checkout → `bun install` → `bun run build` in `site/` → `actions/deploy-pages` (with `actions/configure-pages` and `actions/upload-pages-artifact`). `astro.config.mjs` sets `site: https://ardasener.github.io` and `base: "/overlook/"`.
- **Why**: free static hosting; base path required for the `ardasener.github.io/overlook/` URL. The workflow needs `permissions: contents: read, pages: write, id-token: write` and `pages` environment.
- **Note**: GitHub Pages must be enabled on the repo (Settings → Pages → GitHub Actions source) once.

## Risks / Trade-offs

- [Starter version drift] → the starter's package versions (Astro 7.1.5, Tailwind v4) are pinned in `site/package.json`; updates are deliberate.
- [Theme switcher removed] → only light/dark toggle remains; `minimal-mono` is the single identity, matching the app's aesthetic.
- [MDX blog scaffolding remains in the repo] → content collections stay for future docs; pages are removed now.
- [GitHub Pages needs one-time repo enablement] → documented in verification.

## Migration Plan

New files only (`site/`, `site.yml`); no app changes. First deploy: push to `main`, verify `ardasener.github.io/overlook/`.
