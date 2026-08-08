# CLAUDE.md

Working context for editing the Overlook website (`site/`).

## Project

The public landing page for Overlook, a terminal-first desktop workspace. Built with Astro,
Tailwind CSS v4, MDX, and a reusable component system (forked from the RicoUI Starter). It is a
static marketing page — no backend.

## Commands

Use **bun** (never pnpm/npm/yarn):

```bash
bun install
bun dev          # dev server on http://127.0.0.1:5200
bun run build    # astro check && astro build
bun run preview
```

## Structure

- `src/pages/index.astro` — landing page (hero, download buttons, features).
- `src/config/site.js` — site identity, metadata, GitHub link.
- `src/config/themes.js` — `minimal-mono` is the default; `showThemeSwitcher: false` (light/dark only).
- `src/components/` — `sections/` (Header, Footer), `elements/`, `ui/`, `widgets/`.
- `src/content/` — content collections (placeholder `docs` collection for future docs).
- `public/icon.png` — the app icon (copied from `../src-tauri/icons/icon.png`).

## Conventions

- Astro + Tailwind v4 tokens; tokens live in `src/styles/global.css`.
- Use existing components before creating new ones.
- Use Lucide icons (`@lucide/astro`).
- Keep light and dark styles together; dark mode is class-based (`dark_mode` in localStorage).
- Download links point at `https://github.com/ardasener/overlook/releases/latest`.
- The site deploys from the repo root's `.github/workflows/site.yml` to GitHub Pages at
  `https://ardasener.github.io/overlook/`; the Astro `base` is `/overlook/`.

## Do Not

- Reintroduce the starter's multi-theme switcher (light/dark only).
- Reference the RicoUI starter or pnpm in user-facing content.
- Add real secrets or credentials.
