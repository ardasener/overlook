## Why

Terminal programs (starship, lazygit, btop, nvim plugins) rely on Nerd Font glyphs — powerline arrows, devicons, octicons — in the Private Use Area. The current `@fontsource` terminal fonts have no PUA coverage, so glyphs render as tofu. Bundling Nerd Fonts gives every user glyph support regardless of host OS, with no runtime font installation.

## What Changes

- Replace `@fontsource/fira-code`, `@fontsource/jetbrains-mono`, `@fontsource/ibm-plex-mono` terminal fonts with 8 bundled Nerd Fonts (Mono variants, woff2, ~16–18 MB):
  - FiraCode, JetBrainsMono, BlexMono (IBM Plex Mono rename), SauceCodePro (Source Code Pro rename), GoMono, UbuntuMono, DejaVuSansMono, Terminess (Terminus).
- Add a cross-platform `fonts:fetch` pre-build script that downloads pinned (v3.5.0) TTF files from the Nerd Fonts GitHub repo, verifies SHA256 checksums, converts to woff2 via Python `fontTools`, and generates `@font-face` CSS.
- Settings → Terminal font gains 5 new options (Blex Mono, Sauce Code Pro, Go Mono, Ubuntu Mono, DejaVu Sans Mono, Terminess); display names use the Nerd Fonts names. Weights per family: Regular (400) + SemiBold (600) where available, otherwise Regular + Bold (700).
- **BREAKING**: UI-facing font names change (`Blex Mono` replaces `IBM Plex Mono`; existing saved `termFont` values for the 3 unchanged families (`fira-code`, `jetbrains-mono`, `ibm-plex-mono`) keep working since ids are preserved).
- Build tooling now requires Python 3 + `fontTools` (with brotli) in a gitignored venv; documented in README.

## Capabilities

### New Capabilities
- `terminal-fonts`: bundled Nerd Fonts for terminal rendering — families, weights, glyph coverage, fetch/verify/convert pipeline, and how fonts reach the webview.

### Modified Capabilities
- `appearance-settings`: terminal font selection options change from 3 @fontsource families to 8 bundled Nerd Fonts (new options: BlexMono, SauceCodePro, GoMono, UbuntuMono, DejaVuSansMono, Terminess; display names switch to Nerd Fonts names).
- `release-pipeline`: CI release workflow must install Python + fontTools in a gitignored venv before building.

## Impact

- **Frontend**: `src/fonts.ts` (drop 9 @fontsource terminal imports, import generated CSS), `src/themes/xterm.ts` (TERM_FONT_STACKS ×8), `src/settings/SettingsContext.tsx` (TERM_FONT_OPTIONS ×8).
- **Build**: `package.json` scripts (`dev`/`build` chain `fonts:fetch`), new `scripts/fetch-nerd-fonts.ts`, `.gitignore` (`src/assets/nerd-fonts/`, venv dir), new `@fontsource` terminal deps removed from `package.json`.
- **CI**: `.github/workflows/release.yml` gains a Python venv setup step.
- **Docs**: README documents the Python requirement and how to bump the Nerd Fonts version.
- **Not affected**: Rust backend, IPC boundary, xterm rendering path (only font strings change).
