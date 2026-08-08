# Overlook website

The public landing page for [Overlook](https://github.com/ardasener/overlook) — a lightweight,
terminal-first desktop workspace for projects and git worktrees.

Built with [Astro](https://astro.build) (Tailwind CSS v4, MDX) on the
[RicoUI Starter](https://github.com/ricocc/ricoui-astro-starter), using the `minimal-mono` theme
with a light/dark toggle.

## Development

```bash
bun install
bun dev          # dev server on http://127.0.0.1:5200
bun run build    # static build to dist/
bun run preview  # preview the build
```

## Deploy

Pushing to `main` builds the site and deploys it to GitHub Pages at
`https://ardasener.github.io/overlook/` (see `.github/workflows/site.yml` in the repo root).

## Structure

- `src/pages/index.astro` — the landing page (hero, downloads, features).
- `src/config/site.js` — site identity and links.
- `src/config/themes.js` — theme settings (`minimal-mono` default, light/dark only).
- `src/content/` — content collections (placeholder for future docs).
