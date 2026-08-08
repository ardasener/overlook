## 1. Site scaffold

- [x] 1.1 Clone the RicoUI Starter into `site/` (shallow), remove git history
- [x] 1.2 Switch to bun: remove `pnpm-lock.yaml`/`pnpm-workspace.yaml`, add `bun.lock` via `bun install`
- [x] 1.3 Remove the starter's demo content: blog posts, `design.astro`, `elements.astro` (keep the theme system, layouts, primitives, content collections)

## 2. Landing page

- [x] 2.1 Copy `src-tauri/icons/icon.png` → `site/public/icon.png`
- [x] 2.2 Rewrite `site/src/pages/index.astro`: icon, "Overlook" title, tagline, download buttons (macOS/Linux/Windows → GitHub releases latest), features section
- [x] 2.3 Set `minimal-mono` as the default theme and disable the multi-theme switcher; keep the light/dark toggle
- [x] 2.4 Configure `astro.config.mjs`: `site: https://ardasener.github.io`, `base: "/overlook/"`

## 3. Deployment

- [x] 3.1 Add `.github/workflows/site.yml`: on push to `main`, `bun install` + `bun run build` in `site/`, deploy to Pages via `actions/deploy-pages` (permissions: `pages: write`, `id-token: write`; `pages` environment)

## 4. Verification

- [x] 4.1 `bun run build` in `site/` succeeds and outputs a static build under `/overlook/` paths
- [ ] 4.2 Manual: after pushing to `main` (with Pages enabled on the repo), `ardasener.github.io/overlook/` shows the landing page with icon, features, download links; the light/dark toggle works with `minimal-mono` and no multi-theme switcher is shown
